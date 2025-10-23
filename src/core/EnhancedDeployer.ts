/**
 * 增强版部署器（集成所有高级功能）
 */

import { Deployer, DeployOptions } from './Deployer.js'
import { PreDeploymentChecker } from './PreDeploymentChecker.js'
import { DeploymentLock } from '../utils/lock.js'
import { GracefulShutdown } from '../utils/graceful-shutdown.js'
import { ProgressTracker, DeploymentPhase } from '../utils/progress.js'
import { AuditLogger } from '../utils/audit-log.js'
import { withRetry, withTimeout } from '../utils/retry.js'
import { logger } from '../utils/logger.js'
import type { DeployResult, DeployConfig } from '../types/index.js'

export interface EnhancedDeployOptions extends DeployOptions {
  skipPreCheck?: boolean
  lockTimeout?: number
  deploymentTimeout?: number
  enableAudit?: boolean
  enableProgress?: boolean
  retryOnFailure?: boolean
}

export class EnhancedDeployer extends Deployer {
  private preChecker: PreDeploymentChecker
  private progressTracker: ProgressTracker
  private auditLogger: AuditLogger
  private lockId?: string

  constructor(options: { workDir?: string } = {}) {
    super(options)
    this.preChecker = new PreDeploymentChecker()
    this.progressTracker = new ProgressTracker()
    this.auditLogger = new AuditLogger()

    // 初始化优雅退出
    GracefulShutdown.init()
    this.registerCleanupHandlers()
  }

  /**
   * 增强版部署
   */
  async deploy(options: EnhancedDeployOptions = {}): Promise<DeployResult> {
    const startTime = Date.now()
    this.lockId = `deploy-${Date.now()}`

    try {
      // 0. 初始化
      if (options.enableProgress !== false) {
        this.progressTracker.update(DeploymentPhase.INIT, 0, 'Initializing deployment')
      }

      // 1. 获取部署锁
      logger.info('🔒 Acquiring deployment lock...')
      await DeploymentLock.acquire(this.lockId, 'deploy')

      // 2. 加载配置
      this.progressTracker.update(DeploymentPhase.VALIDATE, 5, 'Loading configuration')
      const config = await this.getConfigManager().loadConfig()

      // 3. 部署前置检查
      if (!options.skipPreCheck) {
        this.progressTracker.update(DeploymentPhase.PRE_CHECK, 10, 'Running pre-deployment checks')
        await this.preChecker.checkAll(config)
      }

      // 4. 审计日志 - 开始
      if (options.enableAudit !== false) {
        await this.auditLogger.logDeploymentStart({
          name: config.name,
          version: config.version,
          environment: config.environment,
          platform: config.platform,
        })
      }

      // 5. 执行部署（带超时）
      this.progressTracker.update(DeploymentPhase.DEPLOY, 20, 'Starting deployment')

      let result: DeployResult

      if (options.deploymentTimeout) {
        result = await withTimeout(
          super.deploy(options),
          options.deploymentTimeout,
          'Deployment'
        )
      } else if (options.retryOnFailure) {
        result = await withRetry(
          () => super.deploy(options),
          {
            maxAttempts: 3,
            delay: 5000,
            timeout: options.deploymentTimeout,
            onRetry: (attempt, error) => {
              logger.warn(`Deployment attempt ${attempt} failed: ${error.message}`)
            },
          }
        )
      } else {
        result = await super.deploy(options)
      }

      // 6. 完成
      const duration = Date.now() - startTime
      this.progressTracker.complete('Deployment completed successfully')

      // 7. 审计日志 - 成功
      if (options.enableAudit !== false) {
        await this.auditLogger.logDeploymentSuccess({
          name: config.name,
          version: config.version,
          environment: config.environment,
          duration,
        })
      }

      return result
    } catch (error: any) {
      const duration = Date.now() - startTime
      this.progressTracker.fail(error.message)

      // 审计日志 - 失败
      if (options.enableAudit !== false) {
        const config = await this.getConfigManager().loadConfig().catch(() => ({
          name: 'unknown',
          version: 'unknown',
          environment: 'development' as const,
        }))

        await this.auditLogger.logDeploymentFailure({
          name: config.name,
          version: config.version,
          environment: config.environment,
          error: error.message,
          duration,
        })
      }

      throw error
    } finally {
      // 释放锁
      if (this.lockId) {
        await DeploymentLock.release(this.lockId)
      }
    }
  }

  /**
   * 获取进度追踪器
   */
  getProgressTracker(): ProgressTracker {
    return this.progressTracker
  }

  /**
   * 获取审计日志器
   */
  getAuditLogger(): AuditLogger {
    return this.auditLogger
  }

  /**
   * 获取前置检查器
   */
  getPreChecker(): PreDeploymentChecker {
    return this.preChecker
  }

  /**
   * 注册清理处理器
   */
  private registerCleanupHandlers(): void {
    GracefulShutdown.register(async () => {
      logger.info('Cleaning up deployment resources...')

      // 释放锁
      if (this.lockId) {
        await DeploymentLock.release(this.lockId)
      }

      // 其他清理工作...
    })
  }

  /**
   * 监听部署进度
   */
  onProgress(callback: (event: any) => void): void {
    this.progressTracker.on(callback)
  }

  /**
   * 强制释放锁（调试用）
   */
  async forceReleaseLock(): Promise<void> {
    await DeploymentLock.forceRelease()
    logger.warn('Deployment lock forcefully released')
  }

  /**
   * 检查是否有部署正在进行
   */
  async isDeploymentInProgress(): Promise<boolean> {
    return DeploymentLock.isLocked()
  }
}

/**
 * 创建增强版部署器
 */
export function createEnhancedDeployer(options?: { workDir?: string }): EnhancedDeployer {
  return new EnhancedDeployer(options)
}




