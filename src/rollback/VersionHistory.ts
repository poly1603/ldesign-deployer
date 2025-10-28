/**
 * 版本历史管理
 */

import { readJSON, writeJSON, fileExists } from '../utils/file-system.js'
import { logger } from '../utils/logger.js'
import type { DeploymentHistory } from '../types/index.js'
import { resolve } from 'path'

export class VersionHistory {
  private historyFile: string
  private history: DeploymentHistory[]

  constructor(historyFile = '.deploy-history.json') {
    this.historyFile = resolve(process.cwd(), historyFile)
    this.history = []
  }

  /**
   * 加载历史记录
   */
  async load(): Promise<void> {
    if (fileExists(this.historyFile)) {
      this.history = await readJSON(this.historyFile)
    }
  }

  /**
   * 保存历史记录
   */
  async save(): Promise<void> {
    await writeJSON(this.historyFile, this.history)
  }

  /**
   * 添加部署记录
   */
  async addDeployment(record: DeploymentHistory): Promise<void> {
    await this.load()
    this.history.unshift(record) // 最新的在前面

    // 只保留最近 50 条记录
    if (this.history.length > 50) {
      this.history = this.history.slice(0, 50)
    }

    await this.save()
    logger.debug(`Deployment record added: ${record.version}`)
  }

  /**
   * 获取指定版本
   */
  async getVersion(version: string): Promise<DeploymentHistory | null> {
    await this.load()
    return this.history.find(h => h.version === version) || null
  }

  /**
   * 获取前一个成功的版本
   */
  async getPreviousVersion(): Promise<DeploymentHistory | null> {
    await this.load()
    const successful = this.history.filter(h => h.status === 'success')
    return successful[1] || null // [0] 是当前版本，[1] 是前一个
  }

  /**
   * 获取所有历史记录
   */
  async getAll(): Promise<DeploymentHistory[]> {
    await this.load()
    return this.history
  }

  /**
   * 获取最近 N 条记录
   */
  async getRecent(count = 10): Promise<DeploymentHistory[]> {
    await this.load()
    return this.history.slice(0, count)
  }

  /**
   * 记录回滚
   */
  async recordRollback(version: string): Promise<void> {
    await this.load()
    const record = this.history.find(h => h.version === version)

    if (record) {
      record.status = 'rolled_back'
      await this.save()
    }
  }

  /**
   * 清除历史记录
   */
  async clear(): Promise<void> {
    this.history = []
    await this.save()
    logger.info('Deployment history cleared')
  }

  /**
   * 按环境过滤
   */
  async getByEnvironment(environment: string): Promise<DeploymentHistory[]> {
    await this.load()
    return this.history.filter(h => h.config.environment === environment)
  }

  /**
   * 按状态过滤
   */
  async getByStatus(status: string): Promise<DeploymentHistory[]> {
    await this.load()
    return this.history.filter(h => h.status === status)
  }

  /**
   * 获取成功的部署
   */
  async getSuccessfulDeployments(): Promise<DeploymentHistory[]> {
    return this.getByStatus('success')
  }

  /**
   * 获取失败的部署
   */
  async getFailedDeployments(): Promise<DeploymentHistory[]> {
    return this.getByStatus('failed')
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<{
    total: number
    successful: number
    failed: number
    rolledBack: number
    successRate: number
    recentDeployments: number
    environments: Record<string, number>
  }> {
    await this.load()

    const total = this.history.length
    const successful = this.history.filter(h => h.status === 'success').length
    const failed = this.history.filter(h => h.status === 'failed').length
    const rolledBack = this.history.filter(h => h.status === 'rolled_back').length
    const successRate = total > 0 ? (successful / total) * 100 : 0

    // 过去 24 小时的部署
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const recentDeployments = this.history.filter(h => {
      const timestamp = new Date(h.timestamp).getTime()
      return timestamp > oneDayAgo
    }).length

    // 按环境统计
    const environments: Record<string, number> = {}
    this.history.forEach(h => {
      const env = h.config.environment
      environments[env] = (environments[env] || 0) + 1
    })

    return {
      total,
      successful,
      failed,
      rolledBack,
      successRate: Math.round(successRate * 100) / 100,
      recentDeployments,
      environments,
    }
  }

  /**
   * 查找特定时间范围内的部署
   */
  async getByTimeRange(startDate: Date, endDate: Date): Promise<DeploymentHistory[]> {
    await this.load()
    return this.history.filter(h => {
      const timestamp = new Date(h.timestamp)
      return timestamp >= startDate && timestamp <= endDate
    })
  }

  /**
   * 获取最近的成功部署
   */
  async getLastSuccessfulDeployment(): Promise<DeploymentHistory | null> {
    await this.load()
    return this.history.find(h => h.status === 'success') || null
  }

  /**
   * 比较两个版本
   */
  async compareVersions(version1: string, version2: string): Promise<{
    version1: DeploymentHistory | null
    version2: DeploymentHistory | null
    differences: string[]
  }> {
    await this.load()
    const v1 = this.history.find(h => h.version === version1) || null
    const v2 = this.history.find(h => h.version === version2) || null

    const differences: string[] = []

    if (v1 && v2) {
      if (v1.config.platform !== v2.config.platform) {
        differences.push(`Platform: ${v1.config.platform} vs ${v2.config.platform}`)
      }
      if (v1.config.environment !== v2.config.environment) {
        differences.push(`Environment: ${v1.config.environment} vs ${v2.config.environment}`)
      }
      if (v1.status !== v2.status) {
        differences.push(`Status: ${v1.status} vs ${v2.status}`)
      }
    }

    return { version1: v1, version2: v2, differences }
  }
}
