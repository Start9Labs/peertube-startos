import { utils } from '@start9labs/start-sdk'
import { localConfigJson } from '../fileModels/localConfig.json'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

export const seedStore = sdk.setupOnInit(async (effects, kind) => {
  if (kind !== 'install') {
    await storeJson.merge(effects, {})
    return
  }

  await storeJson.merge(effects, {
    postgresPassword: utils.getDefaultString({
      charset: 'a-z,A-Z,0-9',
      len: 24,
    }),
    peertubeSecret: utils.getDefaultString({ charset: '0-9,a-f', len: 64 }),
  })
  // The image's config nulls upstream's default, and PeerTube cannot create root without one.
  await localConfigJson.merge(effects, {
    admin: { email: 'admin@example.com' },
  })
})
