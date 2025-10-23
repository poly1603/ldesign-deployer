/**
 * Docker 相关类型定义
 */

/**
 * Dockerfile 生成选项
 */
export interface DockerfileOptions {
  projectType: 'node' | 'static' | 'spa' | 'custom'
  nodeVersion?: string
  baseImage?: string
  workDir?: string
  port?: number
  buildCommand?: string
  startCommand?: string
  installCommand?: string
  multiStage?: boolean
  optimize?: boolean
}

/**
 * 镜像构建选项
 */
export interface BuildOptions {
  context: string
  dockerfile?: string
  tag: string
  buildArgs?: Record<string, string>
  target?: string
  platform?: string
  cache?: boolean
  pull?: boolean
  noCache?: boolean
  progress?: 'auto' | 'plain' | 'tty'
}

/**
 * 镜像推送选项
 */
export interface PushOptions {
  image: string
  tag: string
  registry?: string
  auth?: {
    username: string
    password: string
  }
}

/**
 * 镜像信息
 */
export interface ImageInfo {
  id: string
  tags: string[]
  size: number
  created: string
}

/**
 * 镜像优化建议
 */
export interface OptimizationSuggestion {
  type: 'size' | 'layers' | 'cache' | 'security'
  severity: 'low' | 'medium' | 'high'
  message: string
  suggestion: string
}

/**
 * Docker Compose 服务
 */
export interface ComposeService {
  image?: string
  build?: {
    context: string
    dockerfile?: string
    args?: Record<string, string>
  }
  container_name?: string
  ports?: string[]
  environment?: Record<string, string> | string[]
  volumes?: string[]
  depends_on?: string[]
  restart?: 'no' | 'always' | 'on-failure' | 'unless-stopped'
  networks?: string[]
  command?: string | string[]
  healthcheck?: {
    test: string | string[]
    interval?: string
    timeout?: string
    retries?: number
    start_period?: string
  }
}

/**
 * Docker Compose 配置
 */
export interface ComposeConfig {
  version: string
  services: Record<string, ComposeService>
  networks?: Record<string, {
    driver?: string
    external?: boolean
  }>
  volumes?: Record<string, {
    driver?: string
    external?: boolean
  }>
}




