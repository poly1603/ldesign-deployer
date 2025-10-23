/**
 * 分层错误处理系统
 * 提供统一的错误类型和详细的错误信息
 */

/**
 * 基础部署错误类
 */
export class DeployerError extends Error {
  public readonly code: string
  public readonly details?: any
  public readonly recoverable: boolean
  public readonly suggestion?: string

  constructor(
    message: string,
    code: string,
    options?: {
      details?: any
      recoverable?: boolean
      suggestion?: string
      cause?: Error
    }
  ) {
    super(message)
    this.name = 'DeployerError'
    this.code = code
    this.details = options?.details
    this.recoverable = options?.recoverable ?? false
    this.suggestion = options?.suggestion

    if (options?.cause) {
      this.cause = options.cause
    }

    // 保持正确的堆栈跟踪
    Error.captureStackTrace?.(this, this.constructor)
  }

  /**
   * 格式化错误信息
   */
  format(): string {
    const lines = [
      `❌ ${this.name}: ${this.message}`,
      `   Code: ${this.code}`,
    ]

    if (this.suggestion) {
      lines.push(`   💡 Suggestion: ${this.suggestion}`)
    }

    if (this.details) {
      lines.push(`   Details: ${JSON.stringify(this.details, null, 2)}`)
    }

    if (this.cause instanceof Error) {
      lines.push(`   Caused by: ${this.cause.message}`)
    }

    return lines.join('\n')
  }
}

/**
 * 配置相关错误
 */
export class ConfigError extends DeployerError {
  constructor(
    message: string,
    options?: {
      field?: string
      details?: any
      suggestion?: string
      cause?: Error
    }
  ) {
    super(message, 'CONFIG_ERROR', {
      details: options?.field ? { field: options.field, ...options?.details } : options?.details,
      recoverable: true,
      suggestion: options?.suggestion,
      cause: options?.cause,
    })
    this.name = 'ConfigError'
  }
}

/**
 * 验证错误
 */
export class ValidationError extends DeployerError {
  public readonly field?: string
  public readonly errors?: any[]

  constructor(
    message: string,
    field?: string,
    options?: {
      errors?: any[]
      details?: any
      suggestion?: string
      cause?: Error
    }
  ) {
    super(message, 'VALIDATION_ERROR', {
      details: options?.details,
      recoverable: true,
      suggestion: options?.suggestion || '请检查配置文件格式是否正确',
      cause: options?.cause,
    })
    this.name = 'ValidationError'
    this.field = field
    this.errors = options?.errors
  }

  /**
   * 格式化验证错误
   */
  override format(): string {
    const lines = [super.format()]

    if (this.errors && this.errors.length > 0) {
      lines.push('   Validation Errors:')
      this.errors.forEach((err, index) => {
        lines.push(`     ${index + 1}. ${err.path?.join('.') || 'root'}: ${err.message}`)
      })
    }

    return lines.join('\n')
  }
}

/**
 * 部署错误
 */
export class DeploymentError extends DeployerError {
  public readonly phase?: string

  constructor(
    message: string,
    phase?: string,
    options?: {
      details?: any
      recoverable?: boolean
      suggestion?: string
      cause?: Error
    }
  ) {
    super(message, 'DEPLOYMENT_ERROR', {
      details: { phase, ...options?.details },
      recoverable: options?.recoverable ?? false,
      suggestion: options?.suggestion,
      cause: options?.cause,
    })
    this.name = 'DeploymentError'
    this.phase = phase
  }
}

/**
 * Docker 相关错误
 */
export class DockerError extends DeployerError {
  constructor(
    message: string,
    options?: {
      command?: string
      details?: any
      suggestion?: string
      cause?: Error
    }
  ) {
    super(message, 'DOCKER_ERROR', {
      details: options?.command ? { command: options.command, ...options?.details } : options?.details,
      recoverable: true,
      suggestion: options?.suggestion || '请检查 Docker 是否正常运行',
      cause: options?.cause,
    })
    this.name = 'DockerError'
  }
}

/**
 * Kubernetes 相关错误
 */
export class KubernetesError extends DeployerError {
  constructor(
    message: string,
    options?: {
      resource?: string
      namespace?: string
      details?: any
      suggestion?: string
      cause?: Error
    }
  ) {
    super(message, 'KUBERNETES_ERROR', {
      details: {
        resource: options?.resource,
        namespace: options?.namespace,
        ...options?.details,
      },
      recoverable: true,
      suggestion: options?.suggestion || '请检查 kubectl 配置和集群连接',
      cause: options?.cause,
    })
    this.name = 'KubernetesError'
  }
}

/**
 * 超时错误
 */
export class TimeoutError extends DeployerError {
  public readonly timeout: number

  constructor(
    message: string,
    operation: string,
    timeout: number,
    options?: {
      suggestion?: string
      cause?: Error
    }
  ) {
    super(message, 'TIMEOUT_ERROR', {
      details: { operation, timeout },
      recoverable: true,
      suggestion: options?.suggestion || `操作超时，请增加超时时间或检查网络连接`,
      cause: options?.cause,
    })
    this.name = 'TimeoutError'
    this.timeout = timeout
  }
}

/**
 * 网络错误
 */
export class NetworkError extends DeployerError {
  constructor(
    message: string,
    options?: {
      url?: string
      statusCode?: number
      details?: any
      suggestion?: string
      cause?: Error
    }
  ) {
    super(message, 'NETWORK_ERROR', {
      details: {
        url: options?.url,
        statusCode: options?.statusCode,
        ...options?.details,
      },
      recoverable: true,
      suggestion: options?.suggestion || '请检查网络连接和服务可用性',
      cause: options?.cause,
    })
    this.name = 'NetworkError'
  }
}

/**
 * 权限错误
 */
export class PermissionError extends DeployerError {
  constructor(
    message: string,
    options?: {
      resource?: string
      details?: any
      suggestion?: string
      cause?: Error
    }
  ) {
    super(message, 'PERMISSION_ERROR', {
      details: { resource: options?.resource, ...options?.details },
      recoverable: false,
      suggestion: options?.suggestion || '请检查用户权限和访问凭证',
      cause: options?.cause,
    })
    this.name = 'PermissionError'
  }
}

/**
 * 文件系统错误
 */
export class FileSystemError extends DeployerError {
  constructor(
    message: string,
    options?: {
      path?: string
      operation?: string
      details?: any
      suggestion?: string
      cause?: Error
    }
  ) {
    super(message, 'FILESYSTEM_ERROR', {
      details: {
        path: options?.path,
        operation: options?.operation,
        ...options?.details,
      },
      recoverable: true,
      suggestion: options?.suggestion || '请检查文件路径和权限',
      cause: options?.cause,
    })
    this.name = 'FileSystemError'
  }
}

/**
 * 健康检查错误
 */
export class HealthCheckError extends DeployerError {
  public readonly checks: Array<{ name: string; passed: boolean; message: string }>

  constructor(
    message: string,
    checks: Array<{ name: string; passed: boolean; message: string }>,
    options?: {
      suggestion?: string
      cause?: Error
    }
  ) {
    super(message, 'HEALTH_CHECK_ERROR', {
      details: { checks },
      recoverable: true,
      suggestion: options?.suggestion || '请检查应用健康状态和配置',
      cause: options?.cause,
    })
    this.name = 'HealthCheckError'
    this.checks = checks
  }

  /**
   * 格式化健康检查错误
   */
  override format(): string {
    const lines = [super.format()]

    if (this.checks && this.checks.length > 0) {
      lines.push('   Failed Checks:')
      this.checks
        .filter(check => !check.passed)
        .forEach((check, index) => {
          lines.push(`     ${index + 1}. ${check.name}: ${check.message}`)
        })
    }

    return lines.join('\n')
  }
}

/**
 * 锁错误
 */
export class LockError extends DeployerError {
  constructor(
    message: string,
    options?: {
      lockId?: string
      details?: any
      suggestion?: string
      cause?: Error
    }
  ) {
    super(message, 'LOCK_ERROR', {
      details: { lockId: options?.lockId, ...options?.details },
      recoverable: true,
      suggestion: options?.suggestion || '等待当前部署完成或使用 lock:release 强制释放锁',
      cause: options?.cause,
    })
    this.name = 'LockError'
  }
}

/**
 * 判断错误是否可恢复
 */
export function isRecoverableError(error: Error): boolean {
  if (error instanceof DeployerError) {
    return error.recoverable
  }
  return false
}

/**
 * 格式化错误信息
 */
export function formatError(error: Error): string {
  if (error instanceof DeployerError) {
    return error.format()
  }
  return `❌ Error: ${error.message}\n   ${error.stack || ''}`
}

/**
 * 包装原生错误为 DeployerError
 */
export function wrapError(error: unknown, context?: string): DeployerError {
  if (error instanceof DeployerError) {
    return error
  }

  if (error instanceof Error) {
    return new DeployerError(
      context ? `${context}: ${error.message}` : error.message,
      'UNKNOWN_ERROR',
      { cause: error, recoverable: false }
    )
  }

  return new DeployerError(
    String(error),
    'UNKNOWN_ERROR',
    { recoverable: false }
  )
}


