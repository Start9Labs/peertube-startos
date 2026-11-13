import { i18n } from '../i18n'
import { primaryUrl } from '../primaryUrl'

export const primaryUrlTask = primaryUrl.setupTask('critical', {
  reason: i18n(
    'PeerTube cannot start without a primary URL. Choose the address it publishes its videos and identity under.',
  ),
})
