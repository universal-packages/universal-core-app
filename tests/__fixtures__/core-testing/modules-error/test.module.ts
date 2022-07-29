import CoreModule from '../../../../src/CoreModule'

export default class TestModule extends CoreModule {
  public static readonly moduleName = 'test'
  public static readonly description = 'This is a local test module'

  public async prepare(): Promise<void> {
    throw 'Error'
  }

  public async release(): Promise<void> {}
}
