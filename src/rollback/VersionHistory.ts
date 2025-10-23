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
}




