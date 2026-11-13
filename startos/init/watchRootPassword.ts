import { setRootPassword } from '../actions/setRootPassword'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const watchRootPassword = sdk.setupOnInit(async (effects) => {
  if (await storeJson.read((s) => s.rootPassword).const(effects)) return

  await sdk.action.createOwnTask(effects, setRootPassword, 'critical', {
    reason: i18n(
      'Set the root password before PeerTube first starts, so the administrator account is yours.',
    ),
  })
})
