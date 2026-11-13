import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'peertube',
  title: 'PeerTube',
  license: 'AGPL-3.0',
  packageRepo: 'https://github.com/Start9Labs/peertube-startos',
  upstreamRepo: 'https://github.com/Chocobozzz/PeerTube',
  marketingUrl: 'https://joinpeertube.org',
  donationUrl: 'https://support.joinpeertube.org',
  description: { short, long },
  volumes: ['startos', 'peertube', 'db', 'valkey'],
  images: {
    peertube: {
      source: { dockerTag: 'chocobozzz/peertube:v8.3.2' },
      arch: ['x86_64', 'aarch64'],
    },
    postgres: {
      source: { dockerTag: 'postgres:17-alpine' },
      arch: ['x86_64', 'aarch64'],
    },
    valkey: {
      source: { dockerTag: 'valkey/valkey:9-alpine' },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
