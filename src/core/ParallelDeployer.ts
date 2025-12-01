/**
 * 并行部署器
 * @module core/ParallelDeployer
 * 
 * @description 支持多环境并行部署
 */

// Deployer types used by EnhancedDeployer
import { EnhancedDeployer } from './EnhancedDeployer.js'
import { logger } from '../utils/logger.js'
import type { DeployConfig, DeployResult, Environment } from '../types/index.js'

/**
 * 并行部署选项
 */
export interface ParallelDeployOptions {
  /** 目标环境列表 */
  environments: Environment[]
  /** 部署配置 */
  config?: DeployConfig
  /** 配置文件路径 */
  configFile?: string
  /** 最大并发数 */
  concurrency?: number
  /** 是否在某个环境失败时停止 */
  stopOnFailure?: boolean
  /** 试运行模式 */
  dryRun?: boolean
  /** 进度回调 */
  onProgress?: (event: ParallelDeployProgress) => void
}

/**
 * 并行部署进度事件
 */
export interface ParallelDeployProgress {
  /** 环境 */
  environment: Environment
  /** 状态 */
  status: 'pending' | 'deploying' | 'success' | 'failed' | 'skipped'
  /** 进度百分比 */
  progress: number
  /** 消息 */
  message: string
}

/**
 * 并行部署结果
 */
export interface ParallelDeployResult {
  /** 总体是否成功 */
  success: boolean
  /** 各环境部署结果 */
  results: Map<Environment, DeployResult>
  /** 成功数 */
  successCount: number
  /** 失败数 */
  failedCount: number
  /** 跳过数 */
  skippedCount: number
  /** 总耗时 */
  totalDuration: number
}

/**
 * 并行部署器
 * 
 * @description 同时部署到多个环境，支持并发控制和失败处理
 * 
 * @example
 * ```typescript
 * const deployer = new ParallelDeployer();
 * 
 * const result = await deployer.deploy({
 *   environments: ['staging', 'production'],
 *   concurrency: 2,
 *   stopOnFailure: true
 * });
 * 
 * console.log(`成功: ${result.successCount}, 失败: ${result.failedCount}`);
 * ```
 */
export class ParallelDeployer {
  private deployers: Map<Environment, EnhancedDeployer> = new Map()

  /**
   * 并行部署
   */
  async deploy(options: ParallelDeployOptions): Promise<ParallelDeployResult> {
    const startTime = Date.now()
    const results = new Map<Environment, DeployResult>()
    const { environments, concurrency = 2, stopOnFailure = false } = options

    logger.info(`🚀 Starting parallel deployment to ${environments.length} environments`)
    logger.info(`   Environments: ${environments.join(', ')}`)
    logger.info(`   Concurrency: ${concurrency}`)

    // 初始化进度
    const progress = new Map<Environment, ParallelDeployProgress>()
    for (const env of environments) {
      progress.set(env, {
        environment: env,
        status: 'pending',
        progress: 0,
        message: 'Waiting...',
      })
    }

    // 分批执行
    const batches = this.chunk(environments, concurrency)
    let shouldStop = false
    let skippedCount = 0

    for (const batch of batches) {
      if (shouldStop) {
        // 标记剩余为跳过
        for (const env of batch) {
          progress.set(env, {
            environment: env,
            status: 'skipped',
            progress: 100,
            message: 'Skipped due to previous failure',
          })
          skippedCount++
          this.notifyProgress(options.onProgress, progress.get(env)!)
        }
        continue
      }

      // 并行部署当前批次
      const batchPromises = batch.map(async (env) => {
        progress.set(env, {
          environment: env,
          status: 'deploying',
          progress: 10,
          message: 'Starting deployment...',
        })
        this.notifyProgress(options.onProgress, progress.get(env)!)

        try {
          const deployer = this.getDeployer(env)

          // 监听进度
          deployer.onProgress((event) => {
            progress.set(env, {
              environment: env,
              status: 'deploying',
              progress: event.progress,
              message: event.message,
            })
            this.notifyProgress(options.onProgress, progress.get(env)!)
          })

          const result = await deployer.deploy({
            ...options,
            environment: env,
          })

          results.set(env, result)

          progress.set(env, {
            environment: env,
            status: result.success ? 'success' : 'failed',
            progress: 100,
            message: result.success ? 'Deployment successful' : result.message,
          })
          this.notifyProgress(options.onProgress, progress.get(env)!)

          if (!result.success && stopOnFailure) {
            shouldStop = true
          }

          return result
        } catch (error: any) {
          const failResult: DeployResult = {
            success: false,
            message: error.message,
            timestamp: new Date().toISOString(),
            environment: env,
            platform: 'docker',
          }
          results.set(env, failResult)

          progress.set(env, {
            environment: env,
            status: 'failed',
            progress: 100,
            message: error.message,
          })
          this.notifyProgress(options.onProgress, progress.get(env)!)

          if (stopOnFailure) {
            shouldStop = true
          }

          return failResult
        }
      })

      await Promise.all(batchPromises)
    }

    // 计算统计
    let successCount = 0
    let failedCount = 0

    for (const result of results.values()) {
      if (result.success) {
        successCount++
      } else {
        failedCount++
      }
    }

    const totalDuration = Date.now() - startTime

    // 输出汇总
    logger.info('')
    logger.info('📊 Parallel Deployment Summary')
    logger.info('━'.repeat(40))
    logger.info(`✅ Success: ${successCount}`)
    logger.info(`❌ Failed: ${failedCount}`)
    logger.info(`⏭️  Skipped: ${skippedCount}`)
    logger.info(`⏱️  Total time: ${(totalDuration / 1000).toFixed(2)}s`)

    return {
      success: failedCount === 0 && skippedCount === 0,
      results,
      successCount,
      failedCount,
      skippedCount,
      totalDuration,
    }
  }

  /**
   * 顺序部署（先测试环境，后生产环境）
   */
  async deploySequential(options: {
    stages: Environment[][]
    config?: DeployConfig
    configFile?: string
    stopOnFailure?: boolean
    onProgress?: (event: ParallelDeployProgress) => void
  }): Promise<ParallelDeployResult> {
    const startTime = Date.now()
    const results = new Map<Environment, DeployResult>()
    const { stages, stopOnFailure = true } = options

    logger.info(`🚀 Starting sequential deployment with ${stages.length} stages`)

    let shouldStop = false
    let skippedCount = 0

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i]
      logger.info(`\n📍 Stage ${i + 1}/${stages.length}: ${stage.join(', ')}`)

      if (shouldStop) {
        skippedCount += stage.length
        continue
      }

      // 并行部署当前阶段的所有环境
      const stageResult = await this.deploy({
        environments: stage,
        config: options.config,
        configFile: options.configFile,
        concurrency: stage.length,
        stopOnFailure,
        onProgress: options.onProgress,
      })

      // 合并结果
      for (const [env, result] of stageResult.results) {
        results.set(env, result)
      }

      if (!stageResult.success && stopOnFailure) {
        shouldStop = true
      }
    }

    // 计算统计
    let successCount = 0
    let failedCount = 0

    for (const result of results.values()) {
      if (result.success) {
        successCount++
      } else {
        failedCount++
      }
    }

    return {
      success: failedCount === 0 && skippedCount === 0,
      results,
      successCount,
      failedCount,
      skippedCount,
      totalDuration: Date.now() - startTime,
    }
  }

  /**
   * 获取或创建部署器
   */
  private getDeployer(environment: Environment): EnhancedDeployer {
    if (!this.deployers.has(environment)) {
      this.deployers.set(environment, new EnhancedDeployer())
    }
    return this.deployers.get(environment)!
  }

  /**
   * 分块
   */
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * 通知进度
   */
  private notifyProgress(
    callback: ((event: ParallelDeployProgress) => void) | undefined,
    event: ParallelDeployProgress
  ): void {
    if (callback) {
      callback(event)
    }
  }
}
