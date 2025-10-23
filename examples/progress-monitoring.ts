/**
 * 部署进度监控示例
 */

import { createEnhancedDeployer, DeploymentPhase } from '@ldesign/deployer'

async function main() {
  const deployer = createEnhancedDeployer()
  const progressTracker = deployer.getProgressTracker()

  // 实时进度监控
  progressTracker.on((event) => {
    const phaseNames: Record<DeploymentPhase, string> = {
      [DeploymentPhase.INIT]: '初始化',
      [DeploymentPhase.PRE_CHECK]: '前置检查',
      [DeploymentPhase.VALIDATE]: '配置验证',
      [DeploymentPhase.PRE_HOOKS]: '前置钩子',
      [DeploymentPhase.BUILD]: '构建镜像',
      [DeploymentPhase.PUSH]: '推送镜像',
      [DeploymentPhase.DEPLOY]: '执行部署',
      [DeploymentPhase.HEALTH_CHECK]: '健康检查',
      [DeploymentPhase.POST_HOOKS]: '后置钩子',
      [DeploymentPhase.COMPLETE]: '部署完成',
      [DeploymentPhase.FAILED]: '部署失败',
    }

    console.log('\n' + '='.repeat(60))
    console.log(`阶段: ${phaseNames[event.phase]}`)
    console.log(`进度: ${event.progress}%`)
    console.log(`消息: ${event.message}`)
    console.log(`时间: ${event.timestamp}`)
    console.log('='.repeat(60))

    // 绘制进度条
    const barLength = 40
    const filled = Math.round((event.progress / 100) * barLength)
    const empty = barLength - filled
    const bar = '█'.repeat(filled) + '░'.repeat(empty)
    
    console.log(`\n${bar} ${event.progress}%\n`)
  })

  // 执行部署
  try {
    const result = await deployer.deploy({
      environment: 'production',
      enableProgress: true,
    })

    console.log('\n✅ 部署成功！')
    console.log('版本:', result.version)
    console.log('环境:', result.environment)
    console.log('时间:', result.timestamp)
  } catch (error: any) {
    console.error('\n❌ 部署失败:', error.message)
    
    // 获取当前状态
    const status = progressTracker.getStatus()
    console.log('失败阶段:', status.phase)
    console.log('已完成:', status.progress + '%')
    console.log('耗时:', (status.elapsed / 1000).toFixed(1) + 's')
    
    process.exit(1)
  }
}

main().catch(console.error)



