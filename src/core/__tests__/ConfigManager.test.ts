/**
 * ConfigManager 测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ConfigManager } from '../ConfigManager.js'
import { writeFile, removeFile } from '../../utils/file-system.js'
import type { DeployConfig } from '../../types/index.js'

describe('ConfigManager', () => {
  const testConfigFile = 'test-deploy.config.json'
  const testConfig: DeployConfig = {
    name: 'test-app',
    version: '1.0.0',
    environment: 'development',
    platform: 'docker',
    projectType: 'node',
    docker: {
      image: 'test-app',
      tag: 'latest',
    },
    healthCheck: {
      enabled: true,
      path: '/health',
      port: 3000,
    },
  }

  beforeEach(async () => {
    // 创建测试配置文件
    await writeFile(testConfigFile, JSON.stringify(testConfig, null, 2))
  })

  afterEach(async () => {
    // 清理测试文件
    await removeFile(testConfigFile)
  })

  describe('loadConfig', () => {
    it('should load config from file', async () => {
      const manager = new ConfigManager({ configFile: testConfigFile })
      const config = await manager.loadConfig()
      
      expect(config.name).toBe('test-app')
      expect(config.version).toBe('1.0.0')
      expect(config.environment).toBe('development')
    })

    it('should throw error if file not found', async () => {
      const manager = new ConfigManager({ configFile: 'nonexistent.json' })
      
      await expect(manager.loadConfig()).rejects.toThrow('Config file not found')
    })

    it('should validate config after loading', async () => {
      // 创建无效配置
      const invalidConfig = { name: '', version: '' }
      await writeFile('invalid.config.json', JSON.stringify(invalidConfig))
      
      const manager = new ConfigManager({ configFile: 'invalid.config.json' })
      
      await expect(manager.loadConfig()).rejects.toThrow()
      
      await removeFile('invalid.config.json')
    })
  })

  describe('saveConfig', () => {
    it('should save config to file', async () => {
      const manager = new ConfigManager({ configFile: 'new-config.json' })
      await manager.saveConfig(testConfig)
      
      const loaded = new ConfigManager({ configFile: 'new-config.json' })
      const config = await loaded.loadConfig()
      
      expect(config.name).toBe('test-app')
      
      await removeFile('new-config.json')
    })

    it('should validate before saving', async () => {
      const manager = new ConfigManager({ configFile: 'new-config.json' })
      const invalidConfig = { ...testConfig, name: '' }
      
      await expect(manager.saveConfig(invalidConfig as any)).rejects.toThrow()
    })
  })

  describe('getConfig', () => {
    it('should return loaded config', async () => {
      const manager = new ConfigManager({ configFile: testConfigFile })
      await manager.loadConfig()
      
      const config = manager.getConfig()
      expect(config.name).toBe('test-app')
    })

    it('should throw if config not loaded', () => {
      const manager = new ConfigManager()
      
      expect(() => manager.getConfig()).toThrow('Config not loaded')
    })
  })

  describe('updateConfig', () => {
    it('should update config', async () => {
      const manager = new ConfigManager({ configFile: testConfigFile })
      await manager.loadConfig()
      
      manager.updateConfig({ version: '2.0.0' })
      
      const config = manager.getConfig()
      expect(config.version).toBe('2.0.0')
      expect(config.name).toBe('test-app') // 其他字段保持不变
    })
  })

  describe('env variables', () => {
    it('should get environment variables', async () => {
      const manager = new ConfigManager({ configFile: testConfigFile })
      await manager.loadConfig()
      
      manager.setEnvVariable('NODE_ENV', 'production')
      manager.setEnvVariable('PORT', '8080')
      
      const vars = manager.getEnvVariables()
      
      expect(vars.NODE_ENV).toBe('production')
      expect(vars.PORT).toBe('8080')
    })

    it('should update existing env variable', async () => {
      const manager = new ConfigManager({ configFile: testConfigFile })
      await manager.loadConfig()
      
      manager.setEnvVariable('PORT', '3000')
      manager.setEnvVariable('PORT', '8080')
      
      const vars = manager.getEnvVariables()
      expect(vars.PORT).toBe('8080')
    })
  })

  describe('secrets', () => {
    it('should manage secrets', async () => {
      const manager = new ConfigManager({ configFile: testConfigFile })
      await manager.loadConfig()
      
      manager.setSecret('DB_PASSWORD', 'secret123')
      
      const secrets = manager.getSecrets()
      expect(secrets).toHaveLength(1)
      expect(secrets[0].name).toBe('DB_PASSWORD')
      expect(secrets[0].value).toBe('secret123')
    })
  })

  describe('createDefaultConfig', () => {
    it('should create default config', () => {
      const config = ConfigManager.createDefaultConfig('my-app')
      
      expect(config.name).toBe('my-app')
      expect(config.version).toBe('1.0.0')
      expect(config.environment).toBe('development')
      expect(config.platform).toBe('docker')
      expect(config.projectType).toBe('node')
    })
  })
})



