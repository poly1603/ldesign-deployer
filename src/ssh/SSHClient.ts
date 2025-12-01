/**
 * SSH 客户端
 * @module ssh/SSHClient
 * 
 * @description 提供 SSH 连接和命令执行功能
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { resolve } from 'path'
import type {
  SSHConfig,
  SSHExecOptions,
  SSHExecResult,
  ServerStatus,
} from './types.js'

const execAsync = promisify(exec)

/**
 * SSH 客户端类
 * 
 * @description 使用系统 SSH 命令实现连接和执行功能
 * 
 * @example
 * ```typescript
 * const client = new SSHClient({
 *   host: 'server.example.com',
 *   username: 'deploy',
 *   privateKeyPath: '~/.ssh/id_rsa'
 * });
 * 
 * await client.connect();
 * const result = await client.exec({ command: 'ls -la' });
 * await client.disconnect();
 * ```
 */
export class SSHClient {
  private config: SSHConfig
  private connected: boolean = false

  /**
   * 创建 SSH 客户端
   * 
   * @param config - SSH 连接配置
   */
  constructor(config: SSHConfig) {
    this.config = {
      port: 22,
      timeout: 30000,
      strictHostKeyChecking: false,
      ...config,
    }
  }

  /**
   * 建立 SSH 连接（测试连接）
   * 
   * @throws {Error} 连接失败时抛出
   */
  async connect(): Promise<void> {
    const testResult = await this.exec({ command: 'echo "connected"' })
    if (!testResult.success) {
      throw new Error(`SSH connection failed: ${testResult.stderr}`)
    }
    this.connected = true
  }

  /**
   * 断开 SSH 连接
   */
  async disconnect(): Promise<void> {
    this.connected = false
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * 执行远程命令
   * 
   * @param options - 执行选项
   * @returns 执行结果
   * 
   * @example
   * ```typescript
   * const result = await client.exec({
   *   command: 'npm install',
   *   cwd: '/var/www/app',
   *   sudo: true
   * });
   * ```
   */
  async exec(options: SSHExecOptions): Promise<SSHExecResult> {
    const startTime = Date.now()

    try {
      const sshCommand = this.buildSSHCommand(options)

      const { stdout, stderr } = await execAsync(sshCommand, {
        timeout: options.timeout || this.config.timeout,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      })

      return {
        success: true,
        exitCode: 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        duration: Date.now() - startTime,
      }
    } catch (error: any) {
      return {
        success: false,
        exitCode: error.code || 1,
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || error.message,
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * 执行多个命令（按顺序）
   * 
   * @param commands - 命令列表
   * @param options - 共享选项
   * @returns 所有执行结果
   */
  async execMultiple(
    commands: string[],
    options?: Omit<SSHExecOptions, 'command'>
  ): Promise<SSHExecResult[]> {
    const results: SSHExecResult[] = []

    for (const command of commands) {
      const result = await this.exec({ ...options, command })
      results.push(result)

      if (!result.success) {
        break
      }
    }

    return results
  }

  /**
   * 获取服务器状态
   * 
   * @returns 服务器状态信息
   */
  async getServerStatus(): Promise<ServerStatus> {
    const [hostnameResult, osResult, loadResult, memoryResult, diskResult, uptimeResult] =
      await Promise.all([
        this.exec({ command: 'hostname' }),
        this.exec({ command: 'uname -s' }),
        this.exec({ command: 'cat /proc/loadavg' }),
        this.exec({ command: 'free -b' }),
        this.exec({ command: 'df -B1 /' }),
        this.exec({ command: 'cat /proc/uptime' }),
      ])

    // 解析负载
    const loadParts = loadResult.stdout.split(' ')
    const loadAverage = [
      parseFloat(loadParts[0]) || 0,
      parseFloat(loadParts[1]) || 0,
      parseFloat(loadParts[2]) || 0,
    ]

    // 解析内存
    const memoryLines = memoryResult.stdout.split('\n')
    const memoryParts = memoryLines[1]?.split(/\s+/) || []
    const memTotal = parseInt(memoryParts[1]) || 0
    const memUsed = parseInt(memoryParts[2]) || 0
    const memFree = parseInt(memoryParts[3]) || 0

    // 解析磁盘
    const diskLines = diskResult.stdout.split('\n')
    const diskParts = diskLines[1]?.split(/\s+/) || []
    const diskTotal = parseInt(diskParts[1]) || 0
    const diskUsed = parseInt(diskParts[2]) || 0
    const diskFree = parseInt(diskParts[3]) || 0

    // 解析运行时间
    const uptimeParts = uptimeResult.stdout.split(' ')
    const uptime = parseFloat(uptimeParts[0]) || 0

    return {
      hostname: hostnameResult.stdout,
      os: osResult.stdout,
      loadAverage,
      memory: {
        total: memTotal,
        used: memUsed,
        free: memFree,
        percentage: memTotal ? Math.round((memUsed / memTotal) * 100) : 0,
      },
      disk: {
        total: diskTotal,
        used: diskUsed,
        free: diskFree,
        percentage: diskTotal ? Math.round((diskUsed / diskTotal) * 100) : 0,
      },
      uptime,
    }
  }

  /**
   * 检查远程文件是否存在
   * 
   * @param path - 远程路径
   * @returns 是否存在
   */
  async exists(path: string): Promise<boolean> {
    const result = await this.exec({
      command: `test -e "${path}" && echo "exists" || echo "not_exists"`,
    })
    return result.stdout === 'exists'
  }

  /**
   * 创建远程目录
   * 
   * @param path - 目录路径
   * @param recursive - 是否递归创建
   */
  async mkdir(path: string, recursive: boolean = true): Promise<void> {
    const flag = recursive ? '-p' : ''
    const result = await this.exec({
      command: `mkdir ${flag} "${path}"`,
    })
    if (!result.success) {
      throw new Error(`Failed to create directory: ${result.stderr}`)
    }
  }

  /**
   * 删除远程文件或目录
   * 
   * @param path - 路径
   * @param recursive - 是否递归删除
   */
  async rm(path: string, recursive: boolean = false): Promise<void> {
    const flag = recursive ? '-rf' : '-f'
    const result = await this.exec({
      command: `rm ${flag} "${path}"`,
    })
    if (!result.success) {
      throw new Error(`Failed to remove: ${result.stderr}`)
    }
  }

  /**
   * 创建符号链接
   * 
   * @param target - 目标路径
   * @param link - 链接路径
   */
  async symlink(target: string, link: string): Promise<void> {
    const result = await this.exec({
      command: `ln -sfn "${target}" "${link}"`,
    })
    if (!result.success) {
      throw new Error(`Failed to create symlink: ${result.stderr}`)
    }
  }

  /**
   * 读取远程文件内容
   * 
   * @param path - 文件路径
   * @returns 文件内容
   */
  async readFile(path: string): Promise<string> {
    const result = await this.exec({
      command: `cat "${path}"`,
    })
    if (!result.success) {
      throw new Error(`Failed to read file: ${result.stderr}`)
    }
    return result.stdout
  }

  /**
   * 写入远程文件
   * 
   * @param path - 文件路径
   * @param content - 文件内容
   */
  async writeFile(path: string, content: string): Promise<void> {
    // 转义内容中的特殊字符
    const escapedContent = content
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "'\\''")

    const result = await this.exec({
      command: `echo '${escapedContent}' > "${path}"`,
    })
    if (!result.success) {
      throw new Error(`Failed to write file: ${result.stderr}`)
    }
  }

  /**
   * 构建 SSH 命令
   * 
   * @private
   */
  private buildSSHCommand(options: SSHExecOptions): string {
    const sshArgs: string[] = []

    // 端口
    if (this.config.port !== 22) {
      sshArgs.push(`-p ${this.config.port}`)
    }

    // 私钥
    if (this.config.privateKeyPath) {
      const keyPath = resolve(
        this.config.privateKeyPath.replace(/^~/, process.env.HOME || '')
      )
      if (existsSync(keyPath)) {
        sshArgs.push(`-i "${keyPath}"`)
      }
    }

    // 超时
    sshArgs.push(`-o ConnectTimeout=${Math.ceil((this.config.timeout || 30000) / 1000)}`)

    // 主机密钥检查
    if (!this.config.strictHostKeyChecking) {
      sshArgs.push('-o StrictHostKeyChecking=no')
      sshArgs.push('-o UserKnownHostsFile=/dev/null')
    }

    // 禁用密码认证提示
    sshArgs.push('-o BatchMode=yes')

    // 跳板机
    if (this.config.jumpHost) {
      const jump = this.config.jumpHost
      const jumpStr = `${jump.username}@${jump.host}:${jump.port || 22}`
      sshArgs.push(`-J ${jumpStr}`)
    }

    // 目标主机
    const target = `${this.config.username}@${this.config.host}`

    // 构建完整命令
    let remoteCommand = options.command

    // 工作目录
    if (options.cwd) {
      remoteCommand = `cd "${options.cwd}" && ${remoteCommand}`
    }

    // 环境变量
    if (options.env && Object.keys(options.env).length > 0) {
      const envStr = Object.entries(options.env)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ')
      remoteCommand = `${envStr} ${remoteCommand}`
    }

    // sudo
    if (options.sudo) {
      if (options.sudoPassword) {
        remoteCommand = `echo "${options.sudoPassword}" | sudo -S ${remoteCommand}`
      } else {
        remoteCommand = `sudo ${remoteCommand}`
      }
    }

    // 转义远程命令
    const escapedCommand = remoteCommand.replace(/"/g, '\\"')

    return `ssh ${sshArgs.join(' ')} ${target} "${escapedCommand}"`
  }
}
