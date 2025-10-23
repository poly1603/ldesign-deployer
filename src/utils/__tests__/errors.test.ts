/**
 * 错误类型测试
 */

import { describe, it, expect } from 'vitest'
import {
  DeployerError,
  ConfigError,
  ValidationError,
  DeploymentError,
  DockerError,
  KubernetesError,
  createError,
  handleError,
  formatError,
} from '../errors.js'

describe('DeployerError', () => {
  it('should create a basic error', () => {
    const error = new DeployerError('Test error', 'TEST_CODE')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(DeployerError)
    expect(error.message).toBe('Test error')
    expect(error.code).toBe('TEST_CODE')
    expect(error.name).toBe('DeployerError')
  })

  it('should include details', () => {
    const details = { foo: 'bar', baz: 123 }
    const error = new DeployerError('Test error', 'TEST_CODE', details)

    expect(error.details).toEqual(details)
  })

  it('should convert to JSON', () => {
    const error = new DeployerError('Test error', 'TEST_CODE', { foo: 'bar' })
    const json = error.toJSON()

    expect(json).toHaveProperty('name', 'DeployerError')
    expect(json).toHaveProperty('code', 'TEST_CODE')
    expect(json).toHaveProperty('message', 'Test error')
    expect(json).toHaveProperty('details')
    expect(json).toHaveProperty('stack')
  })
})

describe('ConfigError', () => {
  it('should create config error', () => {
    const error = new ConfigError('Invalid config', { field: 'name' })

    expect(error).toBeInstanceOf(ConfigError)
    expect(error).toBeInstanceOf(DeployerError)
    expect(error.code).toBe('CONFIG_ERROR')
    expect(error.name).toBe('ConfigError')
  })
})

describe('ValidationError', () => {
  it('should create validation error with field', () => {
    const error = new ValidationError('Invalid value', 'email', 'invalid@')

    expect(error).toBeInstanceOf(ValidationError)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.field).toBe('email')
    expect(error.value).toBe('invalid@')
  })
})

describe('DeploymentError', () => {
  it('should create deployment error with phase', () => {
    const error = new DeploymentError('Deploy failed', 'build')

    expect(error).toBeInstanceOf(DeploymentError)
    expect(error.code).toBe('DEPLOYMENT_ERROR')
    expect(error.phase).toBe('build')
  })
})

describe('DockerError', () => {
  it('should create docker error with operation', () => {
    const error = new DockerError('Build failed', 'build')

    expect(error).toBeInstanceOf(DockerError)
    expect(error.code).toBe('DOCKER_ERROR')
    expect(error.operation).toBe('build')
  })
})

describe('KubernetesError', () => {
  it('should create kubernetes error with resource', () => {
    const error = new KubernetesError('Deploy failed', 'deployment/my-app')

    expect(error).toBeInstanceOf(KubernetesError)
    expect(error.code).toBe('KUBERNETES_ERROR')
    expect(error.resource).toBe('deployment/my-app')
  })
})

describe('createError', () => {
  it('should create config error', () => {
    const error = createError('config', 'Test message')
    expect(error).toBeInstanceOf(ConfigError)
  })

  it('should create validation error', () => {
    const error = createError('validation', 'Test message', { field: 'name' })
    expect(error).toBeInstanceOf(ValidationError)
  })

  it('should create deployment error', () => {
    const error = createError('deployment', 'Test message', { phase: 'build' })
    expect(error).toBeInstanceOf(DeploymentError)
  })

  it('should create docker error', () => {
    const error = createError('docker', 'Test message', { operation: 'build' })
    expect(error).toBeInstanceOf(DockerError)
  })

  it('should create kubernetes error', () => {
    const error = createError('kubernetes', 'Test message', { resource: 'pod' })
    expect(error).toBeInstanceOf(KubernetesError)
  })
})

describe('handleError', () => {
  it('should return DeployerError as is', () => {
    const original = new ConfigError('Test')
    const handled = handleError(original)

    expect(handled).toBe(original)
  })

  it('should wrap standard Error', () => {
    const original = new Error('Standard error')
    const handled = handleError(original)

    expect(handled).toBeInstanceOf(DeployerError)
    expect(handled.message).toBe('Standard error')
    expect(handled.code).toBe('UNKNOWN_ERROR')
  })

  it('should handle string errors', () => {
    const handled = handleError('String error')

    expect(handled).toBeInstanceOf(DeployerError)
    expect(handled.message).toBe('String error')
    expect(handled.code).toBe('UNKNOWN_ERROR')
  })

  it('should handle unknown error types', () => {
    const handled = handleError({ custom: 'error' })

    expect(handled).toBeInstanceOf(DeployerError)
    expect(handled.code).toBe('UNKNOWN_ERROR')
  })
})

describe('formatError', () => {
  it('should format basic error', () => {
    const error = new DeployerError('Test error', 'TEST_CODE')
    const formatted = formatError(error)

    expect(formatted).toBe('[TEST_CODE] Test error')
  })

  it('should format error with details', () => {
    const error = new DeployerError('Test error', 'TEST_CODE', {
      field: 'name',
      value: 123,
    })
    const formatted = formatError(error)

    expect(formatted).toContain('[TEST_CODE] Test error')
    expect(formatted).toContain('Details:')
    expect(formatted).toContain('field')
    expect(formatted).toContain('value')
  })

  it('should skip undefined details', () => {
    const error = new DeployerError('Test error', 'TEST_CODE', {
      field: 'name',
      value: undefined,
    })
    const formatted = formatError(error)

    expect(formatted).toContain('field')
    expect(formatted).not.toContain('value')
  })
})




