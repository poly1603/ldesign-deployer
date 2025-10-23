/**
 * 配置验证工具
 */

import type { DeployConfig, Environment, Platform, ProjectType } from '../types/index.js'

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * 验证部署配置
 */
export function validateDeployConfig(config: DeployConfig): void {
  const errors: string[] = []

  // 必填字段
  if (!config.name) {
    errors.push('name is required')
  }

  if (!config.version) {
    errors.push('version is required')
  }

  if (!config.environment) {
    errors.push('environment is required')
  }

  if (!config.platform) {
    errors.push('platform is required')
  }

  // 验证环境
  if (config.environment && !isValidEnvironment(config.environment)) {
    errors.push(`Invalid environment: ${config.environment}`)
  }

  // 验证平台
  if (config.platform && !isValidPlatform(config.platform)) {
    errors.push(`Invalid platform: ${config.platform}`)
  }

  // 验证项目类型
  if (config.projectType && !isValidProjectType(config.projectType)) {
    errors.push(`Invalid project type: ${config.projectType}`)
  }

  // 验证 Docker 配置
  if (config.platform === 'docker' || config.platform === 'docker-compose') {
    if (!config.docker?.image) {
      errors.push('docker.image is required for Docker platform')
    }
  }

  // 验证 Kubernetes 配置
  if (config.platform === 'kubernetes') {
    if (!config.kubernetes) {
      errors.push('kubernetes configuration is required for Kubernetes platform')
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(`Configuration validation failed:\n${errors.join('\n')}`)
  }
}

/**
 * 验证环境名称
 */
export function isValidEnvironment(env: string): env is Environment {
  return ['development', 'test', 'staging', 'production'].includes(env)
}

/**
 * 验证平台
 */
export function isValidPlatform(platform: string): platform is Platform {
  return ['docker', 'kubernetes', 'docker-compose'].includes(platform)
}

/**
 * 验证项目类型
 */
export function isValidProjectType(type: string): type is ProjectType {
  return ['node', 'static', 'spa', 'ssr', 'custom'].includes(type)
}

/**
 * 验证版本号（SemVer）
 */
export function isValidVersion(version: string): boolean {
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/
  return semverRegex.test(version)
}

/**
 * 验证端口号
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port > 0 && port <= 65535
}

/**
 * 验证 Docker 镜像名称
 */
export function isValidDockerImage(image: string): boolean {
  // 简化的镜像名称验证
  const imageRegex = /^[a-z0-9]+([\._-][a-z0-9]+)*(\/.+)?$/i
  return imageRegex.test(image)
}

/**
 * 验证 Kubernetes 资源名称
 */
export function isValidK8sName(name: string): boolean {
  // K8s 名称规则：小写字母、数字、-，最多 253 字符
  const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/
  return name.length <= 253 && k8sNameRegex.test(name)
}

/**
 * 验证命名空间
 */
export function isValidNamespace(namespace: string): boolean {
  return isValidK8sName(namespace)
}

/**
 * 验证 URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 验证路径
 */
export function isValidPath(path: string): boolean {
  return path.startsWith('/')
}

/**
 * 验证百分比（0-100）
 */
export function isValidPercentage(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100
}

/**
 * 验证资源值（CPU/内存）
 */
export function isValidResourceValue(value: string): boolean {
  // 支持格式：100m, 1, 1.5, 100Mi, 1Gi
  const resourceRegex = /^([0-9]+(\.[0-9]+)?)(m|[EPTGMK]i?)?$/
  return resourceRegex.test(value)
}




