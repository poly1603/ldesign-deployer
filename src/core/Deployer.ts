/**
 * 主部署器
 */

import { ConfigManager } from './ConfigManager.js'
import { VersionManager } from './VersionManager.js'
import { HealthChecker } from './HealthChecker.js'
import { DockerfileGenerator, ImageBuilder, ComposeGenerator } from '../docker/index.js'
import { logger, createLogger } from '../utils/logger.js'
import { writeFile } from '../utils/file-system.js'
import type { DeployConfig, DeployResult, Environment, HookConfig } from '../types/index.js'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface DeployOptions {
  config?: DeployConfig
  configFile?: string
  environment?: Environment
  dryRun?: boolean
  skipHealthCheck?: boolean
  skipHooks?: boolean
}

export class Deployer {
  private configManager: ConfigManager
  private versionManager: VersionManager
  private healthChecker: HealthChecker
  private dockerfileGenerator: DockerfileGenerator
  private imageBuilder: ImageBuilder
  private composeGenerator: ComposeGenerator
  private deployLogger = createLogger('Deployer')

  constructor(options: { workDir?: string } = {}) {
    this.configManager = new ConfigManager({ workDir: options.workDir })
    this.versionManager = new VersionManager({ workDir: options.workDir })
    this.healthChecker = new HealthChecker()
    this.dockerfileGenerator = new DockerfileGenerator()
    this.imageBuilder = new ImageBuilder()
    this.composeGenerator = new ComposeGenerator()
  }

  /**
   * 执行部署
   */
  async deploy(options: DeployOptions = {}): Promise<DeployResult> {
    const startTime = Date.now()
    this.deployLogger.info('🚀 Starting deployment...')

    try {
      // 加载配置
      const config = await this.loadConfig(options)
      this.deployLogger.info(`Environment: ${config.environment}`)
      this.deployLogger.info(`Platform: ${config.platform}`)

      // Dry run 检查
      if (options.dryRun) {
        this.deployLogger.info('🔍 Dry run mode - no actual deployment will be performed')
      }

      // 执行 pre-deploy 钩子
      if (!options.skipHooks) {
        await this.runHooks(config.hooks?.preDeploy, 'pre-deploy')
      }

      // 根据平台执行部署
      let result: DeployResult

      switch (config.platform) {
        case 'docker':
          result = await this.deployDocker(config, options)
          break
        case 'docker-compose':
          result = await this.deployDockerCompose(config, options)
          break
        case 'kubernetes':
          result = await this.deployKubernetes(config, options)
          break
        default:
          throw new Error(`Unsupported platform: ${config.platform}`)
      }

      // 健康检查
      if (!options.skipHealthCheck && config.healthCheck?.enabled) {
        await this.performHealthCheck(config)
      }

      // 执行 post-deploy 钩子
      if (!options.skipHooks) {
        await this.runHooks(config.hooks?.postDeploy, 'post-deploy')
      }

      const duration = Date.now() - startTime
      this.deployLogger.success(`✅ Deployment completed in ${(duration / 1000).toFixed(2)}s`)

      return result
    } catch (error: any) {
      const duration = Date.now() - startTime
      this.deployLogger.error(`❌ Deployment failed after ${(duration / 1000).toFixed(2)}s`)
      this.deployLogger.error(error.message)

      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
        environment: options.environment || 'development',
        platform: 'docker',
      }
    }
  }

  /**
   * Docker 部署
   */
  private async deployDocker(config: DeployConfig, options: DeployOptions): Promise<DeployResult> {
    this.deployLogger.info('🐳 Deploying with Docker...')

    // 生成 Dockerfile
    if (!config.docker?.dockerfile) {
      this.deployLogger.info('Generating Dockerfile...')
      const dockerfile = this.dockerfileGenerator.generate({
        projectType: config.projectType,
        nodeVersion: '20',
        port: config.healthCheck?.port || 3000,
        multiStage: config.docker?.multiStage !== false,
        optimize: true,
      })

      if (!options.dryRun) {
        await writeFile('Dockerfile', dockerfile)
        this.deployLogger.success('Dockerfile generated')
      }
    }

    // 构建镜像
    if (!options.dryRun) {
      const image = config.docker?.image || config.name
      const tag = config.docker?.tag || config.version

      await this.imageBuilder.build({
        context: '.',
        tag: `${image}:${tag}`,
        buildArgs: config.docker?.buildArgs,
        cache: config.docker?.cache !== false,
      })

      // 推送镜像（如果配置了 registry）
      if (config.docker?.registry) {
        await this.imageBuilder.push({
          image,
          tag,
          registry: config.docker.registry,
        })
      }
    }

    return {
      success: true,
      message: 'Docker deployment completed',
      version: config.version,
      timestamp: new Date().toISOString(),
      environment: config.environment,
      platform: 'docker',
    }
  }

  /**
   * Docker Compose 部署
   */
  private async deployDockerCompose(config: DeployConfig, options: DeployOptions): Promise<DeployResult> {
    this.deployLogger.info('🐳 Deploying with Docker Compose...')

    // 生成 docker-compose.yml
    if (config.docker?.compose) {
      this.deployLogger.info('Generating docker-compose.yml...')
      const compose = this.composeGenerator.generate(config.docker.compose)

      if (!options.dryRun) {
        await writeFile('docker-compose.yml', compose)
        this.deployLogger.success('docker-compose.yml generated')
      }
    }

    // 启动服务
    if (!options.dryRun) {
      this.deployLogger.info('Starting Docker Compose services...')
      await execAsync('docker-compose up -d')
      this.deployLogger.success('Services started')
    }

    return {
      success: true,
      message: 'Docker Compose deployment completed',
      version: config.version,
      timestamp: new Date().toISOString(),
      environment: config.environment,
      platform: 'docker-compose',
    }
  }

  /**
   * Kubernetes 部署
   */
  private async deployKubernetes(config: DeployConfig, options: DeployOptions): Promise<DeployResult> {
    this.deployLogger.info('☸️  Deploying to Kubernetes...')

    // K8s 部署将在后续实现
    this.deployLogger.warn('Kubernetes deployment not yet implemented')

    return {
      success: true,
      message: 'Kubernetes deployment placeholder',
      version: config.version,
      timestamp: new Date().toISOString(),
      environment: config.environment,
      platform: 'kubernetes',
    }
  }

  /**
   * 加载配置
   */
  private async loadConfig(options: DeployOptions): Promise<DeployConfig> {
    if (options.config) {
      return options.config
    }

    if (options.configFile) {
      this.configManager = new ConfigManager({ configFile: options.configFile })
    }

    return this.configManager.loadConfig()
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(config: DeployConfig): Promise<void> {
    if (!config.healthCheck) return

    this.deployLogger.info('🏥 Performing health check...')

    const result = await this.healthChecker.check(config.healthCheck)

    if (result.healthy) {
      this.deployLogger.success(`Health check passed (${result.duration}ms)`)
    } else {
      throw new Error(`Health check failed: ${result.message}`)
    }
  }

  /**
   * 执行钩子脚本
   */
  private async runHooks(hooks: string[] | undefined, type: string): Promise<void> {
    if (!hooks || hooks.length === 0) return

    this.deployLogger.info(`Running ${type} hooks...`)

    for (const hook of hooks) {
      this.deployLogger.debug(`Executing: ${hook}`)
      try {
        const { stdout, stderr } = await execAsync(hook)
        if (stdout) this.deployLogger.debug(stdout)
        if (stderr) this.deployLogger.warn(stderr)
      } catch (error: any) {
        this.deployLogger.error(`Hook failed: ${hook}`)
        throw error
      }
    }

    this.deployLogger.success(`${type} hooks completed`)
  }

  /**
   * 回滚部署
   */
  async rollback(version: string): Promise<DeployResult> {
    this.deployLogger.info(`⏪ Rolling back to version: ${version}`)

    // 回滚实现将在后续完成
    this.deployLogger.warn('Rollback not yet implemented')

    return {
      success: false,
      message: 'Rollback not implemented',
      version,
      timestamp: new Date().toISOString(),
      environment: 'development',
      platform: 'docker',
    }
  }

  /**
   * 获取配置管理器
   */
  getConfigManager(): ConfigManager {
    return this.configManager
  }

  /**
   * 获取版本管理器
   */
  getVersionManager(): VersionManager {
    return this.versionManager
  }

  /**
   * 获取健康检查器
   */
  getHealthChecker(): HealthChecker {
    return this.healthChecker
  }
}




