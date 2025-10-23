/**
 * 自动回滚示例
 */

import { AutoRollback } from '@ldesign/deployer'

async function main() {
  const autoRollback = new AutoRollback()

  console.log('🤖 Starting auto-rollback monitoring...')

  // 启动自动回滚监控
  const stop = await autoRollback.start(
    // 健康检查配置
    {
      enabled: true,
      path: '/health',
      port: 3000,
      interval: 30, // 每 30 秒检查一次
      timeout: 5,
      retries: 3,
    },
    // 自动回滚配置
    {
      enabled: true,
      errorThreshold: 3, // 连续失败 3 次触发回滚
      checkInterval: 30, // 每 30 秒检查一次
      onRollback: () => {
        console.log('⚠️  Auto-rollback triggered!')
        // 发送通知、记录日志等
      },
    }
  )

  console.log('✅ Auto-rollback monitoring started')
  console.log('Press Ctrl+C to stop...')

  // 处理退出信号
  process.on('SIGINT', () => {
    console.log('\n⏹️  Stopping auto-rollback monitoring...')
    stop()
    process.exit(0)
  })
}

main().catch(console.error)




