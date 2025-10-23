/**
 * 审计日志查询示例
 */

import { AuditLogger } from '@ldesign/deployer'

async function main() {
  const auditLogger = new AuditLogger()

  console.log('📊 Audit Log Analysis\n')

  // 1. 获取统计信息
  const stats = await auditLogger.getStats()
  
  console.log('总体统计:')
  console.log('  总记录数:', stats.total)
  console.log('  按操作分布:', stats.byAction)
  console.log('  按结果分布:', stats.byResult)
  console.log('  按环境分布:', stats.byEnvironment)

  // 2. 查询最近的部署
  console.log('\n最近的部署:')
  const recentDeploys = await auditLogger.query({
    action: 'deployment.success',
  })
  
  recentDeploys.slice(0, 5).forEach((log) => {
    console.log(`  ✅ ${log.resource} -> ${log.environment} (${log.duration}ms)`)
  })

  // 3. 查询失败的部署
  console.log('\n失败的部署:')
  const failedDeploys = await auditLogger.query({
    result: 'failure',
  })
  
  failedDeploys.slice(0, 5).forEach((log) => {
    console.log(`  ❌ ${log.resource} -> ${log.environment}`)
    console.log(`     错误: ${log.details?.error}`)
  })

  // 4. 查询特定环境的部署
  console.log('\n生产环境部署:')
  const prodDeploys = await auditLogger.query({
    environment: 'production',
  })
  
  console.log(`  总计: ${prodDeploys.length} 次`)
  console.log(`  成功: ${prodDeploys.filter(d => d.result === 'success').length} 次`)
  console.log(`  失败: ${prodDeploys.filter(d => d.result === 'failure').length} 次`)

  // 5. 查询特定日期范围
  const lastWeek = new Date()
  lastWeek.setDate(lastWeek.getDate() - 7)
  
  console.log('\n最近一周的部署:')
  const weekDeploys = await auditLogger.query({
    startDate: lastWeek,
  })
  
  console.log(`  总计: ${weekDeploys.length} 次部署`)

  // 6. 清理旧日志（可选）
  console.log('\n清理 90 天前的日志...')
  await auditLogger.cleanup(90)
  console.log('✅ 清理完成')
}

main().catch(console.error)



