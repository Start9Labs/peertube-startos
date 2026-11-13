import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { primaryUrl } from '../primaryUrl'
import { sdk } from '../sdk'
import {
  peertubeEnv,
  peertubeMounts,
  peertubeScript,
  requireSecrets,
} from '../utils'

export const setRootPassword = sdk.Action.withoutInput(
  'set-root-password',

  async ({ effects }) => {
    const isSet = !!(await storeJson.read((s) => s.rootPassword).const(effects))
    return {
      name: i18n('Set Root Password'),
      description: i18n(
        'Generate a new random password for the root administrator account. Replaces any existing password.',
      ),
      warning: isSet ? i18n('Replaces the current root password.') : null,
      // The first password is handed to PeerTube when it creates the account;
      // later ones go through its reset command, which needs the database up.
      allowedStatuses: isSet ? 'only-running' : 'any',
      group: null,
      visibility: 'enabled',
    }
  },

  async ({ effects }) => {
    const password = utils.getDefaultString({
      charset: 'a-z,A-Z,0-9',
      len: 24,
    })

    if (await storeJson.read((s) => s.rootPassword).once()) {
      const url = await primaryUrl.bestUsable(effects).once()
      if (!url) throw new Error('PeerTube has no primary URL')
      const env = peertubeEnv({
        url,
        secrets: await requireSecrets(),
        smtp: null,
      })
      const stdout = await sdk.SubContainer.withTemp(
        effects,
        { imageId: 'peertube' },
        peertubeMounts,
        'reset-root-password',
        (sub) =>
          sub
            .execFail(peertubeScript('reset-password', '-u', 'root'), {
              env,
              cwd: '/app',
              input: `${password}\n`,
              timeout: 120_000,
            })
            .then((r) => r.stdout.toString()),
      )
      if (!stdout.includes('User password updated')) {
        throw new Error(`PeerTube did not confirm the reset:\n${stdout}`)
      }
    }

    await storeJson.merge(effects, { rootPassword: password })

    return {
      version: '1',
      title: i18n('Root Credentials'),
      message: i18n('Sign in to the web interface with these credentials.'),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Username'),
            description: null,
            value: 'root',
            masked: false,
            copyable: true,
            qr: false,
            launchable: false,
          },
          {
            type: 'single',
            name: i18n('Password'),
            description: null,
            value: password,
            masked: true,
            copyable: true,
            qr: false,
            launchable: false,
          },
        ],
      },
    }
  },
)
