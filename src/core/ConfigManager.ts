/**
 * 配置管理器
 */

import { readFile, writeFile, fileExists, findFileUp } from '../utils/file-system.js'
import { validateDeployConfig as legacyValidateDeployConfig } from '../utils/validator.js'
import { validateDeployConfig, safeValidateDeployConfig, formatZodError } from '../utils/schema.js'
import { ConfigCache } from '../utils/cache.js'
import { ConfigError, ValidationError, FileSystemError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import type { DeployConfig, Environment, SecretConfig } from '../types/index.js'
import { resolve } from 'path'

export interface ConfigManagerOptions {
  configFile?: string
  workDir?: string
  environment?: Environment
}

export class ConfigManager {
  private config: DeployConfig | null = null
  private configFile: string
  private workDir: string
  private environment: Environment
  private useCache: boolean

  constructor(options: ConfigManagerOptions = {}) {
    this.workDir = options.workDir || process.cwd()
    this.environment = options.environment || 'development'
    this.configFile = options.configFile || 'deploy.config.json'
    this.useCache = true // 默认启用缓存
  }

  /**
   * 加载配置
   */
  async loadConfig(): Promise<DeployConfig> {
    try {
      // 查找配置文件
      const configPath = await this.findConfigFile()

      if (!configPath) {
        throw new FileSystemError(`配置文件未找到: ${this.configFile}`, {
          path: this.configFile,
          operation: 'find',
          suggestion: '请运行 ldesign-deployer init 创建配置文件',
        })
      }

      // 尝试从缓存获取
      if (this.useCache) {
        const cached = ConfigCache.get<DeployConfig>(configPath)
        if (cached) {
          logger.debug(`使用缓存的配置: ${configPath}`)
          this.config = cached
          return cached
        }
      }

      logger.debug(`从文件加载配置: ${configPath}`)

      // 读取配置
      const content = await readFile(configPath)
      let rawConfig: any

      if (configPath.endsWith('.json')) {
        try {
          rawConfig = JSON.parse(content)
        } catch (error: any) {
          throw new ConfigError(`配置文件 JSON 解析失败`, {
            details: { path: configPath, error: error.message },
            suggestion: '请检查 JSON 格式是否正确',
            cause: error,
          })
        }
      } else if (configPath.endsWith('.js') || configPath.endsWith('.mjs')) {
        // 动态导入 JS 配置
        const module = await import(configPath)
        rawConfig = module.default || module
      } else {
        throw new ConfigError(`不支持的配置文件格式`, {
          details: { path: configPath },
          suggestion: '支持的格式: .json, .js, .mjs',
        })
      }

      // 合并环境变量
      rawConfig = this.mergeEnvVariables(rawConfig)

      // 使用 Zod 验证配置
      const validationResult = safeValidateDeployConfig(rawConfig)

      if (!validationResult.success) {
        const errorMessage = formatZodError(validationResult.error!)
        throw new ValidationError(
          '配置验证失败',
          undefined,
          {
            errors: validationResult.error!.errors,
            details: { path: configPath },
            suggestion: '请根据错误信息修正配置文件',
          }
        )
      }

      const config = validationResult.data!

      // 缓存配置
      if (this.useCache) {
        ConfigCache.set(configPath, config)
      }

      this.config = config
      logger.info(`✅ 配置加载成功: ${config.environment} 环境`)

      return config
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof ConfigError) {
        logger.error(error.format())
      } else {
        logger.error('加载配置失败:', error.message)
      }
      throw error
    }
  }

  /**
   * 保存配置
   */
  async saveConfig(config: DeployConfig): Promise<void> {
    try {
      // 验证配置
      const validationResult = safeValidateDeployConfig(config)

      if (!validationResult.success) {
        const errorMessage = formatZodError(validationResult.error!)
        throw new ValidationError(
          '配置验证失败',
          undefined,
          {
            errors: validationResult.error!.errors,
            suggestion: '请根据错误信息修正配置',
          }
        )
      }

      const configPath = resolve(this.workDir, this.configFile)
      const content = JSON.stringify(config, null, 2)

      await writeFile(configPath, content)
      logger.success(`✅ 配置已保存: ${configPath}`)

      this.config = config

      // 更新缓存
      if (this.useCache) {
        ConfigCache.set(configPath, config)
      }
    } catch (error: any) {
      if (error instanceof ValidationError) {
        logger.error(error.format())
      } else {
        logger.error('保存配置失败:', error.message)
      }
      throw error
    }
  }

  /**
   * 禁用缓存
   */
  disableCache(): void {
    this.useCache = false
  }

  /**
   * 启用缓存
   */
  enableCache(): void {
    this.useCache = true
  }

  /**
   * 清除当前配置的缓存
   */
  clearCache(): void {
    const configPath = resolve(this.workDir, this.configFile)
    ConfigCache.delete(configPath)
  }

  /**
   * 获取配置
   */
  getConfig(): DeployConfig {
    if (!this.config) {
      throw new Error('Config not loaded. Call loadConfig() first.')
    }
    return this.config
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<DeployConfig>): DeployConfig {
    if (!this.config) {
      throw new Error('Config not loaded. Call loadConfig() first.')
    }

    this.config = { ...this.config, ...updates }
    return this.config
  }

  /**
   * 获取环境变量
   */
  getEnvVariables(): Record<string, string> {
    const config = this.getConfig()
    const vars: Record<string, string> = {}

    if (config.env) {
      for (const envVar of config.env) {
        vars[envVar.name] = envVar.value
      }
    }

    return vars
  }

  /**
   * 设置环境变量
   */
  setEnvVariable(name: string, value: string, secret = false): void {
    const config = this.getConfig()

    if (!config.env) {
      config.env = []
    }

    const existingIndex = config.env.findIndex(v => v.name === name)
    if (existingIndex >= 0) {
      config.env[existingIndex] = { name, value, secret }
    } else {
      config.env.push({ name, value, secret })
    }
  }

  /**
   * 获取密钥
   */
  getSecrets(): SecretConfig[] {
    const config = this.getConfig()
    return config.secrets || []
  }

  /**
   * 设置密钥
   */
  setSecret(name: string, value: string, encrypted = false): void {
    const config = this.getConfig()

    if (!config.secrets) {
      config.secrets = []
    }

    const existingIndex = config.secrets.findIndex(s => s.name === name)
    if (existingIndex >= 0) {
      config.secrets[existingIndex] = { name, value, encrypted }
    } else {
      config.secrets.push({ name, value, encrypted })
    }
  }

  /**
   * 查找配置文件
   */
  private async findConfigFile(): Promise<string | null> {
    // 先检查当前目录
    const localPath = resolve(this.workDir, this.configFile)
    if (fileExists(localPath)) {
      return localPath
    }

    // 向上查找
    const possibleNames = [
      'deploy.config.json',
      'deploy.config.js',
      'deploy.config.mjs',
      '.deployrc.json',
      '.deployrc',
    ]

    for (const name of possibleNames) {
      const found = await findFileUp(name, this.workDir)
      if (found) {
        return found
      }
    }

    return null
  }

  /**
   * 合并环境变量
   */
  private mergeEnvVariables(config: DeployConfig): DeployConfig {
    // 从 process.env 读取 DEPLOY_ 前缀的环境变量
    const envOverrides: Record<string, string> = {}

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('DEPLOY_') && value) {
        const configKey = key.substring(7).toLowerCase()
        envOverrides[configKey] = value
      }
    }

    // 应用覆盖
    if (envOverrides.environment) {
      config.environment = envOverrides.environment as Environment
    }

    return config
  }

  /**
   * 创建默认配置
   */
  static createDefaultConfig(name: string): DeployConfig {
    return {
      name,
      version: '1.0.0',
      environment: 'development',
      platform: 'docker',
      projectType: 'node',
      docker: {
        image: name,
        tag: 'latest',
        registry: 'docker.io',
      },
      healthCheck: {
        enabled: true,
        path: '/health',
        port: 3000,
        interval: 30,
        timeout: 5,
        retries: 3,
      },
    }
  }

  /**
   * 初始化配置文件
   */
  static async initConfig(name: string, workDir: string = process.cwd()): Promise<string> {
    const config = ConfigManager.createDefaultConfig(name)
    const configPath = resolve(workDir, 'deploy.config.json')

    if (fileExists(configPath)) {
      throw new Error(`Config file already exists: ${configPath}`)
    }

    await writeFile(configPath, JSON.stringify(config, null, 2))
    logger.success(`Config file created: ${configPath}`)

    return configPath
  }
}




