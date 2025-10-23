/**
 * 优雅退出处理
 */

import { logger } from './logger.js'

export type CleanupHandler = () => Promise<void> | void

export class GracefulShutdown {
  private static handlers: CleanupHandler[] = []
  private static isShuttingDown = false
  private static initialized = false

  /**
   * 注册清理处理器
   */
  static register(handler: CleanupHandler): void {
    this.handlers.push(handler)
  }

  /**
   * 注销清理处理器
   */
  static unregister(handler: CleanupHandler): void {
    const index = this.handlers.indexOf(handler)
    if (index > -1) {
      this.handlers.splice(index, 1)
    }
  }

  /**
   * 初始化信号监听
   */
  static init(): void {
    if (this.initialized) {
      return
    }

    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP']

    signals.forEach((signal) => {
      process.on(signal, async () => {
        if (this.isShuttingDown) {
          logger.warn('Force exit...')
          process.exit(1)
        }

        await this.shutdown(signal)
      })
    })

    // 处理未捕获的异常
    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught exception:', error)
      await this.shutdown('uncaughtException')
    })

    process.on('unhandledRejection', async (reason) => {
      logger.error('Unhandled rejection:', reason)
      await this.shutdown('unhandledRejection')
    })

    this.initialized = true
    logger.debug('Graceful shutdown handlers initialized')
  }

  /**
   * 执行优雅退出
   */
  private static async shutdown(reason: string): Promise<void> {
    this.isShuttingDown = true

    logger.info(`\nReceived ${reason}, shutting down gracefully...`)

    try {
      // 设置最大清理时间
      const cleanupTimeout = setTimeout(() => {
        logger.error('Cleanup timeout, forcing exit...')
        process.exit(1)
      }, 30000) // 30秒超时

      // 并行执行所有清理处理器
      await Promise.all(
        this.handlers.map(async (handler) => {
          try {
            await handler()
          } catch (error) {
            logger.error('Cleanup handler failed:', error)
          }
        })
      )

      clearTimeout(cleanupTimeout)

      logger.info('Cleanup completed successfully')
      process.exit(0)
    } catch (error) {
      logger.error('Cleanup failed:', error)
      process.exit(1)
    }
  }

  /**
   * 手动触发退出
   */
  static async triggerShutdown(): Promise<void> {
    await this.shutdown('manual')
  }

  /**
   * 重置（用于测试）
   */
  static reset(): void {
    this.handlers = []
    this.isShuttingDown = false
    this.initialized = false
  }
}




