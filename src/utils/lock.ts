/**
 * 部署锁机制
 */

import { readJSON, writeJSON, fileExists, removeFile } from './file-system.js'
import { DeploymentError } from './errors.js'
import { logger } from './logger.js'
import { join } from 'path'

export interface LockInfo {
  id: string
  pid: number
  timestamp: number
  operation: string
  user?: string
}

export class DeploymentLock {
  private static lockFile = '.deploy.lock'
  private static locks = new Map<string, LockInfo>()
  private static lockTimeout = 3600000 // 1小时默认超时

  /**
   * 获取锁
   */
  static async acquire(id: string, operation = 'deploy'): Promise<void> {
    // 检查内存锁
    if (this.locks.has(id)) {
      throw new DeploymentError(
        'Deployment already in progress',
        'deploy',
        { lockId: id }
      )
    }

    // 检查文件锁
    const lockPath = join(process.cwd(), this.lockFile)

    if (fileExists(lockPath)) {
      const lockData = await readJSON<LockInfo>(lockPath)

      // 检查锁是否过期
      const age = Date.now() - lockData.timestamp
      if (age < this.lockTimeout) {
        throw new DeploymentError(
          `Another deployment is in progress (PID: ${lockData.pid})`,
          operation,
          {
            existingLock: lockData,
            age: Math.round(age / 1000),
          }
        )
      }

      // 锁已过期，清理它
      logger.warn('Found expired lock, removing...')
      await removeFile(lockPath)
    }

    // 创建新锁
    const lockInfo: LockInfo = {
      id,
      pid: process.pid,
      timestamp: Date.now(),
      operation,
      user: process.env.USER || process.env.USERNAME,
    }

    await writeJSON(lockPath, lockInfo)
    this.locks.set(id, lockInfo)

    logger.debug(`Lock acquired: ${id}`)
  }

  /**
   * 释放锁
   */
  static async release(id: string): Promise<void> {
    // 移除内存锁
    this.locks.delete(id)

    // 移除文件锁
    const lockPath = join(process.cwd(), this.lockFile)

    if (fileExists(lockPath)) {
      try {
        const lockData = await readJSON<LockInfo>(lockPath)

        // 只有相同 ID 才能释放
        if (lockData.id === id) {
          await removeFile(lockPath)
          logger.debug(`Lock released: ${id}`)
        }
      } catch (error) {
        logger.warn('Failed to release lock:', error)
      }
    }
  }

  /**
   * 强制释放锁（危险操作）
   */
  static async forceRelease(): Promise<void> {
    const lockPath = join(process.cwd(), this.lockFile)

    if (fileExists(lockPath)) {
      await removeFile(lockPath)
      logger.warn('Lock forcefully released')
    }

    this.locks.clear()
  }

  /**
   * 检查是否有锁
   */
  static async isLocked(): Promise<boolean> {
    const lockPath = join(process.cwd(), this.lockFile)

    if (!fileExists(lockPath)) {
      return false
    }

    try {
      const lockData = await readJSON<LockInfo>(lockPath)
      const age = Date.now() - lockData.timestamp

      // 如果锁已过期，视为未锁定
      return age < this.lockTimeout
    } catch {
      return false
    }
  }

  /**
   * 获取锁信息
   */
  static async getLockInfo(): Promise<LockInfo | null> {
    const lockPath = join(process.cwd(), this.lockFile)

    if (!fileExists(lockPath)) {
      return null
    }

    try {
      return await readJSON<LockInfo>(lockPath)
    } catch {
      return null
    }
  }

  /**
   * 设置锁超时时间
   */
  static setTimeout(timeoutMs: number): void {
    this.lockTimeout = timeoutMs
  }
}




