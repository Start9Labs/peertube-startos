import { actions } from '../actions'
import { restoreInit } from '../backups'
import { dependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { sdk } from '../sdk'
import { versionGraph } from '../versions'
import { primaryUrlTask } from './primaryUrlTask'
import { seedPrimaryUrl } from './seedPrimaryUrl'
import { seedStore } from './seedStore'
import { watchRootPassword } from './watchRootPassword'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  setInterfaces,
  actions,
  dependencies,
  seedStore,
  seedPrimaryUrl,
  primaryUrlTask,
  watchRootPassword,
)

export const uninit = sdk.setupUninit(versionGraph)
