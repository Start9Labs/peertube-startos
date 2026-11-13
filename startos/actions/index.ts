import { primaryUrl } from '../primaryUrl'
import { sdk } from '../sdk'
import { configureSmtp } from './configureSmtp'
import { setRootPassword } from './setRootPassword'

export const actions = sdk.Actions.of()
  .addAction(setRootPassword)
  .addAction(primaryUrl.action)
  .addAction(configureSmtp)
