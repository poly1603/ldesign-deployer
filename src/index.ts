/**
 * @ldesign/deployer - 部署工具
 */
export class Deployer {
  async deploy(env: string) { console.info(`Deploying to ${env}...`) }
  async rollback(version: string) { console.info(`Rolling back to ${version}...`) }
}
export function createDeployer() { return new Deployer() }



