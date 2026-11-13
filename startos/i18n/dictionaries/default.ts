export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting PeerTube': 0,
  'Web Interface': 1,
  'The web interface is ready': 2,
  'The web interface is not ready': 3,
  Email: 4,
  'Email is configured': 5,
  'Without email, sign-up verification, password resets and notifications are off. Use the Configure SMTP action to enable it.': 6,

  // interfaces.ts
  'Watch, upload and manage videos, and administer the instance': 7,
  'Stream Ingest': 8,
  'The RTMPS server address to enter in OBS or other broadcasting software for a live stream': 9,

  // primaryUrl.ts
  'Set Primary URL': 10,
  'Choose the address PeerTube treats as its own. Every channel, video and federated identity is published under it, so pick the address people and other instances will use — a public domain for federation. PeerTube rewrites its local links and restarts to apply a change.': 11,
  'Other instances keep following the old address. PeerTube refuses the change while this instance follows other servers.': 12,
  URL: 13,
  'This instance follows other servers, and PeerTube cannot move an instance with follows to a new address. Remove them under Administration → Settings → Federation, then set the URL again.': 14,

  // actions/setRootPassword.ts
  'Set Root Password': 15,
  'Generate a new random password for the root administrator account. Replaces any existing password.': 16,
  'Replaces the current root password.': 17,
  'Root Credentials': 18,
  'Sign in to the web interface with these credentials.': 19,
  Username: 20,
  Password: 21,

  // actions/configureSmtp.ts
  'Configure SMTP': 22,
  'Give PeerTube an outbound mail server for sign-up verification, password resets and notifications. PeerTube restarts to apply the change.': 23,

  // init/
  'PeerTube cannot start without a primary URL. Choose the address it publishes its videos and identity under.': 24,
  'Set the root password before PeerTube first starts, so the administrator account is yours.': 25,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
