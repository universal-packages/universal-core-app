import Core from './Core'
import { CoreConfig } from './Core.types'
import repl from 'repl'
import { setCoreGlobal } from './common/setCoreGlobal'
import { loadAndSetCoreConfig } from './common/loadAndSetCoreConfig'
import { loadAndSetProjectConfig } from './common/loadAndSetProjectConfig'
import { loadAndSetEnvironments } from './common/loadAndSetEnvironments'
import { emitEnvironmentEvent } from './common/emitEnvironmentEvent'
import { loadAndSetCoreModules } from './common/loadAndSetCoreModules'
import { releaseCoreModules } from './common/releaseCoreModules'

export async function runConsole(coreConfigOverride?: CoreConfig): Promise<void> {
  setCoreGlobal()

  // Common functions return true if something went wrong and we should exit
  if (await loadAndSetCoreConfig(coreConfigOverride)) return process.exit(1)
  if (await loadAndSetProjectConfig()) return process.exit(1)
  if (await loadAndSetEnvironments('console')) return process.exit(1)

  // Avoid terminating without unlading properly
  process.addListener('SIGINT', (): void => {})
  process.addListener('SIGTERM', (): void => {})

  if (await emitEnvironmentEvent('beforeModulesLoad')) return process.exit(1)
  if (await loadAndSetCoreModules()) return process.exit(1)
  if (await emitEnvironmentEvent('afterModulesLoad')) return process.exit(1)

  try {
    await core.logger.await()

    // Common functions return true if something went wrong and we should exit
    if (await emitEnvironmentEvent('beforeConsoleRuns')) return process.exit(1)

    await core.logger.await()

    // We just start a repl server it even has its own termination CTRL+C
    const replServer = repl.start({ prompt: 'core > ' })
    replServer.setupHistory('./.console_history', (error: Error): void => {
      if (error) throw error
    })

    // Common functions return true if something went wrong and we should exit
    if (await emitEnvironmentEvent('afterConsoleRuns')) return process.exit(1)

    // We emit this so the Core knows the user basically sent those signals
    replServer.on('exit', async (): Promise<void> => {
      // Common functions return true if something went wrong and we should exit
      if (await emitEnvironmentEvent('afterConsoleStops')) return process.exit(1)

      if (await emitEnvironmentEvent('beforeModulesRelease')) return process.exit(1)
      if (await releaseCoreModules()) return process.exit(1)
      if (await emitEnvironmentEvent('afterModulesRelease')) return process.exit(1)
    })
  } catch (error) {
    core.logger.publish('ERROR', 'Console', 'There was an error while running the console', 'CORE', { error })

    try {
      await Core.releaseInternalModules(core.coreModules)
    } catch (err) {
      // We prioritize higher error
    }

    await core.logger.await()
    return process.exit(1)
  }
}
