/**
 * 增强版部署器示例
 */

import { createEnhancedDeployer } from '@ldesign/deployer'

async function main() {
  // 创建增强版部署器
  const deployer = createEnhancedDeployer()

  // 监听部署进度
  deployer.onProgress((event) => {
    console.log(`[${event.progress}%] ${event.phase}: ${event.message}`)
  })

  // 执行部署（带所有增强功能）
  const result = await deployer.deploy({
    environment: 'production',
    configFile: 'deploy.config.json',
    
    // 增强选项
    skipPreCheck: false,        // 启用部署前检查
    deploymentTimeout: 600000,  // 10分钟超时
    retryOnFailure: true,       // 失败自动重试
    enableAudit: true,          // 启用审计日志
    enableProgress: true,       // 启用进度追踪
  })

  if (result.success) {
    console.log('✅ Deployment successful!')
    
    // 查看审计日志统计
    const auditLogger = deployer.getAuditLogger()
    const stats = await auditLogger.getStats()
    
    console.log('\n📊 Deployment Statistics:')
    console.log('Total deployments:', stats.total)
    console.log('By result:', stats.byResult)
    console.log('By environment:', stats.byEnvironment)
  } else {
    console.error('❌ Deployment failed:', result.message)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})



