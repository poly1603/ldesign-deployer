/**
 * 配置管理器
 */

import { readFile, writeFile, fileExists, findFileUp } from '../utils/file-system.js'
import { validateDeployConfig } from '../utils/validator.js'
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

  constructor(options: ConfigManagerOptions = {}) {
    this.workDir = options.workDir || process.cwd()
    this.environment = options.environment || 'development'
    this.configFile = options.configFile || 'deploy.config.json'
  }

  /**
   * 加载配置
   */
  async loadConfig(): Promise<DeployConfig> {
    try {
      // 查找配置文件
      const configPath = await this.findConfigFile()

      if (!configPath) {
        throw new Error(`Config file not found: ${this.configFile}`)
      }

      logger.debug(`Loading config from: ${configPath}`)

      // 读取配置
      const content = await readFile(configPath)
      let config: DeployConfig

      if (configPath.endsWith('.json')) {
        config = JSON.parse(content)
      } else if (configPath.endsWith('.js') || configPath.endsWith('.mjs')) {
        // 动态导入 JS 配置
        const module = await import(configPath)
        config = module.default || module
      } else {
        throw new Error(`Unsupported config file format: ${configPath}`)
      }

      // 合并环境变量
      config = this.mergeEnvVariables(config)

      // 验证配置
      validateDeployConfig(config)

      this.config = config
      logger.info(`Config loaded successfully for ${config.environment} environment`)

      return config
    } catch (error) {
      logger.error('Failed to load config:', error)
      throw error
    }
  }

  /**
   * 保存配置
   */
  async saveConfig(config: DeployConfig): Promise<void> {
    try {
      validateDeployConfig(config)

      const configPath = resolve(this.workDir, this.configFile)
      const content = JSON.stringify(config, null, 2)

      await writeFile(configPath, content)
      logger.success(`Config saved to: ${configPath}`)

      this.config = config
    } catch (error) {
      logger.error('Failed to save config:', error)
      throw error
    }
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




