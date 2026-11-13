import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { hostId, uiInterfaceId } from '../utils'

/** Starts a fresh install on its `.local` address, so it runs before a domain exists; Set Primary URL moves it. */
export const seedPrimaryUrl = sdk.setupOnInit(async (effects, kind) => {
  if (kind !== 'install') return
  if (await storeJson.read((s) => s.primaryUrl).once()) return

  const local = await sdk.host
    .getOwn(effects, hostId, (host) =>
      host
        ? (Object.values(host.bindings)
            .flatMap((b) => Object.values(b.interfaces))
            .find((i) => i.id === uiInterfaceId)
            ?.addressInfo.nonLocal.format()
            .find((u) => new URL(u).hostname.endsWith('.local')) ?? null)
        : null,
    )
    .once()
  if (local) await storeJson.merge(effects, { primaryUrl: local })
})
