/**
 * 部署指标分析器
 * @module metrics/MetricsAnalyzer
 * 
 * @description 分析部署指标，生成统计和趋势报告
 */

import type {
  DeploymentRecord,
  DeploymentStats,
  PeriodStats,
  EnvironmentStats,
  AppStats,
  DeploymentTrend,
  DeploymentHealth,
  HealthIssue,
} from './types.js'
import type { Environment } from '../types/index.js'

/**
 * 部署指标分析器
 * 
 * @example
 * ```typescript
 * const analyzer = new MetricsAnalyzer();
 * 
 * // 计算统计数据
 * const stats = analyzer.calculateStats(records);
 * console.log(`成功率: ${stats.successRate}%`);
 * 
 * // 分析部署健康度
 * const health = analyzer.analyzeHealth(records);
 * console.log(`健康评分: ${health.score}`);
 * ```
 */
export class MetricsAnalyzer {
  /**
   * 计算部署统计
   */
  calculateStats(records: DeploymentRecord[]): DeploymentStats {
    if (records.length === 0) {
      return {
        totalDeployments: 0,
        successfulDeployments: 0,
        failedDeployments: 0,
        successRate: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50Duration: 0,
        p90Duration: 0,
        p99Duration: 0,
      }
    }

    const successful = records.filter(r => r.success)
    const durations = records.map(r => r.duration).sort((a, b) => a - b)

    return {
      totalDeployments: records.length,
      successfulDeployments: successful.length,
      failedDeployments: records.length - successful.length,
      successRate: Math.round((successful.length / records.length) * 100),
      averageDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50Duration: this.percentile(durations, 50),
      p90Duration: this.percentile(durations, 90),
      p99Duration: this.percentile(durations, 99),
    }
  }

  /**
   * 按环境分组统计
   */
  statsByEnvironment(records: DeploymentRecord[]): EnvironmentStats[] {
    const grouped = this.groupBy(records, r => r.environment)

    return Object.entries(grouped).map(([environment, recs]) => ({
      ...this.calculateStats(recs),
      environment: environment as Environment,
    }))
  }

  /**
   * 按应用分组统计
   */
  statsByApp(records: DeploymentRecord[]): AppStats[] {
    const grouped = this.groupBy(records, r => r.appName)

    return Object.entries(grouped).map(([appName, recs]) => {
      const stats = this.calculateStats(recs)
      const sortedRecs = [...recs].sort((a, b) =>
        b.startTime.getTime() - a.startTime.getTime()
      )
      const lastSuccessful = sortedRecs.find(r => r.success)

      return {
        ...stats,
        appName,
        lastDeployment: sortedRecs[0]?.startTime,
        lastSuccessfulDeployment: lastSuccessful?.startTime,
      }
    })
  }

  /**
   * 按时间段统计
   */
  statsByPeriod(
    records: DeploymentRecord[],
    period: 'hour' | 'day' | 'week' | 'month'
  ): PeriodStats[] {
    const grouped = this.groupByPeriod(records, period)

    return Object.entries(grouped)
      .map(([key, recs]) => {
        const { start, end, label } = this.parsePeriodKey(key, period)
        return {
          ...this.calculateStats(recs),
          periodStart: start,
          periodEnd: end,
          periodLabel: label,
        }
      })
      .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime())
  }

  /**
   * 计算部署趋势
   */
  calculateTrend(
    records: DeploymentRecord[],
    period: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): DeploymentTrend {
    const periodStats = this.statsByPeriod(records, period)

    return {
      frequency: periodStats.map(s => ({
        timestamp: s.periodStart,
        value: s.totalDeployments,
        label: s.periodLabel,
      })),
      successRate: periodStats.map(s => ({
        timestamp: s.periodStart,
        value: s.successRate,
        label: s.periodLabel,
      })),
      averageDuration: periodStats.map(s => ({
        timestamp: s.periodStart,
        value: s.averageDuration,
        label: s.periodLabel,
      })),
    }
  }

  /**
   * 分析部署健康度
   */
  analyzeHealth(records: DeploymentRecord[]): DeploymentHealth {
    const issues: HealthIssue[] = []
    const recommendations: string[] = []
    let score = 100

    if (records.length === 0) {
      return {
        score: 0,
        status: 'critical',
        issues: [{
          type: 'no_recent_deployments',
          severity: 'high',
          description: '没有找到部署记录',
        }],
        recommendations: ['建议开始部署您的应用'],
      }
    }

    const stats = this.calculateStats(records)
    const recentRecords = records.slice(0, 10)
    const recentStats = this.calculateStats(recentRecords)

    // 检查失败率
    if (stats.successRate < 80) {
      const severity = stats.successRate < 50 ? 'high' : 'medium'
      score -= severity === 'high' ? 30 : 15
      issues.push({
        type: 'high_failure_rate',
        severity,
        description: `部署成功率较低 (${stats.successRate}%)`,
        data: { successRate: stats.successRate },
      })
      recommendations.push('检查部署失败的原因，改善部署流程')
    }

    // 检查部署速度
    if (stats.averageDuration > 600000) { // > 10 分钟
      score -= 10
      issues.push({
        type: 'slow_deployments',
        severity: 'medium',
        description: `平均部署时间较长 (${(stats.averageDuration / 60000).toFixed(1)} 分钟)`,
        data: { averageDuration: stats.averageDuration },
      })
      recommendations.push('优化构建和部署流程以减少部署时间')
    }

    // 检查稳定性
    if (recentStats.successRate < stats.successRate - 10) {
      score -= 15
      issues.push({
        type: 'unstable',
        severity: 'medium',
        description: '最近部署的成功率下降',
        data: {
          overallSuccessRate: stats.successRate,
          recentSuccessRate: recentStats.successRate,
        },
      })
      recommendations.push('关注最近的部署失败，可能存在新引入的问题')
    }

    // 检查最近部署时间
    const lastDeploy = records[0]
    const daysSinceLastDeploy = Math.floor(
      (Date.now() - lastDeploy.startTime.getTime()) / (24 * 60 * 60 * 1000)
    )
    if (daysSinceLastDeploy > 30) {
      score -= 10
      issues.push({
        type: 'no_recent_deployments',
        severity: 'low',
        description: `已有 ${daysSinceLastDeploy} 天没有部署`,
        data: { daysSinceLastDeploy },
      })
      recommendations.push('建议定期部署以保持持续交付')
    }

    // 确定状态
    let status: 'healthy' | 'warning' | 'critical'
    if (score >= 80) {
      status = 'healthy'
    } else if (score >= 50) {
      status = 'warning'
    } else {
      status = 'critical'
    }

    return {
      score: Math.max(0, score),
      status,
      issues,
      recommendations,
    }
  }

  /**
   * 格式化统计报告
   */
  formatStatsReport(stats: DeploymentStats): string {
    return [
      '📊 部署统计',
      '━'.repeat(40),
      `总部署次数: ${stats.totalDeployments}`,
      `成功/失败: ${stats.successfulDeployments}/${stats.failedDeployments}`,
      `成功率: ${stats.successRate}%`,
      '',
      '⏱️ 部署耗时',
      `平均: ${this.formatDuration(stats.averageDuration)}`,
      `最短: ${this.formatDuration(stats.minDuration)}`,
      `最长: ${this.formatDuration(stats.maxDuration)}`,
      `P50: ${this.formatDuration(stats.p50Duration)}`,
      `P90: ${this.formatDuration(stats.p90Duration)}`,
      `P99: ${this.formatDuration(stats.p99Duration)}`,
    ].join('\n')
  }

  /**
   * 格式化健康报告
   */
  formatHealthReport(health: DeploymentHealth): string {
    const statusEmoji = {
      healthy: '✅',
      warning: '⚠️',
      critical: '🔴',
    }

    const lines = [
      '🏥 部署健康度报告',
      '━'.repeat(40),
      `状态: ${statusEmoji[health.status]} ${health.status.toUpperCase()}`,
      `评分: ${health.score}/100`,
    ]

    if (health.issues.length > 0) {
      lines.push('', '问题:')
      health.issues.forEach(issue => {
        const severityIcon = issue.severity === 'high' ? '🔴' :
          issue.severity === 'medium' ? '🟡' : '🟢'
        lines.push(`  ${severityIcon} ${issue.description}`)
      })
    }

    if (health.recommendations.length > 0) {
      lines.push('', '建议:')
      health.recommendations.forEach((rec, i) => {
        lines.push(`  ${i + 1}. ${rec}`)
      })
    }

    return lines.join('\n')
  }

  /**
   * 计算百分位数
   */
  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0
    const index = Math.ceil((p / 100) * sortedArray.length) - 1
    return sortedArray[Math.max(0, index)]
  }

  /**
   * 分组
   */
  private groupBy<T, K extends string>(
    array: T[],
    keyFn: (item: T) => K
  ): Record<K, T[]> {
    return array.reduce((acc, item) => {
      const key = keyFn(item)
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(item)
      return acc
    }, {} as Record<K, T[]>)
  }

  /**
   * 按时间段分组
   */
  private groupByPeriod(
    records: DeploymentRecord[],
    period: 'hour' | 'day' | 'week' | 'month'
  ): Record<string, DeploymentRecord[]> {
    return this.groupBy(records, r => this.getPeriodKey(r.startTime, period))
  }

  /**
   * 获取时间段 Key
   */
  private getPeriodKey(date: Date, period: 'hour' | 'day' | 'week' | 'month'): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')

    switch (period) {
      case 'hour':
        return `${year}-${month}-${day}T${hour}`
      case 'day':
        return `${year}-${month}-${day}`
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        return `${weekStart.getFullYear()}-W${this.getWeekNumber(weekStart)}`
      case 'month':
        return `${year}-${month}`
    }
  }

  /**
   * 解析时间段 Key
   */
  private parsePeriodKey(
    key: string,
    period: 'hour' | 'day' | 'week' | 'month'
  ): { start: Date; end: Date; label: string } {
    let start: Date
    let end: Date

    switch (period) {
      case 'hour':
        start = new Date(`${key}:00:00`)
        end = new Date(start.getTime() + 60 * 60 * 1000)
        break
      case 'day':
        start = new Date(`${key}T00:00:00`)
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
        break
      case 'week':
        // 解析 YYYY-Www 格式
        const [yearStr, weekStr] = key.split('-W')
        start = this.getDateOfWeek(parseInt(yearStr), parseInt(weekStr))
        end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        start = new Date(`${key}-01T00:00:00`)
        end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
        break
    }

    return {
      start,
      end,
      label: key,
    }
  }

  /**
   * 获取周数
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  /**
   * 根据周数获取日期
   */
  private getDateOfWeek(year: number, week: number): Date {
    const simple = new Date(year, 0, 1 + (week - 1) * 7)
    const dow = simple.getDay()
    const weekStart = simple
    if (dow <= 4) {
      weekStart.setDate(simple.getDate() - simple.getDay() + 1)
    } else {
      weekStart.setDate(simple.getDate() + 8 - simple.getDay())
    }
    return weekStart
  }

  /**
   * 格式化时长
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
    return `${(ms / 3600000).toFixed(1)}h`
  }
}
