import Logger, { LogLevel } from '@universal-packages/logger'
import { ModuleRegistry } from '@universal-packages/module-loader'
import BaseApp from './BaseApp'
import BaseModule from './BaseModule'

export interface CoreAppConfig {
  appsDirectory: string
  configDirectory: string
  modulesDirectory: string
  tasksDirectory: string
  logger: {
    transportsDirectory?: string
    level: LogLevel
    logsDirectory?: string
    silence?: boolean
  }
}

export interface InternalModuleRegistry extends ModuleRegistry {
  camelCaseName: string
  paramCaseName: string
  pascalCaseName: string
}

export interface CoreCapsule {
  App: typeof BaseApp
  allConfig: Record<string, any>
  appConfig: Record<string, any>
  appInstance: BaseApp
  appParamCaseName: string
  appPascalCaseName: string
  args: Record<string, any>
  coreAppConfig: CoreAppConfig
  logger: Logger
  moduleRegistries: Record<string, InternalModuleRegistry>
  modules: Record<string, BaseModule>
  stopping: boolean
}
