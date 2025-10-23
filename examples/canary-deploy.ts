/**
 * 金丝雀发布示例
 */

import { CanaryStrategy } from '@ldesign/deployer'

async function main() {
  const strategy = new CanaryStrategy()

  console.log('🐤 Starting Canary deployment...')

  const result = await strategy.deploy({
    baselineVersion: '1.0.0',
    canaryVersion: '1.1.0',
    steps: [
      // 第一步：10% 流量，持续 5 分钟
      {
        weight: 10,
        duration: 300,
      },
      // 第二步：30% 流量，持续 10 分钟
      {
        weight: 30,
        duration: 600,
      },
      // 第三步：50% 流量，持续 10 分钟
      {
        weight: 50,
        duration: 600,
      },
      // 第四步：100% 流量
      {
        weight: 100,
        duration: 0,
      },
    ],
    analysis: {
      interval: 60, // 每分钟分析一次
      threshold: {
        successRate: 99.5, // 成功率 > 99.5%
        errorRate: 0.5, // 错误率 < 0.5%
        latency: 1000, // 延迟 < 1000ms
      },
    },
    autoPromote: false, // 不自动提升，需要手动确认
    autoRollback: true, // 自动回滚
  })

  if (result.success) {
    console.log('✅ Canary deployment completed!')
  } else {
    console.error('❌ Deployment failed:', result.message)
  }
}

main().catch(console.error)




