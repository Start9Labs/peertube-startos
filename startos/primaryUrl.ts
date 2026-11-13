import { T } from '@start9labs/start-sdk'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  hostId,
  POSTGRES_DB,
  POSTGRES_USER,
  requireSecrets,
  toOrigin,
  uiInterfaceId,
} from './utils'

const FOLLOWING_SQL = `SELECT count(*) FROM "actorFollow" f JOIN "actor" a ON a.id = f."actorId" WHERE a."preferredUsername" = 'peertube' AND a."serverId" IS NULL AND f.state = 'accepted'`

export const primaryUrl = sdk.setupPrimaryUrl({
  id: 'set-primary-url',
  hostId,
  interfaceId: uiInterfaceId,
  fallback: false,
  metadata: {
    name: i18n('Set Primary URL'),
    description: i18n(
      'Choose the address PeerTube treats as its own. Every channel, video and federated identity is published under it, so pick the address people and other instances will use — a public domain for federation. PeerTube rewrites its local links and restarts to apply a change.',
    ),
    warning: i18n(
      'Other instances keep following the old address. PeerTube refuses the change while this instance follows other servers.',
    ),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },
  field: { name: i18n('URL'), description: null },
  get: storeJson.read((s) => s.primaryUrl),
  set: async (effects, url) => {
    const current = await storeJson.read((s) => s.primaryUrl).once()
    if (current && toOrigin(current).origin !== toOrigin(url).origin) {
      await assertNotFollowing(effects)
    }
    await storeJson.merge(effects, { primaryUrl: url })
  },
})

/** `update-host` aborts on an instance with follows, which stops PeerTube starting; refuse here while PostgreSQL is reachable. */
async function assertNotFollowing(effects: T.Effects) {
  const { postgresPassword } = await requireSecrets()
  const { exitCode, stdout } = await sdk.SubContainer.withTemp(
    effects,
    { imageId: 'postgres' },
    null,
    'check-following',
    (sub) =>
      sub.exec(
        [
          'psql',
          '-h',
          '127.0.0.1',
          '-U',
          POSTGRES_USER,
          '-d',
          POSTGRES_DB,
          '-tAc',
          FOLLOWING_SQL,
        ],
        { env: { PGPASSWORD: postgresPassword } },
      ),
  )
  if (exitCode !== 0) return
  if (Number(stdout.toString().trim()) > 0) {
    throw new Error(
      i18n(
        'This instance follows other servers, and PeerTube cannot move an instance with follows to a new address. Remove them under Administration → Settings → Federation, then set the URL again.',
      ),
    )
  }
}
