/**
 * SSH 部署器
 * @module ssh/SSHDeployer
 * 
 * @description 提供完整的 SSH 部署功能，支持版本管理、回滚、共享目录等
 */

import { SSHClient } from './SSHClient.js'
import { SFTPClient } from './SFTPClient.js'
import { logger } from '../utils/logger.js'
import type {
  SSHDeployConfig,
  SSHDeployResult,
  SSHExecResult,
} from './types.js'

/**
 * SSH 部署器类
 * 
 * @description 实现 Capistrano 风格的部署流程
 * 
 * 目录结构:
 * ```
 * /var/www/app/
 * ├── current -> releases/20231201120000
 * ├── releases/
 * │   ├── 20231201120000/
 * │   ├── 20231201100000/
 * │   └── ...
 * ├── shared/
 * │   ├── logs/
 * │   ├── uploads/
 * │   └── .env
 * └── repo/
 * ```
 * 
 * @example
 * ```typescript
 * const deployer = new SSHDeployer({
 *   connection: {
 *     host: 'server.example.com',
 *     username: 'deploy',
 *     privateKeyPath: '~/.ssh/id_rsa'
 *   },
 *   deployPath: '/var/www/app',
 *   keepReleases: 5,
 *   sharedDirs: ['logs', 'uploads'],
 *   sharedFiles: ['.env']
 * });
 * 
 * const result = await deployer.deploy('./dist', '1.0.0');
 * ```
 */
export class SSHDeployer {
  private config: SSHDeployConfig
  private ssh: SSHClient
  private sftp: SFTPClient

  /**
   * 创建 SSH 部署器
   * 
   * @param config - SSH 部署配置
   */
  constructor(config: SSHDeployConfig) {
    this.config = {
      currentLink: 'current',
      keepReleases: 5,
      sharedDirs: [],
      sharedFiles: [],
      backup: true,
      ...config,
    }

    this.ssh = new SSHClient(config.connection)
    this.sftp = new SFTPClient(config.connection)
  }

  /**
   * 执行部署
   * 
   * @param localPath - 本地源目录
   * @param version - 版本号
   * @returns 部署结果
   */
  async deploy(localPath: string, version: string): Promise<SSHDeployResult> {
    const startTime = Date.now()
    const releaseId = this.generateReleaseId()
    const releasePath = `${this.config.deployPath}/releases/${releaseId}`

    logger.info(`🚀 Starting SSH deployment: ${version}`)
    logger.info(`   Release ID: ${releaseId}`)
    logger.info(`   Target: ${this.config.connection.host}:${this.config.deployPath}`)

    try {
      // 1. 连接服务器
      logger.info('📡 Connecting to server...')
      await this.ssh.connect()

      // 2. 执行前置钩子
      if (this.config.beforeDeploy?.length) {
        logger.info('⚙️  Running before deploy hooks...')
        await this.runHooks(this.config.beforeDeploy)
      }

      // 3. 准备目录结构
      logger.info('📁 Preparing directory structure...')
      await this.prepareDirectories(releasePath)

      // 4. 上传文件
      logger.info('📤 Uploading files...')
      const uploadResult = await this.sftp.upload({
        localPath,
        remotePath: releasePath,
        recursive: true,
        exclude: ['node_modules', '.git', '*.log'],
      })

      // 5. 创建共享目录链接
      logger.info('🔗 Linking shared directories and files...')
      await this.linkShared(releasePath)

      // 6. 备份当前版本
      if (this.config.backup) {
        logger.info('💾 Backing up current version...')
        await this.backupCurrent()
      }

      // 7. 切换到新版本
      logger.info('🔄 Switching to new release...')
      await this.switchToRelease(releasePath)

      // 8. 执行后置钩子
      if (this.config.afterDeploy?.length) {
        logger.info('⚙️  Running after deploy hooks...')
        await this.runHooks(this.config.afterDeploy, releasePath)
      }

      // 9. 清理旧版本
      logger.info('🧹 Cleaning old releases...')
      await this.cleanOldReleases()

      const duration = Date.now() - startTime
      logger.success(`✅ Deployment completed in ${(duration / 1000).toFixed(2)}s`)

      return {
        success: true,
        message: 'Deployment successful',
        version,
        deployPath: releasePath,
        timestamp: new Date().toISOString(),
        duration,
        filesTransferred: uploadResult.filesTransferred,
        bytesTransferred: uploadResult.bytesTransferred,
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      logger.error(`❌ Deployment failed: ${error.message}`)

      return {
        success: false,
        message: error.message,
        version,
        deployPath: releasePath,
        timestamp: new Date().toISOString(),
        duration,
        filesTransferred: 0,
        bytesTransferred: 0,
      }
    } finally {
      await this.ssh.disconnect()
    }
  }

  /**
   * 回滚到上一个版本
   * 
   * @returns 回滚结果
   */
  async rollback(): Promise<SSHDeployResult> {
    const startTime = Date.now()

    logger.info('⏪ Starting rollback...')

    try {
      await this.ssh.connect()

      // 获取版本列表
      const releases = await this.getReleases()

      if (releases.length < 2) {
        throw new Error('No previous release to rollback to')
      }

      // 当前版本和上一个版本
      const current = releases[0]
      const previous = releases[1]

      logger.info(`   Current: ${current}`)
      logger.info(`   Rollback to: ${previous}`)

      // 切换到上一个版本
      const previousPath = `${this.config.deployPath}/releases/${previous}`
      await this.switchToRelease(previousPath)

      // 可选：删除失败的版本
      // await this.ssh.rm(`${this.config.deployPath}/releases/${current}`, true)

      const duration = Date.now() - startTime
      logger.success(`✅ Rollback completed in ${(duration / 1000).toFixed(2)}s`)

      return {
        success: true,
        message: `Rolled back from ${current} to ${previous}`,
        version: previous,
        deployPath: previousPath,
        timestamp: new Date().toISOString(),
        duration,
        filesTransferred: 0,
        bytesTransferred: 0,
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      logger.error(`❌ Rollback failed: ${error.message}`)

      return {
        success: false,
        message: error.message,
        version: 'unknown',
        deployPath: '',
        timestamp: new Date().toISOString(),
        duration,
        filesTransferred: 0,
        bytesTransferred: 0,
      }
    } finally {
      await this.ssh.disconnect()
    }
  }

  /**
   * 回滚到指定版本
   * 
   * @param releaseId - 版本 ID
   */
  async rollbackTo(releaseId: string): Promise<SSHDeployResult> {
    const startTime = Date.now()

    logger.info(`⏪ Rolling back to release: ${releaseId}`)

    try {
      await this.ssh.connect()

      const releasePath = `${this.config.deployPath}/releases/${releaseId}`
      const exists = await this.ssh.exists(releasePath)

      if (!exists) {
        throw new Error(`Release not found: ${releaseId}`)
      }

      await this.switchToRelease(releasePath)

      const duration = Date.now() - startTime
      logger.success(`✅ Rollback completed in ${(duration / 1000).toFixed(2)}s`)

      return {
        success: true,
        message: `Rolled back to ${releaseId}`,
        version: releaseId,
        deployPath: releasePath,
        timestamp: new Date().toISOString(),
        duration,
        filesTransferred: 0,
        bytesTransferred: 0,
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      logger.error(`❌ Rollback failed: ${error.message}`)

      return {
        success: false,
        message: error.message,
        version: releaseId,
        deployPath: '',
        timestamp: new Date().toISOString(),
        duration,
        filesTransferred: 0,
        bytesTransferred: 0,
      }
    } finally {
      await this.ssh.disconnect()
    }
  }

  /**
   * 获取已部署的版本列表
   * 
   * @returns 版本 ID 列表（按时间倒序）
   */
  async getReleases(): Promise<string[]> {
    const result = await this.ssh.exec({
      command: `ls -1t ${this.config.deployPath}/releases 2>/dev/null || true`,
    })

    return result.stdout
      .split('\n')
      .filter(Boolean)
      .map(s => s.trim())
  }

  /**
   * 获取当前版本
   * 
   * @returns 当前版本 ID
   */
  async getCurrentRelease(): Promise<string | null> {
    const currentLink = `${this.config.deployPath}/${this.config.currentLink}`
    const exists = await this.ssh.exists(currentLink)

    if (!exists) {
      return null
    }

    const result = await this.ssh.exec({
      command: `readlink ${currentLink}`,
    })

    if (result.success) {
      const parts = result.stdout.split('/')
      return parts[parts.length - 1]
    }

    return null
  }

  /**
   * 执行远程命令
   * 
   * @param command - 命令
   * @param cwd - 工作目录（默认为 current）
   */
  async exec(command: string, cwd?: string): Promise<SSHExecResult> {
    const workDir = cwd || `${this.config.deployPath}/${this.config.currentLink}`
    return this.ssh.exec({ command, cwd: workDir })
  }

  /**
   * 生成版本 ID
   * 
   * @private
   */
  private generateReleaseId(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    const second = String(now.getSeconds()).padStart(2, '0')
    return `${year}${month}${day}${hour}${minute}${second}`
  }

  /**
   * 准备目录结构
   * 
   * @private
   */
  private async prepareDirectories(releasePath: string): Promise<void> {
    // 创建基础目录
    await this.ssh.mkdir(`${this.config.deployPath}/releases`)
    await this.ssh.mkdir(`${this.config.deployPath}/shared`)
    await this.ssh.mkdir(releasePath)

    // 创建共享目录
    for (const dir of this.config.sharedDirs || []) {
      await this.ssh.mkdir(`${this.config.deployPath}/shared/${dir}`)
    }
  }

  /**
   * 创建共享资源链接
   * 
   * @private
   */
  private async linkShared(releasePath: string): Promise<void> {
    // 链接共享目录
    for (const dir of this.config.sharedDirs || []) {
      const sharedPath = `${this.config.deployPath}/shared/${dir}`
      const targetPath = `${releasePath}/${dir}`

      // 删除已存在的目录
      await this.ssh.rm(targetPath, true)
      // 创建符号链接
      await this.ssh.symlink(sharedPath, targetPath)
    }

    // 链接共享文件
    for (const file of this.config.sharedFiles || []) {
      const sharedPath = `${this.config.deployPath}/shared/${file}`
      const targetPath = `${releasePath}/${file}`

      // 如果共享文件不存在，跳过
      const exists = await this.ssh.exists(sharedPath)
      if (!exists) {
        logger.warn(`Shared file not found: ${file}`)
        continue
      }

      // 删除已存在的文件
      await this.ssh.rm(targetPath)
      // 创建符号链接
      await this.ssh.symlink(sharedPath, targetPath)
    }
  }

  /**
   * 备份当前版本
   * 
   * @private
   */
  private async backupCurrent(): Promise<void> {
    const currentRelease = await this.getCurrentRelease()
    if (!currentRelease) {
      return
    }

    const backupPath = this.config.backupPath || `${this.config.deployPath}/backups`
    const backupName = `${currentRelease}_${Date.now()}.tar.gz`

    await this.ssh.mkdir(backupPath)

    await this.ssh.exec({
      command: `tar -czf ${backupPath}/${backupName} -C ${this.config.deployPath}/releases ${currentRelease}`,
    })

    logger.info(`   Backup created: ${backupName}`)
  }

  /**
   * 切换到新版本
   * 
   * @private
   */
  private async switchToRelease(releasePath: string): Promise<void> {
    const currentLink = `${this.config.deployPath}/${this.config.currentLink}`
    await this.ssh.symlink(releasePath, currentLink)
  }

  /**
   * 清理旧版本
   * 
   * @private
   */
  private async cleanOldReleases(): Promise<void> {
    const keepReleases = this.config.keepReleases || 5
    const releases = await this.getReleases()

    if (releases.length <= keepReleases) {
      return
    }

    const toDelete = releases.slice(keepReleases)
    for (const release of toDelete) {
      logger.info(`   Removing old release: ${release}`)
      await this.ssh.rm(`${this.config.deployPath}/releases/${release}`, true)
    }
  }

  /**
   * 执行钩子脚本
   * 
   * @private
   */
  private async runHooks(hooks: string[], cwd?: string): Promise<void> {
    const workDir = cwd || `${this.config.deployPath}/${this.config.currentLink}`

    for (const hook of hooks) {
      logger.info(`   Running: ${hook}`)
      const result = await this.ssh.exec({ command: hook, cwd: workDir })

      if (!result.success) {
        throw new Error(`Hook failed: ${hook}\n${result.stderr}`)
      }
    }
  }
}
