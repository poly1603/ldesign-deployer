/**
 * 审计日志系统
 */

import { appendFile } from 'fs/promises'
import { join } from 'path'
import { logger } from './logger.js'
import { fileExists, ensureDir } from './file-system.js'

export interface AuditLog {
  id: string
  timestamp: string
  user: string
  action: string
  resource: string
  environment: string
  details: any
  result: 'success' | 'failure'
  duration: number
  ip?: string
}

export class AuditLogger {
  private logFile: string
  private logDir: string

  constructor(logDir = '.deploy-logs') {
    this.logDir = join(process.cwd(), logDir)
    this.logFile = join(this.logDir, 'audit.jsonl')
  }

  /**
   * 记录审计日志
   */
  async log(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const log: AuditLog = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        ...entry,
      }

      // 确保日志目录存在
      await ensureDir(this.logDir)

      // 写入 JSONL 格式（每行一个 JSON）
      await appendFile(this.logFile, JSON.stringify(log) + '\n')

      logger.debug(`Audit log recorded: ${log.action} on ${log.resource}`)
    } catch (error) {
      logger.error('Failed to write audit log:', error)
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 记录部署开始
   */
  async logDeploymentStart(deployment: {
    name: string
    version: string
    environment: string
    platform: string
  }): Promise<void> {
    await this.log({
      user: this.getCurrentUser(),
      action: 'deployment.start',
      resource: `${deployment.name}@${deployment.version}`,
      environment: deployment.environment,
      details: { platform: deployment.platform },
      result: 'success',
      duration: 0,
    })
  }

  /**
   * 记录部署成功
   */
  async logDeploymentSuccess(deployment: {
    name: string
    version: string
    environment: string
    duration: number
  }): Promise<void> {
    await this.log({
      user: this.getCurrentUser(),
      action: 'deployment.success',
      resource: `${deployment.name}@${deployment.version}`,
      environment: deployment.environment,
      details: {},
      result: 'success',
      duration: deployment.duration,
    })
  }

  /**
   * 记录部署失败
   */
  async logDeploymentFailure(deployment: {
    name: string
    version: string
    environment: string
    error: string
    duration: number
  }): Promise<void> {
    await this.log({
      user: this.getCurrentUser(),
      action: 'deployment.failure',
      resource: `${deployment.name}@${deployment.version}`,
      environment: deployment.environment,
      details: { error: deployment.error },
      result: 'failure',
      duration: deployment.duration,
    })
  }

  /**
   * 记录回滚
   */
  async logRollback(rollback: {
    name: string
    fromVersion: string
    toVersion: string
    environment: string
    duration: number
    result: 'success' | 'failure'
  }): Promise<void> {
    await this.log({
      user: this.getCurrentUser(),
      action: 'rollback',
      resource: `${rollback.name}`,
      environment: rollback.environment,
      details: {
        from: rollback.fromVersion,
        to: rollback.toVersion,
      },
      result: rollback.result,
      duration: rollback.duration,
    })
  }

  /**
   * 查询审计日志
   */
  async query(filter?: {
    action?: string
    resource?: string
    environment?: string
    startDate?: Date
    endDate?: Date
  }): Promise<AuditLog[]> {
    if (!fileExists(this.logFile)) {
      return []
    }

    try {
      const { readFile } = await import('fs/promises')
      const content = await readFile(this.logFile, 'utf-8')
      const lines = content.trim().split('\n')

      let logs: AuditLog[] = lines
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line))

      // 应用过滤器
      if (filter) {
        logs = logs.filter((log) => {
          if (filter.action && log.action !== filter.action) return false
          if (filter.resource && !log.resource.includes(filter.resource)) return false
          if (filter.environment && log.environment !== filter.environment) return false

          const logDate = new Date(log.timestamp)
          if (filter.startDate && logDate < filter.startDate) return false
          if (filter.endDate && logDate > filter.endDate) return false

          return true
        })
      }

      return logs
    } catch (error) {
      logger.error('Failed to query audit logs:', error)
      return []
    }
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    total: number
    byAction: Record<string, number>
    byResult: Record<string, number>
    byEnvironment: Record<string, number>
  }> {
    const logs = await this.query()

    const stats = {
      total: logs.length,
      byAction: {} as Record<string, number>,
      byResult: {} as Record<string, number>,
      byEnvironment: {} as Record<string, number>,
    }

    for (const log of logs) {
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1
      stats.byResult[log.result] = (stats.byResult[log.result] || 0) + 1
      stats.byEnvironment[log.environment] = (stats.byEnvironment[log.environment] || 0) + 1
    }

    return stats
  }

  /**
   * 清理旧日志
   */
  async cleanup(daysToKeep = 90): Promise<void> {
    const logs = await this.query()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const filtered = logs.filter((log) => new Date(log.timestamp) >= cutoffDate)

    // 重写日志文件
    const content = filtered.map((log) => JSON.stringify(log)).join('\n') + '\n'

    const { writeFile } = await import('fs/promises')
    await writeFile(this.logFile, content)

    logger.info(`Cleaned up audit logs older than ${daysToKeep} days`)
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 获取当前用户
   */
  private getCurrentUser(): string {
    return process.env.USER || process.env.USERNAME || 'unknown'
  }
}




