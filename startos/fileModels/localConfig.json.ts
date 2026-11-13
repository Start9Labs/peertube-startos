import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

/** PeerTube's own admin-panel settings file; the package only seeds it. */
export const localConfigJson = FileHelper.json(
  { base: sdk.volumes.peertube, subpath: './config/local-production.json' },
  z.looseObject({
    admin: z
      .looseObject({ email: z.string().optional().catch(undefined) })
      .optional()
      .catch(undefined),
  }),
)
