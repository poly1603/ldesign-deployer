/**
 * 部署前置检查器
 * @module core/PreDeploymentChecker
 * 
 * @description 在部署前执行一系列环境和配置检查，确保部署环境满足要求
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from '../utils/logger.js'
import type { DeployConfig } from '../types/index.js'
import { DeploymentError } from '../utils/errors.js'
import {
  MIN_NODE_MAJOR_VERSION,
  MIN_DISK_SPACE,
  BYTE_UNITS,
  BYTES_PER_UNIT,
} from '../constants/index.js'

const execAsync = promisify(exec)

/**
 * 检查结果接口
 */
export interface CheckResult {
  /** 检查项名称 */
  name: string
  /** 是否通过检查 */
  passed: boolean
  /** 检查结果消息 */
  message: string
  /** 严重程度 */
  severity?: 'critical' | 'warning' | 'info'
}

/**
 * 部署前置检查器类
 * 
 * @description 在部署前执行一系列检查，包括环境检查、平台检查、资源检查等
 * 
 * @example
 * ```typescript
 * const checker = new PreDeploymentChecker();
 * const results = await checker.checkAll(config);
 * ```
 */
export class PreDeploymentChecker {
  /**
   * 执行所有检查
   * 
   * @param config - 部署配置
   * @returns 检查结果列表
   * @throws {DeploymentError} 当有严重问题时抛出
   */
  async checkAll(config: DeployConfig): Promise<CheckResult[]> {
    logger.info('🔍 Running pre-deployment checks...')

    const checks: CheckResult[] = []

    // 1. 基础环境检查
    checks.push(await this.checkNodeVersion())

    // 2. 平台相关检查
    if (config.platform === 'docker' || config.platform === 'docker-compose') {
      checks.push(await this.checkDocker())
    }

    if (config.platform === 'kubernetes') {
      checks.push(await this.checkKubectl())
      checks.push(await this.checkClusterConnection(config))
    }

    // 3. 资源检查
    checks.push(await this.checkDiskSpace())

    // 4. 网络检查
    if (config.docker?.registry) {
      checks.push(await this.checkRegistryAccess(config))
    }

    // 5. 配置完整性检查
    checks.push(this.checkConfigIntegrity(config))

    // 6. Git 仓库检查
    checks.push(await this.checkGitStatus())

    // 汇总结果
    const critical = checks.filter(c => !c.passed && c.severity === 'critical')
    const warnings = checks.filter(c => !c.passed && c.severity === 'warning')

    // 显示结果
    this.displayResults(checks)

    // 如果有严重问题，抛出错误
    if (critical.length > 0) {
      throw new DeploymentError(
        `Pre-deployment checks failed: ${critical.map(c => c.name).join(', ')}`,
        'pre-check',
        { critical, warnings }
      )
    }

    if (warnings.length > 0) {
      logger.warn(`Found ${warnings.length} warnings, but continuing deployment`)
    }

    return checks
  }

  /**
   * 检查 Node.js 版本
   * 
   * @private
   * @returns 检查结果
   */
  private async checkNodeVersion(): Promise<CheckResult> {
    try {
      const { stdout } = await execAsync('node --version')
      const version = stdout.trim()
      const majorVersion = parseInt(version.replace('v', '').split('.')[0])

      const passed = majorVersion >= MIN_NODE_MAJOR_VERSION

      return {
        name: 'Node.js Version',
        passed,
        message: `${version} ${passed ? '(OK)' : `(Requires v${MIN_NODE_MAJOR_VERSION}+)`}`,
        severity: passed ? 'info' : 'critical',
      }
    } catch {
      return {
        name: 'Node.js Version',
        passed: false,
        message: 'Node.js not found',
        severity: 'critical',
      }
    }
  }

  /**
   * 检查 Docker
   */
  private async checkDocker(): Promise<CheckResult> {
    try {
      const { stdout } = await execAsync('docker --version')
      const running = await this.checkDockerRunning()

      return {
        name: 'Docker',
        passed: running,
        message: running ? `${stdout.trim()} (Running)` : 'Docker daemon not running',
        severity: 'critical',
      }
    } catch {
      return {
        name: 'Docker',
        passed: false,
        message: 'Docker not installed',
        severity: 'critical',
      }
    }
  }

  /**
   * 检查 Docker 守护进程
   */
  private async checkDockerRunning(): Promise<boolean> {
    try {
      await execAsync('docker info', { timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * 检查 kubectl
   */
  private async checkKubectl(): Promise<CheckResult> {
    try {
      const { stdout } = await execAsync('kubectl version --client --short')

      return {
        name: 'kubectl',
        passed: true,
        message: stdout.trim(),
        severity: 'critical',
      }
    } catch {
      return {
        name: 'kubectl',
        passed: false,
        message: 'kubectl not installed',
        severity: 'critical',
      }
    }
  }

  /**
   * 检查集群连接
   */
  private async checkClusterConnection(config: DeployConfig): Promise<CheckResult> {
    try {
      const args: string[] = ['cluster-info']

      if (config.kubernetes?.context) {
        args.push('--context', config.kubernetes.context)
      }

      await execAsync(`kubectl ${args.join(' ')}`, { timeout: 10000 })

      return {
        name: 'Kubernetes Cluster',
        passed: true,
        message: 'Connected',
        severity: 'critical',
      }
    } catch {
      return {
        name: 'Kubernetes Cluster',
        passed: false,
        message: 'Cannot connect to cluster',
        severity: 'critical',
      }
    }
  }

  /**
   * 检查磁盘空间
   * 
   * @private
   * @returns 检查结果
   */
  private async checkDiskSpace(): Promise<CheckResult> {
    try {
      const minSpace = MIN_DISK_SPACE

      // 不同平台使用不同命令
      const isWindows = process.platform === 'win32'
      let available = 0

      if (isWindows) {
        // Windows: 使用 PowerShell
        const { stdout } = await execAsync(
          'powershell "Get-PSDrive -Name C | Select-Object -ExpandProperty Free"'
        )
        available = parseInt(stdout.trim())
      } else {
        // Unix: 使用 df
        const { stdout } = await execAsync('df -k . | tail -1 | awk \'{print $4}\'')
        available = parseInt(stdout.trim()) * 1024
      }

      const passed = available > minSpace

      return {
        name: 'Disk Space',
        passed,
        message: `Available: ${this.formatBytes(available)} ${passed ? '(OK)' : '(Low)'}`,
        severity: passed ? 'info' : 'warning',
      }
    } catch {
      return {
        name: 'Disk Space',
        passed: true, // 无法检测时不阻止部署
        message: 'Unable to check',
        severity: 'info',
      }
    }
  }

  /**
   * 检查镜像仓库访问
   */
  private async checkRegistryAccess(config: DeployConfig): Promise<CheckResult> {
    const registry = config.docker?.registry

    if (!registry) {
      return {
        name: 'Registry Access',
        passed: true,
        message: 'No registry configured',
        severity: 'info',
      }
    }

    try {
      // 尝试 ping registry
      const url = registry.startsWith('http') ? registry : `https://${registry}`

      // 简单的网络检查
      const { default: https } = await import('https')

      return new Promise((resolve) => {
        const req = https.get(url, { timeout: 5000 }, (res) => {
          resolve({
            name: 'Registry Access',
            passed: res.statusCode! < 500,
            message: `${registry} (${res.statusCode})`,
            severity: 'warning',
          })
        })

        req.on('error', () => {
          resolve({
            name: 'Registry Access',
            passed: false,
            message: `Cannot reach ${registry}`,
            severity: 'warning',
          })
        })

        req.on('timeout', () => {
          req.destroy()
          resolve({
            name: 'Registry Access',
            passed: false,
            message: `Timeout connecting to ${registry}`,
            severity: 'warning',
          })
        })
      })
    } catch {
      return {
        name: 'Registry Access',
        passed: false,
        message: 'Unable to check',
        severity: 'warning',
      }
    }
  }

  /**
   * 检查配置完整性
   */
  private checkConfigIntegrity(config: DeployConfig): CheckResult {
    const issues: string[] = []

    // 检查必填字段
    if (!config.name) issues.push('name is missing')
    if (!config.version) issues.push('version is missing')
    if (!config.environment) issues.push('environment is missing')
    if (!config.platform) issues.push('platform is missing')

    // 检查平台特定配置
    if (config.platform === 'docker' && !config.docker?.image) {
      issues.push('docker.image is required')
    }

    if (config.platform === 'kubernetes' && !config.kubernetes) {
      issues.push('kubernetes config is required')
    }

    const passed = issues.length === 0

    return {
      name: 'Config Integrity',
      passed,
      message: passed ? 'All required fields present' : issues.join(', '),
      severity: 'critical',
    }
  }

  /**
   * 检查 Git 状态
   */
  private async checkGitStatus(): Promise<CheckResult> {
    try {
      // 检查是否是 Git 仓库
      await execAsync('git rev-parse --git-dir', { timeout: 2000 })

      // 检查是否有未提交的更改
      const { stdout } = await execAsync('git status --porcelain')
      const hasUncommitted = stdout.trim().length > 0

      return {
        name: 'Git Status',
        passed: true,
        message: hasUncommitted
          ? 'Has uncommitted changes (Warning)'
          : 'Clean working directory',
        severity: hasUncommitted ? 'warning' : 'info',
      }
    } catch {
      return {
        name: 'Git Status',
        passed: true,
        message: 'Not a git repository',
        severity: 'info',
      }
    }
  }

  /**
   * 显示检查结果
   */
  private displayResults(results: CheckResult[]): void {
    logger.info('\n📋 Pre-deployment Check Results:')
    logger.info('='.repeat(60))

    for (const result of results) {
      const icon = result.passed ? '✅' : result.severity === 'critical' ? '❌' : '⚠️'
      const color = result.passed ? 'info' : result.severity === 'critical' ? 'error' : 'warn'

      logger[color](`${icon} ${result.name}: ${result.message}`)
    }

    logger.info('='.repeat(60) + '\n')

    const summary = {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      critical: results.filter(r => !r.passed && r.severity === 'critical').length,
      warnings: results.filter(r => !r.passed && r.severity === 'warning').length,
    }

    logger.info(`Summary: ${summary.passed}/${summary.total} passed`)
    if (summary.critical > 0) {
      logger.error(`Critical issues: ${summary.critical}`)
    }
    if (summary.warnings > 0) {
      logger.warn(`Warnings: ${summary.warnings}`)
    }
  }

  /**
   * 格式化字节数为人类可读格式
   * 
   * @private
   * @param bytes - 字节数
   * @returns 格式化后的字符串
   * 
   * @example
   * ```typescript
   * formatBytes(1024); // "1.00 KB"
   * formatBytes(1048576); // "1.00 MB"
   * ```
   */
  private formatBytes(bytes: number): string {
    let value = bytes
    let unitIndex = 0

    while (value >= BYTES_PER_UNIT && unitIndex < BYTE_UNITS.length - 1) {
      value /= BYTES_PER_UNIT
      unitIndex++
    }

    return `${value.toFixed(2)} ${BYTE_UNITS[unitIndex]}`
  }
}




