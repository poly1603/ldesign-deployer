/**
 * 版本管理器
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { readJSON, writeJSON, fileExists } from '../utils/file-system.js'
import { isValidVersion } from '../utils/validator.js'
import { logger } from '../utils/logger.js'
import type { VersionInfo } from '../types/index.js'
import { resolve } from 'path'

const execAsync = promisify(exec)

export interface VersionManagerOptions {
  workDir?: string
  packageFile?: string
}

export class VersionManager {
  private workDir: string
  private packageFile: string

  constructor(options: VersionManagerOptions = {}) {
    this.workDir = options.workDir || process.cwd()
    this.packageFile = options.packageFile || 'package.json'
  }

  /**
   * 获取当前版本
   */
  async getCurrentVersion(): Promise<string> {
    try {
      const packagePath = resolve(this.workDir, this.packageFile)

      if (!fileExists(packagePath)) {
        logger.warn(`Package file not found: ${packagePath}`)
        return '0.0.0'
      }

      const packageJson = await readJSON(packagePath)
      return packageJson.version || '0.0.0'
    } catch (error) {
      logger.error('Failed to get current version:', error)
      return '0.0.0'
    }
  }

  /**
   * 设置版本
   */
  async setVersion(version: string): Promise<void> {
    if (!isValidVersion(version)) {
      throw new Error(`Invalid version format: ${version}`)
    }

    try {
      const packagePath = resolve(this.workDir, this.packageFile)

      if (!fileExists(packagePath)) {
        throw new Error(`Package file not found: ${packagePath}`)
      }

      const packageJson = await readJSON(packagePath)
      packageJson.version = version

      await writeJSON(packagePath, packageJson)
      logger.success(`Version updated to: ${version}`)
    } catch (error) {
      logger.error('Failed to set version:', error)
      throw error
    }
  }

  /**
   * 递增版本（major, minor, patch）
   */
  async bumpVersion(type: 'major' | 'minor' | 'patch'): Promise<string> {
    const currentVersion = await this.getCurrentVersion()
    const newVersion = this.incrementVersion(currentVersion, type)

    await this.setVersion(newVersion)
    logger.info(`Version bumped from ${currentVersion} to ${newVersion}`)

    return newVersion
  }

  /**
   * 生成构建号
   */
  generateBuildNumber(): string {
    const timestamp = Date.now()
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${year}${month}${day}.${hours}${minutes}`
  }

  /**
   * 获取 Git 信息
   */
  async getGitInfo(): Promise<{
    commit?: string
    branch?: string
    tag?: string
  }> {
    const info: { commit?: string; branch?: string; tag?: string } = {}

    try {
      // 获取 commit hash
      const { stdout: commit } = await execAsync('git rev-parse --short HEAD', {
        cwd: this.workDir,
      })
      info.commit = commit.trim()
    } catch {
      logger.debug('Failed to get git commit')
    }

    try {
      // 获取当前分支
      const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.workDir,
      })
      info.branch = branch.trim()
    } catch {
      logger.debug('Failed to get git branch')
    }

    try {
      // 获取最新 tag
      const { stdout: tag } = await execAsync('git describe --tags --abbrev=0', {
        cwd: this.workDir,
      })
      info.tag = tag.trim()
    } catch {
      logger.debug('Failed to get git tag')
    }

    return info
  }

  /**
   * 创建 Git Tag
   */
  async createTag(version: string, message?: string): Promise<void> {
    try {
      const tagName = version.startsWith('v') ? version : `v${version}`
      const tagMessage = message || `Release ${version}`

      await execAsync(`git tag -a ${tagName} -m "${tagMessage}"`, {
        cwd: this.workDir,
      })

      logger.success(`Git tag created: ${tagName}`)
    } catch (error) {
      logger.error('Failed to create git tag:', error)
      throw error
    }
  }

  /**
   * 推送 Tag 到远程
   */
  async pushTag(version: string): Promise<void> {
    try {
      const tagName = version.startsWith('v') ? version : `v${version}`

      await execAsync(`git push origin ${tagName}`, {
        cwd: this.workDir,
      })

      logger.success(`Git tag pushed: ${tagName}`)
    } catch (error) {
      logger.error('Failed to push git tag:', error)
      throw error
    }
  }

  /**
   * 生成完整版本信息
   */
  async getVersionInfo(): Promise<VersionInfo> {
    const version = await this.getCurrentVersion()
    const buildNumber = this.generateBuildNumber()
    const gitInfo = await this.getGitInfo()

    return {
      version,
      buildNumber,
      gitCommit: gitInfo.commit,
      gitBranch: gitInfo.branch,
      tag: gitInfo.tag,
      buildTime: new Date().toISOString(),
    }
  }

  /**
   * 生成 CHANGELOG
   */
  async generateChangelog(from?: string, to = 'HEAD'): Promise<string> {
    try {
      const range = from ? `${from}..${to}` : to
      const { stdout } = await execAsync(
        `git log ${range} --pretty=format:"- %s (%h)" --no-merges`,
        { cwd: this.workDir }
      )

      return stdout.trim()
    } catch (error) {
      logger.error('Failed to generate changelog:', error)
      return ''
    }
  }

  /**
   * 递增版本号
   */
  private incrementVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
    const parts = version.split('.')
    let [major, minor, patch] = parts.map(p => parseInt(p, 10))

    switch (type) {
      case 'major':
        major++
        minor = 0
        patch = 0
        break
      case 'minor':
        minor++
        patch = 0
        break
      case 'patch':
        patch++
        break
    }

    return `${major}.${minor}.${patch}`
  }

  /**
   * 比较版本
   */
  compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(p => parseInt(p, 10))
    const parts2 = v2.split('.').map(p => parseInt(p, 10))

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const a = parts1[i] || 0
      const b = parts2[i] || 0

      if (a > b) return 1
      if (a < b) return -1
    }

    return 0
  }
}




