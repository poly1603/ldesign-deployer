/**
 * SFTP 客户端
 * @module ssh/SFTPClient
 * 
 * @description 提供 SFTP 文件传输功能
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, statSync, readdirSync } from 'fs'
import { join, basename, resolve } from 'path'
import type {
  SSHConfig,
  SFTPUploadOptions,
} from './types.js'

const execAsync = promisify(exec)

/**
 * SFTP 客户端类
 * 
 * @description 使用系统 scp/rsync 命令实现文件传输
 * 
 * @example
 * ```typescript
 * const sftp = new SFTPClient({
 *   host: 'server.example.com',
 *   username: 'deploy',
 *   privateKeyPath: '~/.ssh/id_rsa'
 * });
 * 
 * await sftp.upload({
 *   localPath: './dist',
 *   remotePath: '/var/www/app/releases/v1.0.0',
 *   recursive: true
 * });
 * ```
 */
export class SFTPClient {
  private config: SSHConfig

  /**
   * 创建 SFTP 客户端
   * 
   * @param config - SSH 连接配置
   */
  constructor(config: SSHConfig) {
    this.config = {
      port: 22,
      timeout: 30000,
      ...config,
    }
  }

  /**
   * 上传文件或目录
   * 
   * @param options - 上传选项
   * @returns 传输统计
   */
  async upload(options: SFTPUploadOptions): Promise<{
    filesTransferred: number
    bytesTransferred: number
    duration: number
  }> {
    const startTime = Date.now()
    const localPath = resolve(options.localPath)

    if (!existsSync(localPath)) {
      throw new Error(`Local path does not exist: ${localPath}`)
    }

    const stat = statSync(localPath)
    const isDirectory = stat.isDirectory()

    // 选择使用 rsync（如果可用）或 scp
    const useRsync = await this.isRsyncAvailable()

    let command: string
    let filesTransferred = 0
    let bytesTransferred = 0

    if (useRsync && isDirectory) {
      command = this.buildRsyncCommand(localPath, options)
      filesTransferred = this.countFiles(localPath, options.exclude)
      bytesTransferred = this.calculateSize(localPath, options.exclude)
    } else {
      command = this.buildScpCommand(localPath, options, isDirectory)
      if (isDirectory) {
        filesTransferred = this.countFiles(localPath, options.exclude)
        bytesTransferred = this.calculateSize(localPath, options.exclude)
      } else {
        filesTransferred = 1
        bytesTransferred = stat.size
      }
    }

    try {
      await execAsync(command, {
        timeout: this.config.timeout,
        maxBuffer: 50 * 1024 * 1024,
      })

      // 调用进度回调（完成）
      if (options.onProgress) {
        options.onProgress({
          file: basename(localPath),
          transferred: bytesTransferred,
          total: bytesTransferred,
          percentage: 100,
          speed: bytesTransferred / ((Date.now() - startTime) / 1000),
        })
      }

      return {
        filesTransferred,
        bytesTransferred,
        duration: Date.now() - startTime,
      }
    } catch (error: any) {
      throw new Error(`SFTP upload failed: ${error.message}`)
    }
  }

  /**
   * 下载文件或目录
   * 
   * @param remotePath - 远程路径
   * @param localPath - 本地路径
   * @param recursive - 是否递归下载
   */
  async download(
    remotePath: string,
    localPath: string,
    recursive: boolean = false
  ): Promise<void> {
    const command = this.buildScpDownloadCommand(remotePath, localPath, recursive)

    try {
      await execAsync(command, {
        timeout: this.config.timeout,
        maxBuffer: 50 * 1024 * 1024,
      })
    } catch (error: any) {
      throw new Error(`SFTP download failed: ${error.message}`)
    }
  }

  /**
   * 同步目录（使用 rsync）
   * 
   * @param localPath - 本地路径
   * @param remotePath - 远程路径
   * @param options - 额外选项
   */
  async sync(
    localPath: string,
    remotePath: string,
    options: {
      delete?: boolean
      exclude?: string[]
      dryRun?: boolean
    } = {}
  ): Promise<{ stdout: string; stderr: string }> {
    if (!(await this.isRsyncAvailable())) {
      throw new Error('rsync is not available on this system')
    }

    const args: string[] = ['-avz', '--progress']

    if (options.delete) {
      args.push('--delete')
    }

    if (options.dryRun) {
      args.push('--dry-run')
    }

    if (options.exclude) {
      for (const pattern of options.exclude) {
        args.push(`--exclude="${pattern}"`)
      }
    }

    // SSH 选项
    const sshOptions = this.buildSSHOptions()
    args.push(`-e "ssh ${sshOptions}"`)

    // 源和目标
    const target = `${this.config.username}@${this.config.host}:${remotePath}`
    args.push(resolve(localPath) + '/')
    args.push(target)

    const command = `rsync ${args.join(' ')}`

    const { stdout, stderr } = await execAsync(command, {
      timeout: this.config.timeout,
      maxBuffer: 50 * 1024 * 1024,
    })

    return { stdout, stderr }
  }

  /**
   * 检查 rsync 是否可用
   * 
   * @private
   */
  private async isRsyncAvailable(): Promise<boolean> {
    try {
      await execAsync('rsync --version')
      return true
    } catch {
      return false
    }
  }

  /**
   * 构建 rsync 命令
   * 
   * @private
   */
  private buildRsyncCommand(localPath: string, options: SFTPUploadOptions): string {
    const args: string[] = ['-avz', '--progress']

    // 排除模式
    if (options.exclude) {
      for (const pattern of options.exclude) {
        args.push(`--exclude="${pattern}"`)
      }
    }

    // SSH 选项
    const sshOptions = this.buildSSHOptions()
    args.push(`-e "ssh ${sshOptions}"`)

    // 源和目标
    const target = `${this.config.username}@${this.config.host}:${options.remotePath}`
    args.push(localPath + '/')
    args.push(target)

    return `rsync ${args.join(' ')}`
  }

  /**
   * 构建 scp 命令
   * 
   * @private
   */
  private buildScpCommand(
    localPath: string,
    options: SFTPUploadOptions,
    isDirectory: boolean
  ): string {
    const args: string[] = []

    // 递归
    if (isDirectory || options.recursive) {
      args.push('-r')
    }

    // 保留权限
    if (options.preservePermissions) {
      args.push('-p')
    }

    // 端口
    if (this.config.port !== 22) {
      args.push(`-P ${this.config.port}`)
    }

    // 私钥
    if (this.config.privateKeyPath) {
      const keyPath = resolve(
        this.config.privateKeyPath.replace(/^~/, process.env.HOME || '')
      )
      args.push(`-i "${keyPath}"`)
    }

    // 禁用主机密钥检查
    if (!this.config.strictHostKeyChecking) {
      args.push('-o StrictHostKeyChecking=no')
      args.push('-o UserKnownHostsFile=/dev/null')
    }

    // 源和目标
    const target = `${this.config.username}@${this.config.host}:${options.remotePath}`
    args.push(`"${localPath}"`)
    args.push(target)

    return `scp ${args.join(' ')}`
  }

  /**
   * 构建 scp 下载命令
   * 
   * @private
   */
  private buildScpDownloadCommand(
    remotePath: string,
    localPath: string,
    recursive: boolean
  ): string {
    const args: string[] = []

    if (recursive) {
      args.push('-r')
    }

    if (this.config.port !== 22) {
      args.push(`-P ${this.config.port}`)
    }

    if (this.config.privateKeyPath) {
      const keyPath = resolve(
        this.config.privateKeyPath.replace(/^~/, process.env.HOME || '')
      )
      args.push(`-i "${keyPath}"`)
    }

    if (!this.config.strictHostKeyChecking) {
      args.push('-o StrictHostKeyChecking=no')
      args.push('-o UserKnownHostsFile=/dev/null')
    }

    const source = `${this.config.username}@${this.config.host}:${remotePath}`
    args.push(source)
    args.push(`"${resolve(localPath)}"`)

    return `scp ${args.join(' ')}`
  }

  /**
   * 构建 SSH 选项
   * 
   * @private
   */
  private buildSSHOptions(): string {
    const options: string[] = []

    if (this.config.port !== 22) {
      options.push(`-p ${this.config.port}`)
    }

    if (this.config.privateKeyPath) {
      const keyPath = resolve(
        this.config.privateKeyPath.replace(/^~/, process.env.HOME || '')
      )
      options.push(`-i "${keyPath}"`)
    }

    if (!this.config.strictHostKeyChecking) {
      options.push('-o StrictHostKeyChecking=no')
      options.push('-o UserKnownHostsFile=/dev/null')
    }

    return options.join(' ')
  }

  /**
   * 统计目录中的文件数量
   * 
   * @private
   */
  private countFiles(dirPath: string, exclude?: string[]): number {
    let count = 0
    const entries = readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      if (exclude && exclude.some(pattern => this.matchPattern(entry.name, pattern))) {
        continue
      }

      if (entry.isFile()) {
        count++
      } else if (entry.isDirectory()) {
        count += this.countFiles(join(dirPath, entry.name), exclude)
      }
    }

    return count
  }

  /**
   * 计算目录大小
   * 
   * @private
   */
  private calculateSize(dirPath: string, exclude?: string[]): number {
    let size = 0
    const entries = readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      if (exclude && exclude.some(pattern => this.matchPattern(entry.name, pattern))) {
        continue
      }

      const fullPath = join(dirPath, entry.name)

      if (entry.isFile()) {
        size += statSync(fullPath).size
      } else if (entry.isDirectory()) {
        size += this.calculateSize(fullPath, exclude)
      }
    }

    return size
  }

  /**
   * 简单模式匹配
   * 
   * @private
   */
  private matchPattern(name: string, pattern: string): boolean {
    // 简单的通配符匹配
    const regex = new RegExp(
      '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
    )
    return regex.test(name)
  }
}
