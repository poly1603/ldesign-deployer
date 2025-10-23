/**
 * 蓝绿部署示例
 */

import { BlueGreenStrategy } from '@ldesign/deployer'

async function main() {
  const strategy = new BlueGreenStrategy()

  console.log('🔵🟢 Starting Blue-Green deployment...')

  const result = await strategy.deploy({
    blueVersion: '1.0.0',
    greenVersion: '1.1.0',
    activeColor: 'blue',
    trafficSwitch: {
      immediate: false,
      manual: true, // 需要手动确认切换流量
    },
    rollbackOnError: true,
    healthCheckTimeout: 300, // 5 分钟
    previewMode: true,
  })

  if (result.success) {
    console.log('✅ Blue-Green deployment completed!')
    console.log('Green version is ready for traffic switch')
  } else {
    console.error('❌ Deployment failed:', result.message)
  }
}

main().catch(console.error)




