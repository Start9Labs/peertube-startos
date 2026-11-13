import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { primaryUrl } from './primaryUrl'
import { sdk } from './sdk'
import {
  applyOriginCommand,
  getSmtpCredentials,
  peertubeEnv,
  peertubeMounts,
  postgresEnv,
  postgresSub,
  POSTGRES_USER,
  requireSecrets,
  toOrigin,
  uiPort,
  valkeySub,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting PeerTube'))

  // Narrow reads only: the root password action writes the store, and must not restart PeerTube.
  const smtpSelection = await storeJson.read((s) => s.smtp).const(effects)
  const url = await primaryUrl.bestUsable(effects).const()
  if (!url) {
    throw new Error(
      'PeerTube has no primary URL. Run the Set Primary URL action.',
    )
  }

  const secrets = await requireSecrets()
  const rootPassword = await storeJson.read((s) => s.rootPassword).once()
  const smtp = await getSmtpCredentials(effects, smtpSelection)
  const env = peertubeEnv({ url, secrets, smtp })

  const pg = postgresSub(effects)
  const valkey = valkeySub(effects)
  const app = sdk.SubContainer.of(
    effects,
    { imageId: 'peertube' },
    peertubeMounts,
    'peertube',
  )

  return sdk.Daemons.of(effects)
    .addDaemon('postgres', {
      subcontainer: pg,
      exec: {
        command: sdk.useEntrypoint(['-c', 'listen_addresses=127.0.0.1']),
        env: postgresEnv(secrets.postgresPassword),
      },
      ready: {
        display: null,
        fn: async () => {
          const { exitCode } = await pg.exec([
            'pg_isready',
            '-h',
            '127.0.0.1',
            '-U',
            POSTGRES_USER,
          ])
          return exitCode === 0
            ? { result: 'success', message: null }
            : { result: 'starting', message: null }
        },
      },
      requires: [],
    })
    .addDaemon('valkey', {
      subcontainer: valkey,
      exec: {
        command: sdk.useEntrypoint([
          'valkey-server',
          '--bind',
          '127.0.0.1',
          '--appendonly',
          'yes',
        ]),
      },
      ready: {
        display: null,
        fn: async () => {
          const res = await valkey.exec(['valkey-cli', 'ping'])
          return res.stdout.toString().trim() === 'PONG'
            ? { result: 'success', message: null }
            : { result: 'starting', message: null }
        },
      },
      requires: [],
    })
    .addOneshot('apply-origin', {
      subcontainer: app,
      exec: {
        command: applyOriginCommand(toOrigin(url).origin),
        env,
        cwd: '/app',
        user: 'root',
      },
      requires: ['postgres', 'valkey'],
    })
    .addDaemon('peertube', {
      subcontainer: app,
      exec: {
        command: sdk.useEntrypoint(),
        cwd: '/app',
        env: {
          ...env,
          // Read only while the database holds no users.
          ...(rootPassword ? { PT_INITIAL_ROOT_PASSWORD: rootPassword } : {}),
        },
      },
      ready: {
        display: i18n('Web Interface'),
        gracePeriod: 300_000,
        fn: () =>
          sdk.healthCheck.checkWebUrl(
            effects,
            `http://127.0.0.1:${uiPort}/api/v1/ping`,
            {
              successMessage: i18n('The web interface is ready'),
              errorMessage: i18n('The web interface is not ready'),
            },
          ),
      },
      requires: ['apply-origin'],
    })
    .addHealthCheck('email', {
      ready: {
        display: i18n('Email'),
        fn: async () =>
          smtp
            ? { result: 'success', message: i18n('Email is configured') }
            : {
                result: 'disabled',
                message: i18n(
                  'Without email, sign-up verification, password resets and notifications are off. Use the Configure SMTP action to enable it.',
                ),
              },
      },
      requires: ['peertube'],
    })
})
