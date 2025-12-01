/**
 * 部署指标收集器
 * @module metrics/MetricsCollector
 * 
 * @description 收集和存储部署指标数据
 */

import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import type {
  DeploymentRecord,
  MetricsQueryOptions,
  MetricsStorage,
  TimeRange,
} from './types.js'
import type { Environment, Platform } from '../types/index.js'

/**
 * 文件存储实现
 */
class FileMetricsStorage implements MetricsStorage {
  private filePath: string
  private records: DeploymentRecord[] = []
  private loaded = false

  constructor(filePath: string) {
    this.filePath = filePath
  }

  private async load(): Promise<void> {
    if (this.loaded) return

    if (existsSync(this.filePath)) {
      try {
        const data = await readFile(this.filePath, 'utf-8')
        const parsed = JSON.parse(data)
        this.records = parsed.records.map((r: any) => ({
          ...r,
          startTime: new Date(r.startTime),
          endTime: new Date(r.endTime),
        }))
      } catch {
        this.records = []
      }
    }
    this.loaded = true
  }

  private async persist(): Promise<void> {
    await writeFile(
      this.filePath,
      JSON.stringify({ records: this.records }, null, 2)
    )
  }

  async save(record: DeploymentRecord): Promise<void> {
    await this.load()
    this.records.push(record)
    await this.persist()
  }

  async query(options: MetricsQueryOptions): Promise<DeploymentRecord[]> {
    await this.load()

    let filtered = [...this.records]

    // 应用过滤条件
    if (options.startDate) {
      filtered = filtered.filter(r => r.startTime >= options.startDate!)
    }
    if (options.endDate) {
      filtered = filtered.filter(r => r.startTime <= options.endDate!)
    }
    if (options.appName) {
      filtered = filtered.filter(r => r.appName === options.appName)
    }
    if (options.environment) {
      filtered = filtered.filter(r => r.environment === options.environment)
    }
    if (options.platform) {
      filtered = filtered.filter(r => r.platform === options.platform)
    }
    if (options.successOnly) {
      filtered = filtered.filter(r => r.success)
    }
    if (options.failedOnly) {
      filtered = filtered.filter(r => !r.success)
    }

    // 按时间倒序
    filtered.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())

    // 分页
    if (options.offset) {
      filtered = filtered.slice(options.offset)
    }
    if (options.limit) {
      filtered = filtered.slice(0, options.limit)
    }

    return filtered
  }

  async count(options?: MetricsQueryOptions): Promise<number> {
    const records = await this.query(options || {})
    return records.length
  }

  async delete(id: string): Promise<void> {
    await this.load()
    this.records = this.records.filter(r => r.id !== id)
    await this.persist()
  }

  async cleanup(beforeDate: Date): Promise<number> {
    await this.load()
    const before = this.records.length
    this.records = this.records.filter(r => r.startTime >= beforeDate)
    const deleted = before - this.records.length
    if (deleted > 0) {
      await this.persist()
    }
    return deleted
  }
}

/**
 * 部署指标收集器
 * 
 * @example
 * ```typescript
 * const collector = new MetricsCollector();
 * 
 * // 记录部署
 * await collector.record({
 *   appName: 'my-app',
 *   version: '1.0.0',
 *   environment: 'production',
 *   platform: 'kubernetes',
 *   success: true,
 *   duration: 45000
 * });
 * 
 * // 查询最近部署
 * const recent = await collector.getRecent(10);
 * ```
 */
export class MetricsCollector {
  private storage: MetricsStorage

  constructor(options: { storagePath?: string } = {}) {
    const storagePath = options.storagePath || join(
      process.cwd(),
      '.deployer',
      'metrics.json'
    )
    this.storage = new FileMetricsStorage(storagePath)
  }

  /**
   * 记录部署
   */
  async record(data: {
    appName: string
    version: string
    environment: Environment
    platform: Platform
    success: boolean
    startTime?: Date
    endTime?: Date
    duration?: number
    error?: string
    user?: string
    gitCommit?: string
    gitBranch?: string
    metadata?: Record<string, any>
  }): Promise<DeploymentRecord> {
    const now = new Date()
    const startTime = data.startTime || now
    const endTime = data.endTime || now
    const duration = data.duration || (endTime.getTime() - startTime.getTime())

    const record: DeploymentRecord = {
      id: this.generateId(),
      appName: data.appName,
      version: data.version,
      environment: data.environment,
      platform: data.platform,
      success: data.success,
      startTime,
      endTime,
      duration,
      error: data.error,
      user: data.user,
      gitCommit: data.gitCommit,
      gitBranch: data.gitBranch,
      metadata: data.metadata,
    }

    await this.storage.save(record)
    return record
  }

  /**
   * 查询部署记录
   */
  async query(options: MetricsQueryOptions = {}): Promise<DeploymentRecord[]> {
    // 如果有时间范围，转换为日期
    if (options.timeRange && !options.startDate) {
      options.startDate = this.getStartDateFromRange(options.timeRange)
    }

    return this.storage.query(options)
  }

  /**
   * 获取最近的部署
   */
  async getRecent(limit: number = 10): Promise<DeploymentRecord[]> {
    return this.query({ limit })
  }

  /**
   * 获取应用的最后部署
   */
  async getLastDeployment(appName: string): Promise<DeploymentRecord | null> {
    const records = await this.query({ appName, limit: 1 })
    return records[0] || null
  }

  /**
   * 获取总部署数
   */
  async getTotalCount(options?: MetricsQueryOptions): Promise<number> {
    return this.storage.count(options)
  }

  /**
   * 清理旧记录
   */
  async cleanup(daysToKeep: number = 90): Promise<number> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysToKeep)
    return this.storage.cleanup(cutoff)
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 根据时间范围获取开始日期
   */
  private getStartDateFromRange(range: TimeRange): Date {
    const now = new Date()
    switch (range) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000)
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      case 'quarter':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      case 'all':
      default:
        return new Date(0)
    }
  }
}
