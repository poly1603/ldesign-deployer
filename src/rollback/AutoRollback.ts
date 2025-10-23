/**
 * 自动回滚
 */

import { logger } from '../utils/logger.js'
import { HealthChecker } from '../core/HealthChecker.js'
import { RollbackManager } from './RollbackManager.js'
import type { HealthCheckConfig } from '../types/index.js'

export interface AutoRollbackConfig {
  enabled: boolean
  errorThreshold: number // 连续失败次数
  checkInterval: number // 检查间隔(秒)
  onRollback?: () => void
}

export class AutoRollback {
  private healthChecker: HealthChecker
  private rollbackManager: RollbackManager
  private failureCount = 0
  private monitoring = false

  constructor() {
    this.healthChecker = new HealthChecker()
    this.rollbackManager = new RollbackManager()
  }

  /**
   * 启动自动回滚监控
   */
  async start(
    healthConfig: HealthCheckConfig,
    autoConfig: AutoRollbackConfig
  ): Promise<() => void> {
    if (!autoConfig.enabled) {
      logger.info('Auto-rollback is disabled')
      return () => { }
    }

    logger.info('Starting auto-rollback monitoring...')
    this.monitoring = true
    this.failureCount = 0

    const stop = await this.healthChecker.monitor(
      healthConfig,
      async (result) => {
        if (!this.monitoring) return

        if (result.healthy) {
          // 重置失败计数
          if (this.failureCount > 0) {
            logger.info('Service recovered')
            this.failureCount = 0
          }
        } else {
          // 增加失败计数
          this.failureCount++
          logger.warn(`Health check failed (${this.failureCount}/${autoConfig.errorThreshold})`)

          // 达到阈值，触发自动回滚
          if (this.failureCount >= autoConfig.errorThreshold) {
            logger.error('Error threshold reached, triggering auto-rollback...')
            await this.performRollback()

            if (autoConfig.onRollback) {
              autoConfig.onRollback()
            }

            // 停止监控
            this.stop()
          }
        }
      },
      autoConfig.checkInterval * 1000
    )

    // 返回停止函数
    return () => {
      this.stop()
      stop()
    }
  }

  /**
   * 停止监控
   */
  stop(): void {
    this.monitoring = false
    logger.info('Auto-rollback monitoring stopped')
  }

  /**
   * 执行回滚
   */
  private async performRollback(): Promise<void> {
    try {
      await this.rollbackManager.rollback({})
      logger.success('Auto-rollback completed successfully')
    } catch (error: any) {
      logger.error('Auto-rollback failed:', error.message)
    }
  }
}




