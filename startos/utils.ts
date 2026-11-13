import { smtpShape, T, z } from '@start9labs/start-sdk'
import { storeJson } from './fileModels/store.json'
import { sdk } from './sdk'

export const uiPort = 9000
export const rtmpPort = 1935
export const rtmpsPort = 1936

export const hostId = 'main'
export const uiInterfaceId = 'ui'
export const rtmpInterfaceId = 'rtmp'

export const POSTGRES_MOUNTPOINT = '/var/lib/postgresql'
export const POSTGRES_PGDATA_SUBPATH = '/data'
export const POSTGRES_DB = 'peertube'
export const POSTGRES_USER = 'peertube'

/** Records the origin PeerTube's database was last written for, so a changed primary URL triggers `update-host`. */
const APPLIED_ORIGIN_PATH = '/data/.startos-origin'
const ENTRYPOINT = '/usr/local/bin/entrypoint.sh'

export function postgresSub(effects: T.Effects, name = 'postgres') {
  return sdk.SubContainer.of(
    effects,
    { imageId: 'postgres' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'db',
      subpath: null,
      mountpoint: POSTGRES_MOUNTPOINT,
      readonly: false,
    }),
    name,
  )
}

export function valkeySub(effects: T.Effects, name = 'valkey') {
  return sdk.SubContainer.of(
    effects,
    { imageId: 'valkey' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'valkey',
      subpath: null,
      mountpoint: '/data',
      readonly: false,
    }),
    name,
  )
}

export const peertubeMounts = sdk.Mounts.of()
  .mountVolume({
    volumeId: 'peertube',
    subpath: 'data',
    mountpoint: '/data',
    readonly: false,
  })
  .mountVolume({
    volumeId: 'peertube',
    subpath: 'config',
    mountpoint: '/config',
    readonly: false,
  })

export function postgresEnv(password: string) {
  return {
    POSTGRES_DB,
    POSTGRES_USER,
    POSTGRES_PASSWORD: password,
  }
}

export async function requireSecrets() {
  const store = await storeJson.read().once()
  if (!store?.postgresPassword || !store.peertubeSecret) {
    throw new Error('PeerTube secrets are missing from store.json')
  }
  return {
    postgresPassword: store.postgresPassword,
    peertubeSecret: store.peertubeSecret,
  }
}

/** Origin as PeerTube writes it into its federated URLs: scheme, host and port, defaults spelled out. */
export function toOrigin(url: string) {
  const u = new URL(url)
  const https = u.protocol === 'https:'
  const port = u.port || (https ? '443' : '80')
  return {
    hostname: u.hostname,
    port,
    https,
    origin: `${u.protocol}//${u.hostname}:${port}`,
  }
}

export async function getSmtpCredentials(
  effects: T.Effects,
  smtp: z.infer<typeof smtpShape> | null | undefined,
): Promise<T.SmtpValue | null> {
  if (!smtp || smtp.selection === 'disabled') return null

  if (smtp.selection === 'system') {
    const system = await sdk.getSystemSmtp(effects).const()
    if (!system) return null
    const { customFrom } = smtp.value
    return customFrom ? { ...system, from: customFrom } : system
  }

  const p = smtp.value.provider.value
  return {
    host: p.host,
    port: Number(p.security.value.port),
    from: p.from,
    username: p.username,
    password: p.password ?? null,
    security: p.security.selection,
  }
}

function smtpEnv(smtp: T.SmtpValue | null): Record<string, string> {
  if (!smtp) return {}
  return {
    PEERTUBE_SMTP_TRANSPORT: 'smtp',
    PEERTUBE_SMTP_HOSTNAME: smtp.host,
    PEERTUBE_SMTP_PORT: String(smtp.port),
    PEERTUBE_SMTP_USERNAME: smtp.username,
    PEERTUBE_SMTP_FROM: smtp.from,
    PEERTUBE_SMTP_TLS: String(smtp.security === 'tls'),
    PEERTUBE_SMTP_DISABLE_STARTTLS: 'false',
    ...(smtp.password ? { PEERTUBE_SMTP_PASSWORD: smtp.password } : {}),
  }
}

/**
 * Only what the package must own. A PEERTUBE_ variable overrides the matching
 * setting in PeerTube's own admin panel, so everything else is left there.
 */
export function peertubeEnv(args: {
  url: string
  secrets: { postgresPassword: string; peertubeSecret: string }
  smtp: T.SmtpValue | null
}): Record<string, string> {
  const { hostname, port, https } = toOrigin(args.url)
  return {
    PEERTUBE_LISTEN_HOSTNAME: '::',
    PEERTUBE_LISTEN_PORT: String(uiPort),
    PEERTUBE_WEBSERVER_HOSTNAME: hostname,
    PEERTUBE_WEBSERVER_PORT: port,
    PEERTUBE_WEBSERVER_HTTPS: String(https),
    PEERTUBE_SECRET: args.secrets.peertubeSecret,
    PEERTUBE_DB_HOSTNAME: '127.0.0.1',
    PEERTUBE_DB_PORT: '5432',
    PEERTUBE_DB_NAME: POSTGRES_DB,
    PEERTUBE_DB_SUFFIX: '',
    PEERTUBE_DB_USERNAME: POSTGRES_USER,
    PEERTUBE_DB_PASSWORD: args.secrets.postgresPassword,
    PEERTUBE_REDIS_HOSTNAME: '127.0.0.1',
    PEERTUBE_REDIS_PORT: '6379',
    PEERTUBE_LIVE_RTMP_PORT: String(rtmpPort),
    PEERTUBE_PEERTUBE_CHECK_LATEST_VERSION_ENABLED: 'false',
    ...smtpEnv(args.smtp),
  }
}

/** Run a PeerTube script the way the image runs its server: through the entrypoint, which drops to the `peertube` user. */
export function peertubeScript(script: string, ...args: string[]) {
  return [ENTRYPOINT, 'node', `dist/scripts/${script}.js`, ...args]
}

/**
 * Rewrites the local URLs in the database when the origin changed since the
 * last start. Absent marker means a database not yet created, which PeerTube
 * then builds for the current origin.
 */
export function applyOriginCommand(origin: string): [string, ...string[]] {
  return [
    'sh',
    '-c',
    [
      `want='${origin}'`,
      `if [ -f ${APPLIED_ORIGIN_PATH} ] && [ "$(cat ${APPLIED_ORIGIN_PATH})" != "$want" ]; then ${peertubeScript('update-host').join(' ')} || exit 1; fi`,
      `printf %s "$want" > ${APPLIED_ORIGIN_PATH}`,
    ].join('; '),
  ]
}
