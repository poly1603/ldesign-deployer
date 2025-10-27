/**
 * 增强版部署器
 * @module core/EnhancedDeployer
 * 
 * @description 集成所有高级功能的部署器，包括前置检查、部署锁、进度追踪、审计日志等
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

/**
 * 增强版部署选项接口
 */
export interface EnhancedDeployOptions extends DeployOptions {
  /** 跳过部署前置检查 */
  skipPreCheck?: boolean
  /** 锁获取超时时间（毫秒） */
  lockTimeout?: number
  /** 部署超时时间（毫秒） */
  deploymentTimeout?: number
  /** 启用审计日志 */
  enableAudit?: boolean
  /** 启用进度追踪 */
  enableProgress?: boolean
  /** 失败时自动重试 */
  retryOnFailure?: boolean
}

/**
 * 增强版部署器类
 * 
 * @description 继承自基础部署器，增加了前置检查、并发控制、进度追踪、审计日志等高级功能
 * 
 * @example
 * ```typescript
 * const deployer = new EnhancedDeployer();
 * 
 * // 监听部署进度
 * deployer.onProgress((event) => {
 *   console.log(`[${event.progress}%] ${event.message}`);
 * });
 * 
 * // 执行部署
 * const result = await deployer.deploy({
 *   environment: 'production',
 *   enableAudit: true,
 *   enableProgress: true,
 *   retryOnFailure: true
 * });
 * ```
 */
export class EnhancedDeployer extends Deployer {
  private preChecker: PreDeploymentChecker
  private progressTracker: ProgressTracker
  private auditLogger: AuditLogger
  private lockId?: string

  /**
   * 创建增强版部署器实例
   * 
   * @param options - 构造选项
   * @param options.workDir - 工作目录，默认为当前目录
   */
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
   * 
   * @param options - 增强版部署选项
   * @returns 部署结果
   * 
   * @description 执行完整的部署流程，包括：
   * 1. 获取部署锁
   * 2. 加载配置
   * 3. 前置检查
   * 4. 执行部署（支持超时和重试）
   * 5. 记录审计日志
   * 
   * @throws {DeploymentError} 当部署失败时抛出
   * @throws {LockError} 当无法获取部署锁时抛出
   * @throws {TimeoutError} 当部署超时时抛出
   * 
   * @example
   * ```typescript
   * const result = await deployer.deploy({
   *   environment: 'production',
   *   deploymentTimeout: 600000, // 10 分钟
   *   retryOnFailure: true,
   *   enableAudit: true,
   *   enableProgress: true
   * });
   * ```
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
   * 
   * @returns 进度追踪器实例
   */
  getProgressTracker(): ProgressTracker {
    return this.progressTracker
  }

  /**
   * 获取审计日志器
   * 
   * @returns 审计日志器实例
   */
  getAuditLogger(): AuditLogger {
    return this.auditLogger
  }

  /**
   * 获取前置检查器
   * 
   * @returns 前置检查器实例
   */
  getPreChecker(): PreDeploymentChecker {
    return this.preChecker
  }

  /**
   * 注册清理处理器
   * 
   * @private
   * @description 注册优雅退出时的资源清理函数
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
   * 
   * @param callback - 进度事件回调函数
   * 
   * @example
   * ```typescript
   * deployer.onProgress((event) => {
   *   console.log(`进度: ${event.progress}%`);
   *   console.log(`阶段: ${event.phase}`);
   *   console.log(`消息: ${event.message}`);
   * });
   * ```
   */
  onProgress(callback: (event: any) => void): void {
    this.progressTracker.on(callback)
  }

  /**
   * 强制释放部署锁
   * 
   * @description ⚠️ 仅在调试或异常情况下使用，可能导致部署冲突
   * 
   * @example
   * ```typescript
   * await deployer.forceReleaseLock();
   * ```
   */
  async forceReleaseLock(): Promise<void> {
    await DeploymentLock.forceRelease()
    logger.warn('Deployment lock forcefully released')
  }

  /**
   * 检查是否有部署正在进行
   * 
   * @returns 如果有部署正在进行则返回 true
   * 
   * @example
   * ```typescript
   * const inProgress = await deployer.isDeploymentInProgress();
   * if (inProgress) {
   *   console.log('已有部署正在进行中');
   * }
   * ```
   */
  async isDeploymentInProgress(): Promise<boolean> {
    return DeploymentLock.isLocked()
  }
}

/**
 * 创建增强版部署器
 * 
 * @param options - 配置选项
 * @param options.workDir - 工作目录
 * @returns 增强版部署器实例
 * 
 * @example
 * ```typescript
 * const deployer = createEnhancedDeployer({
 *   workDir: '/path/to/project'
 * });
 * ```
 */
export function createEnhancedDeployer(options?: { workDir?: string }): EnhancedDeployer {
  return new EnhancedDeployer(options)
}




