/**
 * 备份管理器
 * @module core/BackupManager
 * 
 * @description 部署前自动备份，支持恢复和清理
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { mkdir, readdir, stat, rm, copyFile, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { logger } from '../utils/logger.js'

const execAsync = promisify(exec)

/**
 * 备份配置
 */
export interface BackupConfig {
  /** 备份目录 */
  backupDir?: string
  /** 保留的备份数量 */
  keepCount?: number
  /** 压缩备份 */
  compress?: boolean
  /** 包含的文件/目录 */
  include?: string[]
  /** 排除的文件/目录 */
  exclude?: string[]
  /** 备份前钩子 */
  beforeBackup?: () => Promise<void>
  /** 备份后钩子 */
  afterBackup?: (backupPath: string) => Promise<void>
}

/**
 * 备份信息
 */
export interface BackupInfo {
  /** 备份 ID */
  id: string
  /** 备份路径 */
  path: string
  /** 备份时间 */
  timestamp: Date
  /** 备份大小（字节） */
  size: number
  /** 版本 */
  version?: string
  /** 描述 */
  description?: string
  /** 是否压缩 */
  compressed: boolean
}

/**
 * 备份管理器
 * 
 * @example
 * ```typescript
 * const backup = new BackupManager({
 *   backupDir: './backups',
 *   keepCount: 5,
 *   compress: true
 * });
 * 
 * // 创建备份
 * const info = await backup.create('./dist', '1.0.0');
 * 
 * // 恢复备份
 * await backup.restore(info.id, './dist');
 * 
 * // 清理旧备份
 * await backup.cleanup();
 * ```
 */
export class BackupManager {
  private config: Required<BackupConfig>

  constructor(config: BackupConfig = {}) {
    this.config = {
      backupDir: config.backupDir || join(process.cwd(), '.deployer', 'backups'),
      keepCount: config.keepCount || 5,
      compress: config.compress ?? true,
      include: config.include || [],
      exclude: config.exclude || ['node_modules', '.git', '*.log'],
      beforeBackup: config.beforeBackup || (async () => { }),
      afterBackup: config.afterBackup || (async () => { }),
    }
  }

  /**
   * 创建备份
   */
  async create(
    sourcePath: string,
    version?: string,
    description?: string
  ): Promise<BackupInfo> {
    const startTime = Date.now()
    const backupId = this.generateBackupId()

    logger.info(`💾 Creating backup: ${backupId}`)
    logger.info(`   Source: ${sourcePath}`)

    try {
      // 执行前置钩子
      await this.config.beforeBackup()

      // 确保备份目录存在
      await mkdir(this.config.backupDir, { recursive: true })

      // 备份路径
      const backupPath = this.config.compress
        ? join(this.config.backupDir, `${backupId}.tar.gz`)
        : join(this.config.backupDir, backupId)

      // 创建备份
      if (this.config.compress) {
        await this.createCompressedBackup(sourcePath, backupPath)
      } else {
        await this.createDirectoryBackup(sourcePath, backupPath)
      }

      // 获取备份大小
      const backupStat = await stat(backupPath)
      const size = backupStat.isDirectory()
        ? await this.getDirectorySize(backupPath)
        : backupStat.size

      // 保存备份元数据
      const info: BackupInfo = {
        id: backupId,
        path: backupPath,
        timestamp: new Date(),
        size,
        version,
        description,
        compressed: this.config.compress,
      }

      await this.saveMetadata(backupId, info)

      // 执行后置钩子
      await this.config.afterBackup(backupPath)

      const duration = Date.now() - startTime
      logger.success(`✅ Backup created in ${(duration / 1000).toFixed(2)}s`)
      logger.info(`   Size: ${this.formatSize(size)}`)
      logger.info(`   Path: ${backupPath}`)

      // 清理旧备份
      await this.cleanup()

      return info
    } catch (error: any) {
      logger.error(`❌ Backup failed: ${error.message}`)
      throw error
    }
  }

  /**
   * 恢复备份
   */
  async restore(backupId: string, targetPath: string): Promise<void> {
    logger.info(`📦 Restoring backup: ${backupId}`)
    logger.info(`   Target: ${targetPath}`)

    const info = await this.getBackupInfo(backupId)
    if (!info) {
      throw new Error(`Backup not found: ${backupId}`)
    }

    try {
      // 确保目标目录存在
      await mkdir(targetPath, { recursive: true })

      if (info.compressed) {
        // 解压备份
        await execAsync(`tar -xzf "${info.path}" -C "${targetPath}"`)
      } else {
        // 复制目录
        await this.copyDirectory(info.path, targetPath)
      }

      logger.success(`✅ Backup restored successfully`)
    } catch (error: any) {
      logger.error(`❌ Restore failed: ${error.message}`)
      throw error
    }
  }

  /**
   * 列出所有备份
   */
  async list(): Promise<BackupInfo[]> {
    const metadataDir = join(this.config.backupDir, '.metadata')

    if (!existsSync(metadataDir)) {
      return []
    }

    const files = await readdir(metadataDir)
    const backups: BackupInfo[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await readFile(join(metadataDir, file), 'utf-8')
          const info = JSON.parse(content)
          info.timestamp = new Date(info.timestamp)
          backups.push(info)
        } catch {
          // 忽略无效的元数据
        }
      }
    }

    // 按时间倒序排列
    return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * 获取备份信息
   */
  async getBackupInfo(backupId: string): Promise<BackupInfo | null> {
    const metadataPath = join(this.config.backupDir, '.metadata', `${backupId}.json`)

    if (!existsSync(metadataPath)) {
      return null
    }

    try {
      const content = await readFile(metadataPath, 'utf-8')
      const info = JSON.parse(content)
      info.timestamp = new Date(info.timestamp)
      return info
    } catch {
      return null
    }
  }

  /**
   * 删除备份
   */
  async delete(backupId: string): Promise<void> {
    const info = await this.getBackupInfo(backupId)
    if (!info) {
      throw new Error(`Backup not found: ${backupId}`)
    }

    // 删除备份文件/目录
    if (existsSync(info.path)) {
      await rm(info.path, { recursive: true })
    }

    // 删除元数据
    const metadataPath = join(this.config.backupDir, '.metadata', `${backupId}.json`)
    if (existsSync(metadataPath)) {
      await rm(metadataPath)
    }

    logger.info(`🗑️ Deleted backup: ${backupId}`)
  }

  /**
   * 清理旧备份
   */
  async cleanup(): Promise<number> {
    const backups = await this.list()
    const toDelete = backups.slice(this.config.keepCount)

    for (const backup of toDelete) {
      await this.delete(backup.id)
    }

    if (toDelete.length > 0) {
      logger.info(`🧹 Cleaned up ${toDelete.length} old backup(s)`)
    }

    return toDelete.length
  }

  /**
   * 生成备份 ID
   */
  private generateBackupId(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    const second = String(now.getSeconds()).padStart(2, '0')
    return `backup_${year}${month}${day}_${hour}${minute}${second}`
  }

  /**
   * 创建压缩备份
   */
  private async createCompressedBackup(sourcePath: string, backupPath: string): Promise<void> {
    const excludeArgs = this.config.exclude
      .map(e => `--exclude="${e}"`)
      .join(' ')

    await execAsync(
      `tar -czf "${backupPath}" ${excludeArgs} -C "${sourcePath}" .`
    )
  }

  /**
   * 创建目录备份
   */
  private async createDirectoryBackup(sourcePath: string, backupPath: string): Promise<void> {
    await mkdir(backupPath, { recursive: true })
    await this.copyDirectory(sourcePath, backupPath)
  }

  /**
   * 复制目录
   */
  private async copyDirectory(source: string, target: string): Promise<void> {
    const entries = await readdir(source, { withFileTypes: true })

    for (const entry of entries) {
      const sourcePath = join(source, entry.name)
      const targetPath = join(target, entry.name)

      // 检查是否应该排除
      if (this.config.exclude.some(e => this.matchPattern(entry.name, e))) {
        continue
      }

      if (entry.isDirectory()) {
        await mkdir(targetPath, { recursive: true })
        await this.copyDirectory(sourcePath, targetPath)
      } else {
        await copyFile(sourcePath, targetPath)
      }
    }
  }

  /**
   * 保存备份元数据
   */
  private async saveMetadata(backupId: string, info: BackupInfo): Promise<void> {
    const metadataDir = join(this.config.backupDir, '.metadata')
    await mkdir(metadataDir, { recursive: true })

    const metadataPath = join(metadataDir, `${backupId}.json`)
    await writeFile(metadataPath, JSON.stringify(info, null, 2))
  }

  /**
   * 获取目录大小
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let size = 0
    const entries = await readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const entryPath = join(dirPath, entry.name)
      const entryStat = await stat(entryPath)

      if (entryStat.isDirectory()) {
        size += await this.getDirectorySize(entryPath)
      } else {
        size += entryStat.size
      }
    }

    return size
  }

  /**
   * 格式化大小
   */
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`
  }

  /**
   * 模式匹配
   */
  private matchPattern(name: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
    )
    return regex.test(name)
  }
}
