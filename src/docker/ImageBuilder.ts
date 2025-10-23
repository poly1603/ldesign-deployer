/**
 * Docker 镜像构建器
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from '../utils/logger.js'
import type { BuildOptions, PushOptions, ImageInfo } from '../types/index.js'

const execAsync = promisify(exec)

export interface BuildProgress {
  step: number
  totalSteps: number
  message: string
}

export class ImageBuilder {
  /**
   * 构建镜像
   */
  async build(options: BuildOptions): Promise<string> {
    logger.info(`Building Docker image: ${options.tag}`)

    try {
      const args = this.buildCommandArgs(options)
      const command = `docker build ${args.join(' ')}`

      logger.debug(`Executing: ${command}`)

      const { stdout, stderr } = await execAsync(command, {
        cwd: options.context,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      })

      if (stderr && !stderr.includes('WARNING')) {
        logger.warn('Build warnings:', stderr)
      }

      // 解析输出获取镜像 ID
      const imageId = this.extractImageId(stdout)

      logger.success(`Image built successfully: ${options.tag}`)
      if (imageId) {
        logger.debug(`Image ID: ${imageId}`)
      }

      return imageId || options.tag
    } catch (error: any) {
      logger.error('Failed to build image:', error.message)
      throw new Error(`Docker build failed: ${error.message}`)
    }
  }

  /**
   * 推送镜像
   */
  async push(options: PushOptions): Promise<void> {
    const fullTag = this.getFullImageTag(options)
    logger.info(`Pushing Docker image: ${fullTag}`)

    try {
      // 如果提供了认证信息，先登录
      if (options.auth) {
        await this.login(options.registry || 'docker.io', options.auth)
      }

      // 如果需要，先打标签
      if (options.registry) {
        await this.tag(options.image, fullTag)
      }

      // 推送镜像
      const { stdout, stderr } = await execAsync(`docker push ${fullTag}`)

      if (stderr && !stderr.includes('Pushed')) {
        logger.warn('Push warnings:', stderr)
      }

      logger.success(`Image pushed successfully: ${fullTag}`)
    } catch (error: any) {
      logger.error('Failed to push image:', error.message)
      throw new Error(`Docker push failed: ${error.message}`)
    }
  }

  /**
   * 标记镜像
   */
  async tag(sourceImage: string, targetImage: string): Promise<void> {
    try {
      await execAsync(`docker tag ${sourceImage} ${targetImage}`)
      logger.debug(`Image tagged: ${sourceImage} -> ${targetImage}`)
    } catch (error: any) {
      throw new Error(`Failed to tag image: ${error.message}`)
    }
  }

  /**
   * 登录到 Docker Registry
   */
  async login(
    registry: string,
    auth: { username: string; password: string }
  ): Promise<void> {
    try {
      const command = `docker login ${registry} -u ${auth.username} --password-stdin`
      const { stdout, stderr } = await execAsync(command, {
        input: auth.password,
      } as any)

      logger.debug(`Logged in to ${registry}`)
    } catch (error: any) {
      throw new Error(`Docker login failed: ${error.message}`)
    }
  }

  /**
   * 获取镜像信息
   */
  async getImageInfo(image: string): Promise<ImageInfo | null> {
    try {
      const { stdout } = await execAsync(
        `docker inspect ${image} --format='{{json .}}'`
      )

      const data = JSON.parse(stdout)

      return {
        id: data.Id,
        tags: data.RepoTags || [],
        size: data.Size,
        created: data.Created,
      }
    } catch {
      return null
    }
  }

  /**
   * 删除镜像
   */
  async removeImage(image: string, force = false): Promise<void> {
    try {
      const forceFlag = force ? '-f' : ''
      await execAsync(`docker rmi ${forceFlag} ${image}`)
      logger.debug(`Image removed: ${image}`)
    } catch (error: any) {
      logger.warn(`Failed to remove image ${image}:`, error.message)
    }
  }

  /**
   * 清理悬空镜像
   */
  async pruneImages(): Promise<void> {
    try {
      const { stdout } = await execAsync('docker image prune -f')
      logger.info('Dangling images pruned:', stdout.trim())
    } catch (error: any) {
      logger.warn('Failed to prune images:', error.message)
    }
  }

  /**
   * 检查 Docker 是否可用
   */
  async checkDocker(): Promise<boolean> {
    try {
      await execAsync('docker --version')
      return true
    } catch {
      return false
    }
  }

  /**
   * 构建命令参数
   */
  private buildCommandArgs(options: BuildOptions): string[] {
    const args: string[] = []

    // Tag
    args.push('-t', options.tag)

    // Dockerfile
    if (options.dockerfile) {
      args.push('-f', options.dockerfile)
    }

    // Build args
    if (options.buildArgs) {
      for (const [key, value] of Object.entries(options.buildArgs)) {
        args.push('--build-arg', `${key}=${value}`)
      }
    }

    // Target (multi-stage)
    if (options.target) {
      args.push('--target', options.target)
    }

    // Platform
    if (options.platform) {
      args.push('--platform', options.platform)
    }

    // Cache
    if (options.cache === false) {
      args.push('--no-cache')
    }

    // Pull
    if (options.pull) {
      args.push('--pull')
    }

    // Progress
    if (options.progress) {
      args.push('--progress', options.progress)
    }

    // Context (last)
    args.push(options.context)

    return args
  }

  /**
   * 提取镜像 ID
   */
  private extractImageId(output: string): string | null {
    // 查找 "Successfully built <image-id>" 或 "sha256:..."
    const builtMatch = output.match(/Successfully built ([a-f0-9]+)/)
    if (builtMatch) {
      return builtMatch[1]
    }

    const shaMatch = output.match(/sha256:([a-f0-9]+)/)
    if (shaMatch) {
      return shaMatch[1]
    }

    return null
  }

  /**
   * 获取完整镜像标签
   */
  private getFullImageTag(options: PushOptions): string {
    const { image, tag, registry } = options
    const fullTag = tag ? `${image}:${tag}` : image

    if (registry && !fullTag.includes('/')) {
      return `${registry}/${fullTag}`
    }

    return fullTag
  }
}




