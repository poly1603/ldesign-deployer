/**
 * 简单部署示例
 */

import { createDeployer } from '@ldesign/deployer'

async function main() {
  const deployer = createDeployer()

  // 部署到开发环境
  const result = await deployer.deploy({
    environment: 'development',
    configFile: 'deploy.config.json',
  })

  console.log('Deployment result:', result)

  if (result.success) {
    console.log('✅ Deployment successful!')
  } else {
    console.error('❌ Deployment failed:', result.message)
    process.exit(1)
  }
}

main().catch(console.error)




