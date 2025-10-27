/**
 * 配置验证工具
 * @module utils/validator
 */

import type { DeployConfig, Environment, Platform, ProjectType } from '../types/index.js'
import { ValidationError } from './errors.js'

/**
 * 验证部署配置
 * 
 * @description 验证部署配置的完整性和正确性，包括必填字段、环境、平台、项目类型等
 * @param config - 部署配置对象
 * @throws {ValidationError} 当配置验证失败时抛出
 * 
 * @example
 * ```typescript
 * const config: DeployConfig = {
 *   name: 'my-app',
 *   version: '1.0.0',
 *   environment: 'production',
 *   platform: 'docker',
 *   projectType: 'node'
 * };
 * 
 * validateDeployConfig(config); // 验证通过
 * ```
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
    throw new ValidationError(
      `Configuration validation failed:\n${errors.join('\n')}`,
      undefined,
      { suggestion: '请检查配置文件中的必填字段和格式' }
    )
  }
}

/**
 * 验证环境名称
 * 
 * @description 检查环境名称是否为有效的部署环境
 * @param env - 要验证的环境名称
 * @returns 如果是有效环境则返回 true（类型守卫）
 * 
 * @example
 * ```typescript
 * isValidEnvironment('production'); // true
 * isValidEnvironment('invalid'); // false
 * ```
 */
export function isValidEnvironment(env: string): env is Environment {
  return ['development', 'test', 'staging', 'production'].includes(env)
}

/**
 * 验证部署平台
 * 
 * @description 检查平台名称是否为支持的部署平台
 * @param platform - 要验证的平台名称
 * @returns 如果是有效平台则返回 true（类型守卫）
 * 
 * @example
 * ```typescript
 * isValidPlatform('docker'); // true
 * isValidPlatform('heroku'); // false
 * ```
 */
export function isValidPlatform(platform: string): platform is Platform {
  return ['docker', 'kubernetes', 'docker-compose'].includes(platform)
}

/**
 * 验证项目类型
 * 
 * @description 检查项目类型是否为支持的类型
 * @param type - 要验证的项目类型
 * @returns 如果是有效项目类型则返回 true（类型守卫）
 * 
 * @example
 * ```typescript
 * isValidProjectType('node'); // true
 * isValidProjectType('python'); // false
 * ```
 */
export function isValidProjectType(type: string): type is ProjectType {
  return ['node', 'static', 'spa', 'ssr', 'custom'].includes(type)
}

/**
 * 验证版本号（SemVer）
 * 
 * @description 使用语义化版本规范验证版本号格式
 * @param version - 要验证的版本号
 * @returns 如果符合 SemVer 格式则返回 true
 * 
 * @example
 * ```typescript
 * isValidVersion('1.0.0'); // true
 * isValidVersion('1.0.0-alpha.1'); // true
 * isValidVersion('v1.0.0'); // false
 * isValidVersion('1.0'); // false
 * ```
 * 
 * @see https://semver.org/
 */
export function isValidVersion(version: string): boolean {
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/
  return semverRegex.test(version)
}

/**
 * 验证端口号
 * 
 * @description 检查端口号是否在有效范围内（1-65535）
 * @param port - 要验证的端口号
 * @returns 如果端口号有效则返回 true
 * 
 * @example
 * ```typescript
 * isValidPort(3000); // true
 * isValidPort(80); // true
 * isValidPort(0); // false
 * isValidPort(65536); // false
 * ```
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port > 0 && port <= 65535
}

/**
 * 验证 Docker 镜像名称
 * 
 * @description 检查 Docker 镜像名称格式是否正确
 * @param image - 要验证的镜像名称
 * @returns 如果镜像名称格式正确则返回 true
 * 
 * @example
 * ```typescript
 * isValidDockerImage('nginx'); // true
 * isValidDockerImage('my-app'); // true
 * isValidDockerImage('registry.example.com/my-app'); // true
 * isValidDockerImage('INVALID'); // false (大写不允许)
 * ```
 */
export function isValidDockerImage(image: string): boolean {
  // 简化的镜像名称验证：小写字母、数字、点、下划线、连字符
  const imageRegex = /^[a-z0-9]+([\._-][a-z0-9]+)*(\/.+)?$/i
  return imageRegex.test(image)
}

/**
 * 验证 Kubernetes 资源名称
 * 
 * @description 检查名称是否符合 Kubernetes DNS-1123 子域名规范
 * @param name - 要验证的资源名称
 * @returns 如果名称格式正确则返回 true
 * 
 * @example
 * ```typescript
 * isValidK8sName('my-app'); // true
 * isValidK8sName('app-v1'); // true
 * isValidK8sName('My-App'); // false (大写不允许)
 * isValidK8sName('-app'); // false (不能以连字符开头)
 * ```
 * 
 * @see https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
 */
export function isValidK8sName(name: string): boolean {
  // K8s 名称规则：小写字母、数字、连字符，不能以连字符开头或结尾，最多 253 字符
  const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/
  return name.length <= 253 && k8sNameRegex.test(name)
}

/**
 * 验证 Kubernetes 命名空间
 * 
 * @description 检查命名空间名称是否符合 Kubernetes 规范
 * @param namespace - 要验证的命名空间名称
 * @returns 如果命名空间名称格式正确则返回 true
 * 
 * @example
 * ```typescript
 * isValidNamespace('default'); // true
 * isValidNamespace('my-namespace'); // true
 * ```
 */
export function isValidNamespace(namespace: string): boolean {
  return isValidK8sName(namespace)
}

/**
 * 验证 URL
 * 
 * @description 检查 URL 格式是否正确
 * @param url - 要验证的 URL
 * @returns 如果 URL 格式正确则返回 true
 * 
 * @example
 * ```typescript
 * isValidUrl('https://example.com'); // true
 * isValidUrl('http://localhost:3000'); // true
 * isValidUrl('not-a-url'); // false
 * ```
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
 * 
 * @description 检查路径是否为绝对路径（以 / 开头）
 * @param path - 要验证的路径
 * @returns 如果是绝对路径则返回 true
 * 
 * @example
 * ```typescript
 * isValidPath('/app'); // true
 * isValidPath('/usr/local'); // true
 * isValidPath('relative/path'); // false
 * ```
 */
export function isValidPath(path: string): boolean {
  return path.startsWith('/')
}

/**
 * 验证百分比值
 * 
 * @description 检查数值是否在 0-100 范围内
 * @param value - 要验证的百分比值
 * @returns 如果值在有效范围内则返回 true
 * 
 * @example
 * ```typescript
 * isValidPercentage(50); // true
 * isValidPercentage(0); // true
 * isValidPercentage(100); // true
 * isValidPercentage(101); // false
 * isValidPercentage(-1); // false
 * ```
 */
export function isValidPercentage(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100
}

/**
 * 验证 Kubernetes 资源值（CPU/内存）
 * 
 * @description 检查资源值格式是否符合 Kubernetes 规范
 * @param value - 要验证的资源值
 * @returns 如果资源值格式正确则返回 true
 * 
 * @example
 * ```typescript
 * isValidResourceValue('100m'); // true (100 millicores)
 * isValidResourceValue('1'); // true (1 core)
 * isValidResourceValue('1.5'); // true (1.5 cores)
 * isValidResourceValue('128Mi'); // true (128 MiB)
 * isValidResourceValue('1Gi'); // true (1 GiB)
 * isValidResourceValue('invalid'); // false
 * ```
 * 
 * @see https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
 */
export function isValidResourceValue(value: string): boolean {
  // 支持格式：100m, 1, 1.5, 100Mi, 1Gi
  const resourceRegex = /^([0-9]+(\.[0-9]+)?)(m|[EPTGMK]i?)?$/
  return resourceRegex.test(value)
}




