import { FileHelper, smtpShape, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const shape = z.looseObject({
  postgresPassword: z.string().optional().catch(undefined),
  // Signs sessions and federation keys; regenerating it signs every user out.
  peertubeSecret: z.string().optional().catch(undefined),
  primaryUrl: z.string().optional().catch(undefined),
  rootPassword: z.string().optional().catch(undefined),
  smtp: smtpShape,
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: './store.json' },
  shape,
)
