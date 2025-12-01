/**
 * AWS ECS 部署器
 * @module cloud/ECSDeployer
 * 
 * @description 部署应用到 AWS ECS (Elastic Container Service)
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from '../utils/logger.js'
import type {
  ECSDeployConfig,
  CloudDeployResult,
  ECSTaskDefinition,
} from './types.js'

const execAsync = promisify(exec)

/**
 * AWS ECS 部署器
 * 
 * @description 使用 AWS CLI 部署容器到 ECS
 * 
 * @example
 * ```typescript
 * const deployer = new ECSDeployer({
 *   credentials: {
 *     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
 *     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
 *     region: 'us-east-1'
 *   },
 *   cluster: 'my-cluster',
 *   service: 'my-service'
 * });
 * 
 * await deployer.deploy({
 *   image: 'my-registry/my-app:v1.0.0'
 * });
 * ```
 */
export class ECSDeployer {
  private config: ECSDeployConfig

  constructor(config: ECSDeployConfig) {
    this.config = {
      waitForStability: true,
      waitTimeout: 300,
      ...config,
    }
  }

  /**
   * 执行部署
   */
  async deploy(options: {
    image?: string
    taskDefinition?: ECSTaskDefinition
  } = {}): Promise<CloudDeployResult> {
    const startTime = Date.now()

    try {
      logger.info('🚀 Starting AWS ECS deployment...')
      logger.info(`   Cluster: ${this.config.cluster}`)
      logger.info(`   Service: ${this.config.service}`)

      // 设置 AWS 环境变量
      this.setAWSEnv()

      // 1. 如果提供了新的镜像，注册新的任务定义
      let taskDefinitionArn: string | undefined

      if (options.image || options.taskDefinition) {
        logger.info('📝 Registering new task definition...')
        taskDefinitionArn = await this.registerTaskDefinition(
          options.taskDefinition,
          options.image
        )
        logger.info(`   Task definition: ${taskDefinitionArn}`)
      }

      // 2. 更新服务
      logger.info('🔄 Updating ECS service...')
      await this.updateService(taskDefinitionArn)

      // 3. 等待服务稳定
      if (this.config.waitForStability) {
        logger.info('⏳ Waiting for service stability...')
        await this.waitForStability()
      }

      const duration = Date.now() - startTime
      logger.success(`✅ ECS deployment completed in ${(duration / 1000).toFixed(2)}s`)

      return {
        success: true,
        message: 'ECS deployment successful',
        deploymentId: taskDefinitionArn,
        duration,
        timestamp: new Date().toISOString(),
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      logger.error(`❌ ECS deployment failed: ${error.message}`)

      return {
        success: false,
        message: error.message,
        duration,
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * 获取当前任务定义
   */
  async getCurrentTaskDefinition(): Promise<ECSTaskDefinition | null> {
    try {
      this.setAWSEnv()

      const { stdout } = await execAsync(
        `aws ecs describe-services --cluster ${this.config.cluster} --services ${this.config.service} --output json`
      )

      const result = JSON.parse(stdout)
      const service = result.services?.[0]

      if (!service?.taskDefinition) {
        return null
      }

      const { stdout: taskDefOutput } = await execAsync(
        `aws ecs describe-task-definition --task-definition ${service.taskDefinition} --output json`
      )

      return JSON.parse(taskDefOutput).taskDefinition
    } catch {
      return null
    }
  }

  /**
   * 获取服务状态
   */
  async getServiceStatus(): Promise<{
    status: string
    runningCount: number
    desiredCount: number
    deployments: any[]
  }> {
    this.setAWSEnv()

    const { stdout } = await execAsync(
      `aws ecs describe-services --cluster ${this.config.cluster} --services ${this.config.service} --output json`
    )

    const result = JSON.parse(stdout)
    const service = result.services?.[0]

    return {
      status: service?.status || 'UNKNOWN',
      runningCount: service?.runningCount || 0,
      desiredCount: service?.desiredCount || 0,
      deployments: service?.deployments || [],
    }
  }

  /**
   * 注册新的任务定义
   */
  private async registerTaskDefinition(
    taskDef?: ECSTaskDefinition,
    newImage?: string
  ): Promise<string> {
    // 获取当前任务定义
    const current = await this.getCurrentTaskDefinition()

    if (!current && !taskDef) {
      throw new Error('No existing task definition found and no new task definition provided')
    }

    // 合并任务定义
    const finalTaskDef = taskDef || current!

    // 如果提供了新镜像，更新容器定义中的镜像
    if (newImage && finalTaskDef.containerDefinitions) {
      finalTaskDef.containerDefinitions = finalTaskDef.containerDefinitions.map(
        (container, index) => {
          if (index === 0) { // 假设主容器是第一个
            return { ...container, image: newImage }
          }
          return container
        }
      )
    }

    // 注册任务定义
    const taskDefJson = JSON.stringify(finalTaskDef)
    const { stdout } = await execAsync(
      `aws ecs register-task-definition --cli-input-json '${taskDefJson}' --output json`
    )

    const result = JSON.parse(stdout)
    return result.taskDefinition.taskDefinitionArn
  }

  /**
   * 更新服务
   */
  private async updateService(taskDefinitionArn?: string): Promise<void> {
    const args: string[] = [
      `--cluster ${this.config.cluster}`,
      `--service ${this.config.service}`,
    ]

    if (taskDefinitionArn) {
      args.push(`--task-definition ${taskDefinitionArn}`)
    }

    if (this.config.desiredCount !== undefined) {
      args.push(`--desired-count ${this.config.desiredCount}`)
    }

    if (this.config.deploymentConfiguration) {
      const { maximumPercent, minimumHealthyPercent } = this.config.deploymentConfiguration
      if (maximumPercent !== undefined || minimumHealthyPercent !== undefined) {
        const depConfig = {
          maximumPercent: maximumPercent ?? 200,
          minimumHealthyPercent: minimumHealthyPercent ?? 100,
        }
        args.push(`--deployment-configuration '${JSON.stringify(depConfig)}'`)
      }
    }

    args.push('--force-new-deployment')

    await execAsync(`aws ecs update-service ${args.join(' ')} --output json`)
  }

  /**
   * 等待服务稳定
   */
  private async waitForStability(): Promise<void> {
    const timeout = this.config.waitTimeout || 300

    await execAsync(
      `aws ecs wait services-stable --cluster ${this.config.cluster} --services ${this.config.service}`,
      { timeout: timeout * 1000 }
    )
  }

  /**
   * 设置 AWS 环境变量
   */
  private setAWSEnv(): void {
    process.env.AWS_ACCESS_KEY_ID = this.config.credentials.accessKeyId
    process.env.AWS_SECRET_ACCESS_KEY = this.config.credentials.secretAccessKey
    process.env.AWS_DEFAULT_REGION = this.config.credentials.region

    if (this.config.credentials.sessionToken) {
      process.env.AWS_SESSION_TOKEN = this.config.credentials.sessionToken
    }
  }
}
