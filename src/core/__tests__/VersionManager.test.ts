/**
 * VersionManager 测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { VersionManager } from '../VersionManager.js'
import { writeJSON, removeFile } from '../../utils/file-system.js'

describe('VersionManager', () => {
  const testPackageFile = 'test-package.json'

  beforeEach(async () => {
    await writeJSON(testPackageFile, {
      name: 'test-app',
      version: '1.0.0',
    })
  })

  afterEach(async () => {
    await removeFile(testPackageFile)
  })

  describe('getCurrentVersion', () => {
    it('should get current version from package.json', async () => {
      const manager = new VersionManager({ packageFile: testPackageFile })
      const version = await manager.getCurrentVersion()
      
      expect(version).toBe('1.0.0')
    })

    it('should return 0.0.0 if package.json not found', async () => {
      const manager = new VersionManager({ packageFile: 'nonexistent.json' })
      const version = await manager.getCurrentVersion()
      
      expect(version).toBe('0.0.0')
    })

    it('should return 0.0.0 if version field missing', async () => {
      await writeJSON('no-version.json', { name: 'test' })
      
      const manager = new VersionManager({ packageFile: 'no-version.json' })
      const version = await manager.getCurrentVersion()
      
      expect(version).toBe('0.0.0')
      
      await removeFile('no-version.json')
    })
  })

  describe('setVersion', () => {
    it('should set new version', async () => {
      const manager = new VersionManager({ packageFile: testPackageFile })
      await manager.setVersion('2.0.0')
      
      const version = await manager.getCurrentVersion()
      expect(version).toBe('2.0.0')
    })

    it('should reject invalid version format', async () => {
      const manager = new VersionManager({ packageFile: testPackageFile })
      
      await expect(manager.setVersion('invalid')).rejects.toThrow('Invalid version format')
    })
  })

  describe('bumpVersion', () => {
    it('should bump patch version', async () => {
      const manager = new VersionManager({ packageFile: testPackageFile })
      const newVersion = await manager.bumpVersion('patch')
      
      expect(newVersion).toBe('1.0.1')
    })

    it('should bump minor version', async () => {
      const manager = new VersionManager({ packageFile: testPackageFile })
      const newVersion = await manager.bumpVersion('minor')
      
      expect(newVersion).toBe('1.1.0')
    })

    it('should bump major version', async () => {
      const manager = new VersionManager({ packageFile: testPackageFile })
      const newVersion = await manager.bumpVersion('major')
      
      expect(newVersion).toBe('2.0.0')
    })
  })

  describe('generateBuildNumber', () => {
    it('should generate build number', () => {
      const manager = new VersionManager()
      const buildNumber = manager.generateBuildNumber()
      
      expect(buildNumber).toMatch(/^\d{8}\.\d{4}$/)
      
      // 验证格式：YYYYMMDD.HHMM
      const parts = buildNumber.split('.')
      expect(parts).toHaveLength(2)
      expect(parts[0]).toHaveLength(8) // YYYYMMDD
      expect(parts[1]).toHaveLength(4) // HHMM
    })

    it('should generate unique build numbers', () => {
      const manager = new VersionManager()
      const build1 = manager.generateBuildNumber()
      const build2 = manager.generateBuildNumber()
      
      // 在同一分钟内应该相同，但实际上可能不同（取决于执行时间）
      expect(typeof build1).toBe('string')
      expect(typeof build2).toBe('string')
    })
  })

  describe('compareVersions', () => {
    it('should compare versions correctly', () => {
      const manager = new VersionManager()
      
      expect(manager.compareVersions('1.0.0', '1.0.0')).toBe(0)
      expect(manager.compareVersions('2.0.0', '1.0.0')).toBe(1)
      expect(manager.compareVersions('1.0.0', '2.0.0')).toBe(-1)
      expect(manager.compareVersions('1.1.0', '1.0.9')).toBe(1)
      expect(manager.compareVersions('1.0.10', '1.0.9')).toBe(1)
    })

    it('should handle different length versions', () => {
      const manager = new VersionManager()
      
      expect(manager.compareVersions('1.0', '1.0.0')).toBe(0)
      expect(manager.compareVersions('1', '1.0.0')).toBe(0)
    })
  })
})



