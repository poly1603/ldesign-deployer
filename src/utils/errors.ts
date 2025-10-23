/**
 * 自定义错误类型
 */

/**
 * 基础部署器错误
 */
export class DeployerError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'DeployerError'
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
    }
  }
}

/**
 * 配置错误
 */
export class ConfigError extends DeployerError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIG_ERROR', details)
    this.name = 'ConfigError'
  }
}

/**
 * 验证错误
 */
export class ValidationError extends DeployerError {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message, 'VALIDATION_ERROR', { field, value })
    this.name = 'ValidationError'
  }
}

/**
 * 部署错误
 */
export class DeploymentError extends DeployerError {
  constructor(
    message: string,
    public phase?: string,
    details?: any
  ) {
    super(message, 'DEPLOYMENT_ERROR', { phase, ...details })
    this.name = 'DeploymentError'
  }
}

/**
 * Docker 错误
 */
export class DockerError extends DeployerError {
  constructor(
    message: string,
    public operation?: string,
    details?: any
  ) {
    super(message, 'DOCKER_ERROR', { operation, ...details })
    this.name = 'DockerError'
  }
}

/**
 * Kubernetes 错误
 */
export class KubernetesError extends DeployerError {
  constructor(
    message: string,
    public resource?: string,
    details?: any
  ) {
    super(message, 'KUBERNETES_ERROR', { resource, ...details })
    this.name = 'KubernetesError'
  }
}

/**
 * 回滚错误
 */
export class RollbackError extends DeployerError {
  constructor(
    message: string,
    public targetVersion?: string,
    details?: any
  ) {
    super(message, 'ROLLBACK_ERROR', { targetVersion, ...details })
    this.name = 'RollbackError'
  }
}

/**
 * 健康检查错误
 */
export class HealthCheckError extends DeployerError {
  constructor(
    message: string,
    public checkType?: string,
    details?: any
  ) {
    super(message, 'HEALTH_CHECK_ERROR', { checkType, ...details })
    this.name = 'HealthCheckError'
  }
}

/**
 * 文件系统错误
 */
export class FileSystemError extends DeployerError {
  constructor(
    message: string,
    public path?: string,
    details?: any
  ) {
    super(message, 'FILESYSTEM_ERROR', { path, ...details })
    this.name = 'FileSystemError'
  }
}

/**
 * 网络错误
 */
export class NetworkError extends DeployerError {
  constructor(
    message: string,
    public url?: string,
    public statusCode?: number,
    details?: any
  ) {
    super(message, 'NETWORK_ERROR', { url, statusCode, ...details })
    this.name = 'NetworkError'
  }
}

/**
 * 超时错误
 */
export class TimeoutError extends DeployerError {
  constructor(
    message: string,
    public operation?: string,
    public timeout?: number
  ) {
    super(message, 'TIMEOUT_ERROR', { operation, timeout })
    this.name = 'TimeoutError'
  }
}

/**
 * 错误工厂函数
 */
export function createError(
  type: 'config' | 'validation' | 'deployment' | 'docker' | 'kubernetes' | 'rollback' | 'healthcheck' | 'filesystem' | 'network' | 'timeout',
  message: string,
  details?: any
): DeployerError {
  switch (type) {
    case 'config':
      return new ConfigError(message, details)
    case 'validation':
      return new ValidationError(message, details?.field, details?.value)
    case 'deployment':
      return new DeploymentError(message, details?.phase, details)
    case 'docker':
      return new DockerError(message, details?.operation, details)
    case 'kubernetes':
      return new KubernetesError(message, details?.resource, details)
    case 'rollback':
      return new RollbackError(message, details?.targetVersion, details)
    case 'healthcheck':
      return new HealthCheckError(message, details?.checkType, details)
    case 'filesystem':
      return new FileSystemError(message, details?.path, details)
    case 'network':
      return new NetworkError(message, details?.url, details?.statusCode, details)
    case 'timeout':
      return new TimeoutError(message, details?.operation, details?.timeout)
    default:
      return new DeployerError(message, 'UNKNOWN_ERROR', details)
  }
}

/**
 * 错误处理辅助函数
 */
export function handleError(error: unknown): DeployerError {
  if (error instanceof DeployerError) {
    return error
  }

  if (error instanceof Error) {
    return new DeployerError(error.message, 'UNKNOWN_ERROR', {
      originalError: error.name,
      stack: error.stack,
    })
  }

  return new DeployerError(
    String(error),
    'UNKNOWN_ERROR',
    { originalError: error }
  )
}

/**
 * 格式化错误消息
 */
export function formatError(error: DeployerError): string {
  let message = `[${error.code}] ${error.message}`

  if (error.details) {
    const detailsStr = Object.entries(error.details)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ')

    if (detailsStr) {
      message += `\nDetails: ${detailsStr}`
    }
  }

  return message
}




