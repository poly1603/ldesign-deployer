/**
 * 验证器测试
 */

import { describe, it, expect } from 'vitest'
import {
  isValidEnvironment,
  isValidPlatform,
  isValidProjectType,
  isValidVersion,
  isValidPort,
  isValidDockerImage,
  isValidK8sName,
  isValidNamespace,
  isValidUrl,
  isValidPath,
  isValidPercentage,
  isValidResourceValue,
} from '../validator.js'

describe('isValidEnvironment', () => {
  it('should validate valid environments', () => {
    expect(isValidEnvironment('development')).toBe(true)
    expect(isValidEnvironment('test')).toBe(true)
    expect(isValidEnvironment('staging')).toBe(true)
    expect(isValidEnvironment('production')).toBe(true)
  })

  it('should reject invalid environments', () => {
    expect(isValidEnvironment('invalid')).toBe(false)
    expect(isValidEnvironment('prod')).toBe(false)
    expect(isValidEnvironment('')).toBe(false)
  })
})

describe('isValidPlatform', () => {
  it('should validate valid platforms', () => {
    expect(isValidPlatform('docker')).toBe(true)
    expect(isValidPlatform('kubernetes')).toBe(true)
    expect(isValidPlatform('docker-compose')).toBe(true)
  })

  it('should reject invalid platforms', () => {
    expect(isValidPlatform('k8s')).toBe(false)
    expect(isValidPlatform('aws')).toBe(false)
  })
})

describe('isValidProjectType', () => {
  it('should validate valid project types', () => {
    expect(isValidProjectType('node')).toBe(true)
    expect(isValidProjectType('static')).toBe(true)
    expect(isValidProjectType('spa')).toBe(true)
    expect(isValidProjectType('ssr')).toBe(true)
    expect(isValidProjectType('custom')).toBe(true)
  })

  it('should reject invalid project types', () => {
    expect(isValidProjectType('react')).toBe(false)
    expect(isValidProjectType('vue')).toBe(false)
  })
})

describe('isValidVersion', () => {
  it('should validate valid semantic versions', () => {
    expect(isValidVersion('1.0.0')).toBe(true)
    expect(isValidVersion('0.0.1')).toBe(true)
    expect(isValidVersion('10.20.30')).toBe(true)
    expect(isValidVersion('1.0.0-alpha')).toBe(true)
    expect(isValidVersion('1.0.0-beta.1')).toBe(true)
    expect(isValidVersion('1.0.0+build.123')).toBe(true)
  })

  it('should reject invalid versions', () => {
    expect(isValidVersion('1.0')).toBe(false)
    expect(isValidVersion('v1.0.0')).toBe(false)
    expect(isValidVersion('1')).toBe(false)
    expect(isValidVersion('abc')).toBe(false)
  })
})

describe('isValidPort', () => {
  it('should validate valid ports', () => {
    expect(isValidPort(80)).toBe(true)
    expect(isValidPort(3000)).toBe(true)
    expect(isValidPort(8080)).toBe(true)
    expect(isValidPort(65535)).toBe(true)
  })

  it('should reject invalid ports', () => {
    expect(isValidPort(0)).toBe(false)
    expect(isValidPort(-1)).toBe(false)
    expect(isValidPort(65536)).toBe(false)
    expect(isValidPort(3000.5)).toBe(false)
  })
})

describe('isValidDockerImage', () => {
  it('should validate valid docker image names', () => {
    expect(isValidDockerImage('nginx')).toBe(true)
    expect(isValidDockerImage('my-app')).toBe(true)
    expect(isValidDockerImage('user/app')).toBe(true)
    expect(isValidDockerImage('registry.io/user/app')).toBe(true)
  })

  it('should reject invalid image names', () => {
    expect(isValidDockerImage('My-App')).toBe(false) // 大写
    expect(isValidDockerImage('-app')).toBe(false) // 开头不能是 -
    expect(isValidDockerImage('app-')).toBe(false) // 结尾不能是 -
  })
})

describe('isValidK8sName', () => {
  it('should validate valid K8s names', () => {
    expect(isValidK8sName('my-app')).toBe(true)
    expect(isValidK8sName('app-123')).toBe(true)
    expect(isValidK8sName('a')).toBe(true)
  })

  it('should reject invalid K8s names', () => {
    expect(isValidK8sName('My-App')).toBe(false) // 大写
    expect(isValidK8sName('-app')).toBe(false) // 开头不能是 -
    expect(isValidK8sName('app-')).toBe(false) // 结尾不能是 -
    expect(isValidK8sName('a'.repeat(254))).toBe(false) // 太长
  })
})

describe('isValidNamespace', () => {
  it('should use same rules as K8s names', () => {
    expect(isValidNamespace('default')).toBe(true)
    expect(isValidNamespace('my-namespace')).toBe(true)
  })
})

describe('isValidUrl', () => {
  it('should validate valid URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true)
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('https://example.com/path')).toBe(true)
    expect(isValidUrl('https://example.com:8080')).toBe(true)
  })

  it('should reject invalid URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false)
    expect(isValidUrl('ftp://example.com')).toBe(true) // FTP 也是有效的 URL
    expect(isValidUrl('')).toBe(false)
  })
})

describe('isValidPath', () => {
  it('should validate valid paths', () => {
    expect(isValidPath('/')).toBe(true)
    expect(isValidPath('/api')).toBe(true)
    expect(isValidPath('/api/v1')).toBe(true)
  })

  it('should reject invalid paths', () => {
    expect(isValidPath('api')).toBe(false) // 必须以 / 开头
    expect(isValidPath('')).toBe(false)
  })
})

describe('isValidPercentage', () => {
  it('should validate valid percentages', () => {
    expect(isValidPercentage(0)).toBe(true)
    expect(isValidPercentage(50)).toBe(true)
    expect(isValidPercentage(100)).toBe(true)
    expect(isValidPercentage(0.5)).toBe(true)
  })

  it('should reject invalid percentages', () => {
    expect(isValidPercentage(-1)).toBe(false)
    expect(isValidPercentage(101)).toBe(false)
    expect(isValidPercentage(Infinity)).toBe(false)
    expect(isValidPercentage(NaN)).toBe(false)
  })
})

describe('isValidResourceValue', () => {
  it('should validate valid resource values', () => {
    expect(isValidResourceValue('100m')).toBe(true) // CPU millicores
    expect(isValidResourceValue('1')).toBe(true) // 1 core
    expect(isValidResourceValue('1.5')).toBe(true) // 1.5 cores
    expect(isValidResourceValue('100Mi')).toBe(true) // Memory
    expect(isValidResourceValue('1Gi')).toBe(true)
    expect(isValidResourceValue('1G')).toBe(true)
    expect(isValidResourceValue('1M')).toBe(true)
    expect(isValidResourceValue('1K')).toBe(true)
  })

  it('should reject invalid resource values', () => {
    expect(isValidResourceValue('100')).toBe(true) // 纯数字也是有效的
    expect(isValidResourceValue('abc')).toBe(false)
    expect(isValidResourceValue('1.5.3')).toBe(false)
    expect(isValidResourceValue('')).toBe(false)
  })
})




