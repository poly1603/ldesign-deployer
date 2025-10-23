/**
 * 配置 Schema 验证
 * 使用 Zod 进行运行时类型验证
 */

import { z } from 'zod'

/**
 * 环境类型 Schema
 */
export const EnvironmentSchema = z.enum(['development', 'test', 'staging', 'production'])

/**
 * 平台类型 Schema
 */
export const PlatformSchema = z.enum(['docker', 'kubernetes', 'docker-compose'])

/**
 * 项目类型 Schema
 */
export const ProjectTypeSchema = z.enum(['node', 'static', 'spa', 'ssr', 'custom'])

/**
 * 环境变量 Schema
 */
export const EnvironmentVariableSchema = z.object({
  name: z.string().min(1, '环境变量名称不能为空'),
  value: z.string(),
  secret: z.boolean().optional(),
})

/**
 * 密钥配置 Schema
 */
export const SecretConfigSchema = z.object({
  name: z.string().min(1, '密钥名称不能为空'),
  value: z.string(),
  encrypted: z.boolean().optional(),
})

/**
 * 健康检查配置 Schema
 */
export const HealthCheckConfigSchema = z.object({
  enabled: z.boolean(),
  path: z.string().startsWith('/').optional(),
  port: z.number().int().min(1).max(65535).optional(),
  interval: z.number().int().min(1).optional(),
  timeout: z.number().int().min(1).optional(),
  retries: z.number().int().min(1).optional(),
  startPeriod: z.number().int().min(0).optional(),
})

/**
 * 资源限制 Schema
 */
export const ResourceLimitsSchema = z.object({
  cpu: z.string().regex(/^\d+m?$/, '无效的 CPU 格式，例如: 100m, 1').optional(),
  memory: z.string().regex(/^\d+(Mi|Gi|M|G)?$/, '无效的内存格式，例如: 128Mi, 1Gi').optional(),
})

/**
 * 资源配置 Schema
 */
export const ResourceConfigSchema = z.object({
  requests: ResourceLimitsSchema.optional(),
  limits: ResourceLimitsSchema.optional(),
})

/**
 * Docker 服务配置 Schema
 */
export const DockerServiceConfigSchema = z.object({
  image: z.string().min(1),
  build: z.object({
    context: z.string(),
    dockerfile: z.string().optional(),
  }).optional(),
  ports: z.array(z.string()).optional(),
  environment: z.record(z.string()).optional(),
  volumes: z.array(z.string()).optional(),
  depends_on: z.array(z.string()).optional(),
  restart: z.string().optional(),
  networks: z.array(z.string()).optional(),
})

/**
 * 网络配置 Schema
 */
export const NetworkConfigSchema = z.object({
  driver: z.string().optional(),
  external: z.boolean().optional(),
})

/**
 * 卷配置 Schema
 */
export const VolumeConfigSchema = z.object({
  driver: z.string().optional(),
  external: z.boolean().optional(),
})

/**
 * Docker Compose 配置 Schema
 */
export const DockerComposeConfigSchema = z.object({
  services: z.record(DockerServiceConfigSchema).optional(),
  networks: z.record(NetworkConfigSchema).optional(),
  volumes: z.record(VolumeConfigSchema).optional(),
})

/**
 * Docker 配置 Schema
 */
export const DockerConfigSchema = z.object({
  dockerfile: z.string().optional(),
  context: z.string().optional(),
  buildArgs: z.record(z.string()).optional(),
  image: z.string().min(1, 'Docker 镜像名称不能为空'),
  tag: z.string().optional(),
  registry: z.string().url('无效的镜像仓库 URL').or(z.string().regex(/^[a-zA-Z0-9.-]+$/)).optional(),
  multiStage: z.boolean().optional(),
  target: z.string().optional(),
  platform: z.string().optional(),
  cache: z.boolean().optional(),
  compose: DockerComposeConfigSchema.optional(),
})

/**
 * 探针配置 Schema
 */
export const ProbeConfigSchema = z.object({
  httpGet: z.object({
    path: z.string().startsWith('/'),
    port: z.number().int().min(1).max(65535),
    scheme: z.enum(['HTTP', 'HTTPS']).optional(),
  }).optional(),
  exec: z.object({
    command: z.array(z.string()),
  }).optional(),
  tcpSocket: z.object({
    port: z.number().int().min(1).max(65535),
  }).optional(),
  initialDelaySeconds: z.number().int().min(0).optional(),
  periodSeconds: z.number().int().min(1).optional(),
  timeoutSeconds: z.number().int().min(1).optional(),
  successThreshold: z.number().int().min(1).optional(),
  failureThreshold: z.number().int().min(1).optional(),
})

/**
 * 部署策略类型 Schema
 */
export const DeploymentStrategyTypeSchema = z.enum(['RollingUpdate', 'Recreate', 'BlueGreen', 'Canary'])

/**
 * 金丝雀步骤 Schema
 */
export const CanaryStepSchema = z.object({
  weight: z.number().int().min(0).max(100),
  pause: z.number().int().min(0).optional(),
})

/**
 * 分析配置 Schema
 */
export const AnalysisConfigSchema = z.object({
  successRate: z.number().min(0).max(100).optional(),
  errorRate: z.number().min(0).max(100).optional(),
  latency: z.number().min(0).optional(),
})

/**
 * 金丝雀配置 Schema
 */
export const CanaryConfigSchema = z.object({
  steps: z.array(CanaryStepSchema),
  analysis: AnalysisConfigSchema.optional(),
})

/**
 * 蓝绿配置 Schema
 */
export const BlueGreenConfigSchema = z.object({
  activeService: z.string(),
  previewService: z.string().optional(),
  autoPromote: z.boolean().optional(),
  autoPromoteSeconds: z.number().int().min(0).optional(),
})

/**
 * 部署策略 Schema
 */
export const DeploymentStrategySchema = z.object({
  type: DeploymentStrategyTypeSchema,
  rollingUpdate: z.object({
    maxSurge: z.union([z.number(), z.string()]).optional(),
    maxUnavailable: z.union([z.number(), z.string()]).optional(),
  }).optional(),
  blueGreen: BlueGreenConfigSchema.optional(),
  canary: CanaryConfigSchema.optional(),
})

/**
 * Deployment 配置 Schema
 */
export const DeploymentConfigSchema = z.object({
  replicas: z.number().int().min(1).max(100).optional(),
  strategy: DeploymentStrategySchema.optional(),
  resources: ResourceConfigSchema.optional(),
  livenessProbe: ProbeConfigSchema.optional(),
  readinessProbe: ProbeConfigSchema.optional(),
  startupProbe: ProbeConfigSchema.optional(),
})

/**
 * Service 配置 Schema
 */
export const ServiceConfigSchema = z.object({
  type: z.enum(['ClusterIP', 'NodePort', 'LoadBalancer']).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  targetPort: z.number().int().min(1).max(65535).optional(),
  nodePort: z.number().int().min(30000).max(32767).optional(),
  selector: z.record(z.string()).optional(),
})

/**
 * Ingress 配置 Schema
 */
export const IngressConfigSchema = z.object({
  enabled: z.boolean().optional(),
  className: z.string().optional(),
  host: z.string().min(1).optional(),
  path: z.string().startsWith('/').optional(),
  tls: z.object({
    enabled: z.boolean(),
    secretName: z.string().optional(),
  }).optional(),
  annotations: z.record(z.string()).optional(),
})

/**
 * Helm 配置 Schema
 */
export const HelmConfigSchema = z.object({
  chart: z.string().optional(),
  version: z.string().optional(),
  values: z.record(z.any()).optional(),
  repo: z.string().url().optional(),
})

/**
 * Kubernetes 配置 Schema
 */
export const KubernetesConfigSchema = z.object({
  namespace: z.string().regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, '无效的命名空间名称').optional(),
  context: z.string().optional(),
  deployment: DeploymentConfigSchema.optional(),
  service: ServiceConfigSchema.optional(),
  ingress: IngressConfigSchema.optional(),
  configMaps: z.record(z.record(z.string())).optional(),
  secrets: z.record(z.record(z.string())).optional(),
  helm: HelmConfigSchema.optional(),
})

/**
 * 钩子配置 Schema
 */
export const HookConfigSchema = z.object({
  preDeploy: z.array(z.string()).optional(),
  postDeploy: z.array(z.string()).optional(),
  preRollback: z.array(z.string()).optional(),
  postRollback: z.array(z.string()).optional(),
})

/**
 * 部署配置 Schema
 */
export const DeployConfigSchema = z.object({
  // 基础配置
  name: z.string().min(1, '应用名称不能为空'),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/, '无效的语义化版本，例如: 1.0.0, 1.0.0-beta.1'),
  environment: EnvironmentSchema,
  platform: PlatformSchema,
  projectType: ProjectTypeSchema,

  // 路径配置
  workDir: z.string().optional(),
  outputDir: z.string().optional(),

  // 环境变量
  env: z.array(EnvironmentVariableSchema).optional(),
  secrets: z.array(SecretConfigSchema).optional(),

  // Docker 配置
  docker: DockerConfigSchema.optional(),

  // Kubernetes 配置
  kubernetes: KubernetesConfigSchema.optional(),

  // 健康检查
  healthCheck: HealthCheckConfigSchema.optional(),

  // 钩子
  hooks: HookConfigSchema.optional(),
})

/**
 * 验证部署配置
 */
export function validateDeployConfig(config: unknown): z.infer<typeof DeployConfigSchema> {
  return DeployConfigSchema.parse(config)
}

/**
 * 安全验证部署配置（返回结果而不是抛出错误）
 */
export function safeValidateDeployConfig(config: unknown): {
  success: boolean
  data?: z.infer<typeof DeployConfigSchema>
  error?: z.ZodError
} {
  const result = DeployConfigSchema.safeParse(config)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

/**
 * 格式化 Zod 验证错误
 */
export function formatZodError(error: z.ZodError): string {
  const errors = error.errors.map((err) => {
    const path = err.path.join('.')
    return `  - ${path || 'root'}: ${err.message}`
  })

  return `配置验证失败:\n${errors.join('\n')}`
}


