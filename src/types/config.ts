/**
 * @ldesign/deployer 类型定义
 */

/**
 * 环境类型
 */
export type Environment = 'development' | 'test' | 'staging' | 'production'

/**
 * 部署平台
 */
export type Platform = 'docker' | 'kubernetes' | 'docker-compose'

/**
 * 项目类型
 */
export type ProjectType = 'node' | 'static' | 'spa' | 'ssr' | 'custom'

/**
 * 环境变量配置
 */
export interface EnvironmentVariable {
  name: string
  value: string
  secret?: boolean
}

/**
 * 密钥配置
 */
export interface SecretConfig {
  name: string
  value: string
  encrypted?: boolean
}

/**
 * 健康检查配置
 */
export interface HealthCheckConfig {
  enabled: boolean
  path?: string
  port?: number
  interval?: number
  timeout?: number
  retries?: number
  startPeriod?: number
}

/**
 * 资源限制配置
 */
export interface ResourceLimits {
  cpu?: string
  memory?: string
}

/**
 * 资源配置
 */
export interface ResourceConfig {
  requests?: ResourceLimits
  limits?: ResourceLimits
}

/**
 * 部署配置
 */
export interface DeployConfig {
  // 基础配置
  name: string
  version: string
  environment: Environment
  platform: Platform
  projectType: ProjectType

  // 路径配置
  workDir?: string
  outputDir?: string

  // 环境变量
  env?: EnvironmentVariable[]
  secrets?: SecretConfig[]

  // Docker 配置
  docker?: DockerConfig

  // Kubernetes 配置
  kubernetes?: KubernetesConfig

  // 健康检查
  healthCheck?: HealthCheckConfig

  // 钩子
  hooks?: HookConfig
}

/**
 * 钩子配置
 */
export interface HookConfig {
  preDeploy?: string[]
  postDeploy?: string[]
  preRollback?: string[]
  postRollback?: string[]
}

/**
 * Docker 配置
 */
export interface DockerConfig {
  // Dockerfile
  dockerfile?: string
  context?: string
  buildArgs?: Record<string, string>

  // 镜像
  image: string
  tag?: string
  registry?: string

  // 构建选项
  multiStage?: boolean
  target?: string
  platform?: string
  cache?: boolean

  // Compose
  compose?: DockerComposeConfig
}

/**
 * Docker Compose 配置
 */
export interface DockerComposeConfig {
  services?: Record<string, DockerServiceConfig>
  networks?: Record<string, NetworkConfig>
  volumes?: Record<string, VolumeConfig>
}

/**
 * Docker 服务配置
 */
export interface DockerServiceConfig {
  image: string
  build?: {
    context: string
    dockerfile?: string
  }
  ports?: string[]
  environment?: Record<string, string>
  volumes?: string[]
  depends_on?: string[]
  restart?: string
  networks?: string[]
}

/**
 * 网络配置
 */
export interface NetworkConfig {
  driver?: string
  external?: boolean
}

/**
 * 卷配置
 */
export interface VolumeConfig {
  driver?: string
  external?: boolean
}

/**
 * Kubernetes 配置
 */
export interface KubernetesConfig {
  // 基础配置
  namespace?: string
  context?: string

  // Deployment
  deployment?: DeploymentConfig

  // Service
  service?: ServiceConfig

  // Ingress
  ingress?: IngressConfig

  // ConfigMap/Secret
  configMaps?: Record<string, Record<string, string>>
  secrets?: Record<string, Record<string, string>>

  // Helm
  helm?: HelmConfig
}

/**
 * Deployment 配置
 */
export interface DeploymentConfig {
  replicas?: number
  strategy?: DeploymentStrategy
  resources?: ResourceConfig
  livenessProbe?: ProbeConfig
  readinessProbe?: ProbeConfig
  startupProbe?: ProbeConfig
}

/**
 * 部署策略类型
 */
export type DeploymentStrategyType = 'RollingUpdate' | 'Recreate' | 'BlueGreen' | 'Canary'

/**
 * 部署策略配置
 */
export interface DeploymentStrategy {
  type: DeploymentStrategyType
  rollingUpdate?: {
    maxSurge?: number | string
    maxUnavailable?: number | string
  }
  blueGreen?: BlueGreenConfig
  canary?: CanaryConfig
}

/**
 * 蓝绿部署配置
 */
export interface BlueGreenConfig {
  activeService: string
  previewService?: string
  autoPromote?: boolean
  autoPromoteSeconds?: number
}

/**
 * 金丝雀部署配置
 */
export interface CanaryConfig {
  steps: CanaryStep[]
  analysis?: AnalysisConfig
}

/**
 * 金丝雀步骤
 */
export interface CanaryStep {
  weight: number
  pause?: number
}

/**
 * 分析配置
 */
export interface AnalysisConfig {
  successRate?: number
  errorRate?: number
  latency?: number
}

/**
 * 探针配置
 */
export interface ProbeConfig {
  httpGet?: {
    path: string
    port: number
    scheme?: string
  }
  exec?: {
    command: string[]
  }
  tcpSocket?: {
    port: number
  }
  initialDelaySeconds?: number
  periodSeconds?: number
  timeoutSeconds?: number
  successThreshold?: number
  failureThreshold?: number
}

/**
 * Service 配置
 */
export interface ServiceConfig {
  type?: 'ClusterIP' | 'NodePort' | 'LoadBalancer'
  port?: number
  targetPort?: number
  nodePort?: number
  selector?: Record<string, string>
}

/**
 * Ingress 配置
 */
export interface IngressConfig {
  enabled?: boolean
  className?: string
  host?: string
  path?: string
  tls?: {
    enabled: boolean
    secretName?: string
  }
  annotations?: Record<string, string>
}

/**
 * Helm 配置
 */
export interface HelmConfig {
  chart?: string
  version?: string
  values?: Record<string, any>
  repo?: string
}

/**
 * 版本信息
 */
export interface VersionInfo {
  version: string
  buildNumber: string
  gitCommit?: string
  gitBranch?: string
  buildTime: string
  tag?: string
}

/**
 * 部署结果
 */
export interface DeployResult {
  success: boolean
  message: string
  version?: string
  deploymentId?: string
  timestamp: string
  environment: Environment
  platform: Platform
}

/**
 * 回滚配置
 */
export interface RollbackConfig {
  version?: string
  revision?: number
  auto?: boolean
  timeout?: number
}

/**
 * 部署历史记录
 */
export interface DeploymentHistory {
  id: string
  version: string
  environment: Environment
  platform: Platform
  status: 'success' | 'failed' | 'rolled_back'
  timestamp: string
  config: DeployConfig
  result?: DeployResult
}




