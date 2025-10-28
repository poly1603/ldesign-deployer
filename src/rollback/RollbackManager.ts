/**
 * 回滚管理器
 */

import { logger } from '../utils/logger.js'
import { VersionHistory } from './VersionHistory.js'
import { DeploymentManager } from '../kubernetes/DeploymentManager.js'
import { exec } from 'child_process'
import { promisify } from 'util'
import type { DeployConfig, DeployResult, RollbackConfig } from '../types/index.js'

const execAsync = promisify(exec)

export class RollbackManager {
  private versionHistory: VersionHistory
  private k8sManager: DeploymentManager

  constructor() {
    this.versionHistory = new VersionHistory()
    this.k8sManager = new DeploymentManager()
  }

  /**
   * 回滚到指定版本
   */
  async rollback(config: RollbackConfig): Promise<DeployResult> {
    logger.info(`⏪ Rolling back to version: ${config.version || 'previous'}`)

    try {
      // 获取目标版本
      const targetVersion = config.version
        ? await this.versionHistory.getVersion(config.version)
        : await this.versionHistory.getPreviousVersion()

      if (!targetVersion) {
        throw new Error('Target version not found in history')
      }

      logger.info(`Target version: ${targetVersion.version}`)

      // 执行回滚
      logger.info('Executing rollback...')

      // 根据平台执行不同的回滚策略
      switch (targetVersion.config.platform) {
        case 'docker':
          await this.rollbackDocker(targetVersion.config)
          break
        case 'kubernetes':
          await this.rollbackKubernetes(targetVersion.config, config.revision)
          break
        default:
          throw new Error(`Unsupported platform for rollback: ${targetVersion.config.platform}`)
      }

      // 记录回滚
      await this.versionHistory.recordRollback(targetVersion.version)

      logger.success('Rollback completed successfully')

      return {
        success: true,
        message: `Rolled back to version ${targetVersion.version}`,
        version: targetVersion.version,
        timestamp: new Date().toISOString(),
        environment: targetVersion.config.environment,
        platform: targetVersion.config.platform,
      }
    } catch (error: any) {
      logger.error('Rollback failed:', error.message)

      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
        environment: 'development',
        platform: 'docker',
      }
    }
  }

  /**
   * Docker 回滚
   */
  private async rollbackDocker(config: DeployConfig): Promise<void> {
    logger.info('Rolling back Docker deployment...')

    if (!config.docker?.image) {
      throw new Error('Docker image not specified in config')
    }

    const containerName = config.name
    const imageTag = config.docker.tag || config.version
    const fullImage = `${config.docker.registry ? config.docker.registry + '/' : ''}${config.docker.image}:${imageTag}`

    try {
      // 1. 停止当前容器
      logger.info(`Stopping current container: ${containerName}`)
      try {
        await execAsync(`docker stop ${containerName}`)
        await execAsync(`docker rm ${containerName}`)
      } catch {
        // 容器可能不存在，忽略错误
      }

      // 2. 拉取目标版本镜像
      logger.info(`Pulling image: ${fullImage}`)
      await execAsync(`docker pull ${fullImage}`)

      // 3. 启动新容器
      logger.info(`Starting container with image: ${fullImage}`)
      const port = config.docker.compose?.services?.[config.name]?.ports?.[0]?.split(':')[0] || '8080'
      await execAsync(`docker run -d --name ${containerName} -p ${port}:${port} ${fullImage}`)

      logger.success('Docker rollback completed')
    } catch (error: any) {
      logger.error('Docker rollback failed:', error.message)
      throw error
    }
  }

  /**
   * Kubernetes 回滚
   */
  private async rollbackKubernetes(config: DeployConfig, revision?: number): Promise<void> {
    logger.info('Rolling back Kubernetes deployment...')

    const args = ['rollout', 'undo', 'deployment', config.name]
    const namespace = config.kubernetes?.namespace || 'default'

    if (namespace) {
      args.push('-n', namespace)
    }

    if (revision) {
      args.push(`--to-revision=${revision}`)
    }

    try {
      // 1. 执行回滚
      const { stdout } = await execAsync(`kubectl ${args.join(' ')}`)
      logger.info(stdout)

      // 2. 等待回滚完成
      logger.info('Waiting for rollback to complete...')
      await this.k8sManager.monitorRollout(config.name, {
        namespace,
        timeout: 300,
      })

      // 3. 验证回滚后的健康状态
      const healthy = await this.k8sManager.checkPodHealth(config.name, { namespace })
      if (!healthy) {
        throw new Error('Rollback completed but pods are not healthy')
      }

      logger.success('Kubernetes rollback completed successfully')
    } catch (error: any) {
      logger.error('Kubernetes rollback failed:', error.message)
      throw error
    }
  }

  /**
   * 获取版本历史
   */
  getVersionHistory(): VersionHistory {
    return this.versionHistory
  }

  /**
   * 获取可用的回滚版本列表
   */
  async getAvailableVersions(): Promise<Array<{ version: string; timestamp: string; status: string }>> {
    const history = await this.versionHistory.getAll()
    return history
      .filter(h => h.status === 'success')
      .map(h => ({
        version: h.version,
        timestamp: h.timestamp,
        status: h.status,
      }))
  }

  /**
   * 预览回滚影响
   */
  async previewRollback(targetVersion?: string): Promise<{
    currentVersion?: string
    targetVersion?: string
    changes: string[]
    risks: string[]
  }> {
    const history = await this.versionHistory.getAll()
    const current = history.find(h => h.status === 'success')
    const target = targetVersion
      ? await this.versionHistory.getVersion(targetVersion)
      : await this.versionHistory.getPreviousVersion()

    const changes: string[] = []
    const risks: string[] = []

    if (current && target) {
      changes.push(`Version: ${current.version} → ${target.version}`)
      changes.push(`Timestamp: ${current.timestamp} → ${target.timestamp}`)

      // 分析风险
      if (target.config.platform !== current.config.platform) {
        risks.push('⚠️ Platform change detected')
      }

      if (target.config.environment !== current.config.environment) {
        risks.push('⚠️ Environment change detected')
      }
    }

    return {
      currentVersion: current?.version,
      targetVersion: target?.version,
      changes,
      risks,
    }
  }

  /**
   * 快速回滚（回滚到上一个版本）
   */
  async quickRollback(): Promise<DeployResult> {
    logger.info('⚡ Executing quick rollback...')
    return this.rollback({})
  }
}
