/**
 * GCP Cloud Run 部署器
 * @module cloud/CloudRunDeployer
 * 
 * @description 部署应用到 Google Cloud Run
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { logger } from '../utils/logger.js'
import type {
  CloudRunDeployConfig,
  CloudDeployResult,
} from './types.js'

const execAsync = promisify(exec)

/**
 * GCP Cloud Run 部署器
 * 
 * @description 使用 gcloud CLI 部署容器到 Cloud Run
 * 
 * @example
 * ```typescript
 * const deployer = new CloudRunDeployer({
 *   credentials: {
 *     projectId: 'my-project',
 *     keyFilePath: '/path/to/service-account.json'
 *   },
 *   serviceName: 'my-service',
 *   region: 'us-central1',
 *   image: 'gcr.io/my-project/my-app:v1.0.0'
 * });
 * 
 * const result = await deployer.deploy();
 * console.log(`Service URL: ${result.serviceUrl}`);
 * ```
 */
export class CloudRunDeployer {
  private config: CloudRunDeployConfig
  private tempKeyFile?: string

  constructor(config: CloudRunDeployConfig) {
    this.config = {
      port: 8080,
      allowUnauthenticated: true,
      minInstances: 0,
      maxInstances: 100,
      concurrency: 80,
      timeout: 300,
      ...config,
    }
  }

  /**
   * 执行部署
   */
  async deploy(): Promise<CloudDeployResult> {
    const startTime = Date.now()

    try {
      logger.info('🚀 Starting Google Cloud Run deployment...')
      logger.info(`   Service: ${this.config.serviceName}`)
      logger.info(`   Region: ${this.config.region}`)
      logger.info(`   Image: ${this.config.image}`)

      // 1. 设置认证
      await this.setupAuth()

      // 2. 部署服务
      logger.info('🔄 Deploying to Cloud Run...')
      const serviceUrl = await this.deployService()

      // 3. 设置 IAM 策略（如果需要公开访问）
      if (this.config.allowUnauthenticated) {
        logger.info('🔓 Setting IAM policy for unauthenticated access...')
        await this.setIAMPolicy()
      }

      const duration = Date.now() - startTime
      logger.success(`✅ Cloud Run deployment completed in ${(duration / 1000).toFixed(2)}s`)
      logger.info(`   Service URL: ${serviceUrl}`)

      return {
        success: true,
        message: 'Cloud Run deployment successful',
        serviceUrl,
        duration,
        timestamp: new Date().toISOString(),
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      logger.error(`❌ Cloud Run deployment failed: ${error.message}`)

      return {
        success: false,
        message: error.message,
        duration,
        timestamp: new Date().toISOString(),
      }
    } finally {
      // 清理临时密钥文件
      await this.cleanup()
    }
  }

  /**
   * 获取服务信息
   */
  async getServiceInfo(): Promise<{
    url: string
    status: string
    latestRevision: string
  } | null> {
    try {
      await this.setupAuth()

      const { stdout } = await execAsync(
        `gcloud run services describe ${this.config.serviceName} ` +
        `--region=${this.config.region} ` +
        `--format=json`
      )

      const service = JSON.parse(stdout)

      return {
        url: service.status?.url || '',
        status: service.status?.conditions?.[0]?.type || 'Unknown',
        latestRevision: service.status?.latestReadyRevisionName || '',
      }
    } catch {
      return null
    }
  }

  /**
   * 删除服务
   */
  async deleteService(): Promise<void> {
    await this.setupAuth()

    await execAsync(
      `gcloud run services delete ${this.config.serviceName} ` +
      `--region=${this.config.region} ` +
      `--quiet`
    )

    logger.info(`🗑️ Deleted Cloud Run service: ${this.config.serviceName}`)
  }

  /**
   * 设置认证
   */
  private async setupAuth(): Promise<void> {
    const { credentials } = this.config

    // 设置项目
    await execAsync(`gcloud config set project ${credentials.projectId}`)

    // 设置服务账号认证
    if (credentials.keyFilePath) {
      await execAsync(`gcloud auth activate-service-account --key-file=${credentials.keyFilePath}`)
    } else if (credentials.keyFileContent) {
      // 写入临时文件
      this.tempKeyFile = join(process.cwd(), `.gcloud-key-${Date.now()}.json`)
      await writeFile(this.tempKeyFile, credentials.keyFileContent)
      await execAsync(`gcloud auth activate-service-account --key-file=${this.tempKeyFile}`)
    }
  }

  /**
   * 部署服务
   */
  private async deployService(): Promise<string> {
    const args: string[] = [
      'gcloud run deploy',
      this.config.serviceName,
      `--image=${this.config.image}`,
      `--region=${this.config.region}`,
      `--platform=managed`,
      `--port=${this.config.port}`,
      `--min-instances=${this.config.minInstances}`,
      `--max-instances=${this.config.maxInstances}`,
      `--concurrency=${this.config.concurrency}`,
      `--timeout=${this.config.timeout}s`,
      '--quiet',
    ]

    // CPU
    if (this.config.cpu) {
      args.push(`--cpu=${this.config.cpu}`)
    }

    // 内存
    if (this.config.memory) {
      args.push(`--memory=${this.config.memory}`)
    }

    // 服务账号
    if (this.config.serviceAccount) {
      args.push(`--service-account=${this.config.serviceAccount}`)
    }

    // VPC 连接器
    if (this.config.vpcConnector) {
      args.push(`--vpc-connector=${this.config.vpcConnector}`)
    }

    // 环境变量
    if (this.config.env && Object.keys(this.config.env).length > 0) {
      const envStr = Object.entries(this.config.env)
        .map(([k, v]) => `${k}=${v}`)
        .join(',')
      args.push(`--set-env-vars=${envStr}`)
    }

    // 密钥
    if (this.config.secrets && this.config.secrets.length > 0) {
      const secretStr = this.config.secrets
        .map(s => `${s.name}=${s.secretName}:${s.version || 'latest'}`)
        .join(',')
      args.push(`--set-secrets=${secretStr}`)
    }

    // 标签
    if (this.config.labels && Object.keys(this.config.labels).length > 0) {
      const labelStr = Object.entries(this.config.labels)
        .map(([k, v]) => `${k}=${v}`)
        .join(',')
      args.push(`--labels=${labelStr}`)
    }

    const command = args.join(' ')
    const { stdout, stderr } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 })

    // 从输出中提取服务 URL
    const urlMatch = stdout.match(/Service URL: (https:\/\/[^\s]+)/) ||
      stderr.match(/Service URL: (https:\/\/[^\s]+)/)

    if (urlMatch) {
      return urlMatch[1]
    }

    // 如果没有匹配到，尝试获取服务信息
    const info = await this.getServiceInfo()
    return info?.url || ''
  }

  /**
   * 设置 IAM 策略以允许未经身份验证的访问
   */
  private async setIAMPolicy(): Promise<void> {
    await execAsync(
      `gcloud run services add-iam-policy-binding ${this.config.serviceName} ` +
      `--region=${this.config.region} ` +
      `--member=allUsers ` +
      `--role=roles/run.invoker ` +
      `--quiet`
    )
  }

  /**
   * 清理临时文件
   */
  private async cleanup(): Promise<void> {
    if (this.tempKeyFile) {
      try {
        await unlink(this.tempKeyFile)
      } catch {
        // 忽略删除失败
      }
      this.tempKeyFile = undefined
    }
  }
}
