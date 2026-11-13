import { i18n } from './i18n'
import { primaryUrl } from './primaryUrl'
import { sdk } from './sdk'
import {
  hostId,
  rtmpInterfaceId,
  rtmpPort,
  rtmpsPort,
  uiInterfaceId,
  uiPort,
} from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const host = sdk.MultiHost.of(effects, hostId)

  const uiOrigin = await host.bindPort(uiPort, { protocol: 'http' })
  const ui = sdk.createInterface(effects, {
    name: i18n('Web Interface'),
    id: uiInterfaceId,
    description: i18n(
      'Watch, upload and manage videos, and administer the instance',
    ),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
    preferredLauncherAddress: await primaryUrl.bestUsable(effects).const(),
  })

  // The stream key travels in the RTMP URL, so off the box only the RTMPS
  // port StartOS terminates is offered.
  const rtmpOrigin = await host.bindPort(rtmpPort, {
    protocol: null,
    preferredExternalPort: rtmpPort,
    secure: null,
    addSsl: { preferredExternalPort: rtmpsPort, alpn: null },
  })
  const rtmp = sdk.createInterface(effects, {
    name: i18n('Stream Ingest'),
    id: rtmpInterfaceId,
    description: i18n(
      'The RTMPS server address to enter in OBS or other broadcasting software for a live stream',
    ),
    type: 'api',
    masked: false,
    schemeOverride: { ssl: 'rtmps', noSsl: 'rtmp' },
    username: null,
    path: '/live',
    query: {},
  })

  return [await uiOrigin.export([ui]), await rtmpOrigin.export([rtmp])]
})
