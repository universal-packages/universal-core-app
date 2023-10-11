import { Logger } from '@universal-packages/logger'
import EventEmitter from 'events'
import repl from 'repl'

import { EnvironmentEvent } from '../src'
import { runConsole } from '../src/runConsole'
import ControlEnvironment from './__fixtures__/environments-event-error/Control.environment'
import EventErrorEnvironment from './__fixtures__/environments-event-error/EventError.environment'
import ConsoleEnvironment from './__fixtures__/environments/Console.environment'
import NotProductionEnvironment from './__fixtures__/environments/NotProduction.environment'
import TestEnvironment from './__fixtures__/environments/Test.environment'
import UniversalEnvironment from './__fixtures__/environments/Universal.environment'
import ConsoleModule from './__fixtures__/modules/Console.module'
import ExcellentModule from './__fixtures__/modules/Excellent.module'
import GoodModule from './__fixtures__/modules/Good.module'
import NotProductionModule from './__fixtures__/modules/NotProduction.module'
import TestModule from './__fixtures__/modules/Test.module'

class ReplServerMock extends EventEmitter {
  public setupHistory = jest.fn()
}

const replServerMock = new ReplServerMock()

beforeEach((): void => {
  jest.spyOn(repl, 'start').mockImplementation(((): ReplServerMock => replServerMock) as any)
  jest.spyOn(process, 'exit').mockImplementation(((): void => {}) as any)

  ConsoleEnvironment.calls = []
  TestEnvironment.calls = []
  UniversalEnvironment.calls = []
  ControlEnvironment.calls = []
  jest.clearAllMocks()
  process.removeAllListeners()
})

describe(runConsole, (): void => {
  it('do all the preparations and runs a repl server (sets core)', async (): Promise<void> => {
    await runConsole({
      apps: { location: './tests/__fixtures__/apps' },
      config: { location: './tests/__fixtures__/config' },
      environments: { location: './tests/__fixtures__/environments' },
      tasks: { location: './tests/__fixtures__/tasks' },
      modules: { location: './tests/__fixtures__/modules' }
    })

    expect(core).toEqual({
      App: null,
      appConfig: null,
      appInstance: null,
      coreConfig: expect.objectContaining({ modules: { asGlobals: true, location: './tests/__fixtures__/modules' } }),
      coreModules: {
        consoleModule: expect.any(ConsoleModule),
        excellentModule: expect.any(ExcellentModule),
        goodModule: expect.any(GoodModule),
        notProductionModule: expect.any(NotProductionModule),
        testModule: expect.any(TestModule)
      },
      environments: [expect.any(ConsoleEnvironment), expect.any(NotProductionEnvironment), expect.any(TestEnvironment), expect.any(UniversalEnvironment)],
      logger: expect.any(Logger),
      projectConfig: expect.objectContaining({ ExcellentModule: expect.anything(), 'good-module': expect.anything(), 'good-app': expect.anything() }),
      stoppable: false,
      stopping: false,
      Task: null,
      taskInstance: null
    })
    expect(ConsoleEnvironment.calls).toEqual(['beforeModulesLoad', 'afterModulesLoad', 'beforeConsoleRuns', 'afterConsoleRuns'])
    expect(TestEnvironment.calls).toEqual(['beforeModulesLoad', 'afterModulesLoad', 'beforeConsoleRuns', 'afterConsoleRuns'])
    expect(UniversalEnvironment.calls).toEqual(['beforeModulesLoad', 'afterModulesLoad', 'beforeConsoleRuns', 'afterConsoleRuns'])
    expect(NotProductionEnvironment.calls).toEqual(['beforeModulesLoad', 'afterModulesLoad', 'beforeConsoleRuns', 'afterConsoleRuns'])
  })

  it('exits if core config has errors', async (): Promise<void> => {
    await runConsole({
      apps: { location: './tests/__fixtures__/noexistent' },
      config: { location: './tests/__fixtures__/config' },
      environments: { location: './tests/__fixtures__/environments' },
      tasks: { location: './tests/__fixtures__/tasks' },
      modules: { location: './tests/__fixtures__/modules' }
    })

    expect(process.exit).toHaveBeenCalledWith(1)
    expect(ConsoleEnvironment.calls).toEqual([])
  })

  it('exits if project config has errors', async (): Promise<void> => {
    await runConsole({
      apps: { location: './tests/__fixtures__/apps' },
      config: { location: './tests/__fixtures__/config-errored' },
      environments: { location: './tests/__fixtures__/environments' },
      tasks: { location: './tests/__fixtures__/tasks' },
      modules: { location: './tests/__fixtures__/modules' }
    })

    expect(process.exit).toHaveBeenCalledWith(1)
    expect(ConsoleEnvironment.calls).toEqual([])
  })

  it('exits if environments load fails', async (): Promise<void> => {
    await runConsole({
      apps: { location: './tests/__fixtures__/apps' },
      config: { location: './tests/__fixtures__/config' },
      environments: { location: './tests/__fixtures__/environments-load-error' },
      tasks: { location: './tests/__fixtures__/tasks' },
      modules: { location: './tests/__fixtures__/modules' }
    })

    expect(process.exit).toHaveBeenCalledWith(1)
    expect(ConsoleEnvironment.calls).toEqual([])
  })

  it('exits if modules has errors', async (): Promise<void> => {
    await runConsole({
      apps: { location: './tests/__fixtures__/apps' },
      config: { location: './tests/__fixtures__/config' },
      environments: { location: './tests/__fixtures__/environments' },
      tasks: { location: './tests/__fixtures__/tasks' },
      modules: { location: './tests/__fixtures__/modules-load-error' }
    })

    expect(process.exit).toHaveBeenCalledWith(1)
    expect(ConsoleEnvironment.calls).toEqual(['beforeModulesLoad'])
  })

  it('continues if modules warnings are present (log the warnings)', async (): Promise<void> => {
    await runConsole({
      apps: { location: './tests/__fixtures__/apps' },
      config: { location: './tests/__fixtures__/config' },
      environments: { location: './tests/__fixtures__/environments' },
      tasks: { location: './tests/__fixtures__/tasks' },
      modules: { location: './tests/__fixtures__/modules-warnings' }
    })

    expect(ConsoleEnvironment.calls).toEqual(['beforeModulesLoad', 'afterModulesLoad', 'beforeConsoleRuns', 'afterConsoleRuns'])
  })

  it('exits if repl server starting fails (unload modules)', async (): Promise<void> => {
    jest.spyOn(repl, 'start').mockImplementation((): never => {
      throw 'Error'
    })

    await runConsole({
      apps: { location: './tests/__fixtures__/apps' },
      config: { location: './tests/__fixtures__/config' },
      environments: { location: './tests/__fixtures__/environments' },
      tasks: { location: './tests/__fixtures__/tasks' },
      modules: { location: './tests/__fixtures__/modules' }
    })

    expect(process.exit).toHaveBeenCalledWith(1)
    expect(core.coreModules).toEqual({})
    expect(ConsoleEnvironment.calls).toEqual(['beforeModulesLoad', 'afterModulesLoad', 'beforeConsoleRuns'])
  })

  it('unload modules when repl server exists', async (): Promise<void> => {
    await runConsole({
      apps: { location: './tests/__fixtures__/apps' },
      config: { location: './tests/__fixtures__/config' },
      environments: { location: './tests/__fixtures__/environments' },
      tasks: { location: './tests/__fixtures__/tasks' },
      modules: { location: './tests/__fixtures__/modules' }
    })

    await replServerMock.listeners('exit')[0]()

    expect(core.coreModules).toEqual({})
    expect(ConsoleEnvironment.calls).toEqual([
      'beforeModulesLoad',
      'afterModulesLoad',
      'beforeConsoleRuns',
      'afterConsoleRuns',
      'afterConsoleStops',
      'beforeModulesRelease',
      'afterModulesRelease'
    ])
  })

  it('exists if module releasing fails', async (): Promise<void> => {
    await runConsole({
      apps: { location: './tests/__fixtures__/apps' },
      config: { location: './tests/__fixtures__/config' },
      environments: { location: './tests/__fixtures__/environments' },
      tasks: { location: './tests/__fixtures__/tasks' },
      modules: { location: './tests/__fixtures__/modules-release-error' }
    })

    await replServerMock.listeners('exit')[0]()

    expect(process.exit).toHaveBeenCalledWith(1)
    expect(core.coreModules).toEqual({})
    expect(ConsoleEnvironment.calls).toEqual(['beforeModulesLoad', 'afterModulesLoad', 'beforeConsoleRuns', 'afterConsoleRuns', 'afterConsoleStops', 'beforeModulesRelease'])
  })

  it('exits if environments events fails', async (): Promise<void> => {
    const baseEvents: EnvironmentEvent[] = ['beforeModulesLoad', 'afterModulesLoad', 'beforeConsoleRuns', 'afterConsoleRuns']
    const stopEvents: EnvironmentEvent[] = ['afterConsoleStops', 'beforeModulesRelease', 'afterModulesRelease']

    for (let i = 0; i < baseEvents.length; i++) {
      const currentEvent = baseEvents[i]

      ControlEnvironment.calls = []
      EventErrorEnvironment.toError = currentEvent

      await runConsole({
        apps: { location: './tests/__fixtures__/apps' },
        config: { location: './tests/__fixtures__/config' },
        environments: { location: './tests/__fixtures__/environments-event-error' },
        tasks: { location: './tests/__fixtures__/tasks' },
        modules: { location: './tests/__fixtures__/modules' }
      })

      expect(ControlEnvironment.calls).toEqual(baseEvents.slice(0, i + 1))
    }

    for (let i = 0; i < stopEvents.length; i++) {
      const currentEvent = stopEvents[i]

      ControlEnvironment.calls = []
      EventErrorEnvironment.toError = currentEvent

      await runConsole({
        apps: { location: './tests/__fixtures__/apps' },
        config: { location: './tests/__fixtures__/config' },
        environments: { location: './tests/__fixtures__/environments-event-error' },
        tasks: { location: './tests/__fixtures__/tasks' },
        modules: { location: './tests/__fixtures__/modules' }
      })

      await replServerMock.listeners('exit')[0]()

      expect(ControlEnvironment.calls).toEqual([...baseEvents, ...stopEvents.slice(0, i + 1)])
    }
  })
})
