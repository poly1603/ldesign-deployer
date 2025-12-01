/**
 * 云平台部署类型定义
 * @module cloud/types
 */

/**
 * 云平台类型
 */
export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'aliyun' | 'tencent'

/**
 * AWS 凭证配置
 */
export interface AWSCredentials {
  /** Access Key ID */
  accessKeyId: string
  /** Secret Access Key */
  secretAccessKey: string
  /** 区域 */
  region: string
  /** Session Token（可选，用于临时凭证） */
  sessionToken?: string
}

/**
 * GCP 凭证配置
 */
export interface GCPCredentials {
  /** 项目 ID */
  projectId: string
  /** 服务账号密钥文件路径 */
  keyFilePath?: string
  /** 服务账号密钥 JSON */
  keyFileContent?: string
}

/**
 * Azure 凭证配置
 */
export interface AzureCredentials {
  /** 订阅 ID */
  subscriptionId: string
  /** 租户 ID */
  tenantId: string
  /** 客户端 ID */
  clientId: string
  /** 客户端密钥 */
  clientSecret: string
}

/**
 * AWS ECS 部署配置
 */
export interface ECSDeployConfig {
  /** 凭证 */
  credentials: AWSCredentials
  /** 集群名称 */
  cluster: string
  /** 服务名称 */
  service: string
  /** 任务定义（可选，如果需要更新） */
  taskDefinition?: ECSTaskDefinition
  /** 期望任务数 */
  desiredCount?: number
  /** 部署配置 */
  deploymentConfiguration?: {
    maximumPercent?: number
    minimumHealthyPercent?: number
  }
  /** 是否等待服务稳定 */
  waitForStability?: boolean
  /** 等待超时（秒） */
  waitTimeout?: number
}

/**
 * ECS 任务定义
 */
export interface ECSTaskDefinition {
  /** 任务定义家族 */
  family: string
  /** 容器定义 */
  containerDefinitions: ECSContainerDefinition[]
  /** CPU */
  cpu?: string
  /** 内存 */
  memory?: string
  /** 网络模式 */
  networkMode?: 'bridge' | 'host' | 'awsvpc' | 'none'
  /** 执行角色 ARN */
  executionRoleArn?: string
  /** 任务角色 ARN */
  taskRoleArn?: string
}

/**
 * ECS 容器定义
 */
export interface ECSContainerDefinition {
  /** 容器名称 */
  name: string
  /** 镜像 */
  image: string
  /** 端口映射 */
  portMappings?: {
    containerPort: number
    hostPort?: number
    protocol?: 'tcp' | 'udp'
  }[]
  /** 环境变量 */
  environment?: {
    name: string
    value: string
  }[]
  /** 密钥引用 */
  secrets?: {
    name: string
    valueFrom: string
  }[]
  /** 日志配置 */
  logConfiguration?: {
    logDriver: string
    options?: Record<string, string>
  }
  /** 健康检查 */
  healthCheck?: {
    command: string[]
    interval?: number
    timeout?: number
    retries?: number
    startPeriod?: number
  }
  /** CPU 单位 */
  cpu?: number
  /** 内存限制 */
  memory?: number
  /** 是否必需 */
  essential?: boolean
}

/**
 * GCP Cloud Run 部署配置
 */
export interface CloudRunDeployConfig {
  /** 凭证 */
  credentials: GCPCredentials
  /** 服务名称 */
  serviceName: string
  /** 区域 */
  region: string
  /** 镜像 URL */
  image: string
  /** 端口 */
  port?: number
  /** 环境变量 */
  env?: Record<string, string>
  /** 密钥引用 */
  secrets?: {
    name: string
    secretName: string
    version?: string
  }[]
  /** CPU */
  cpu?: string
  /** 内存 */
  memory?: string
  /** 最小实例数 */
  minInstances?: number
  /** 最大实例数 */
  maxInstances?: number
  /** 并发数 */
  concurrency?: number
  /** 超时（秒） */
  timeout?: number
  /** 是否允许未经身份验证的访问 */
  allowUnauthenticated?: boolean
  /** 服务账号 */
  serviceAccount?: string
  /** VPC 连接器 */
  vpcConnector?: string
  /** 标签 */
  labels?: Record<string, string>
}

/**
 * Azure Container Apps 部署配置
 */
export interface ContainerAppDeployConfig {
  /** 凭证 */
  credentials: AzureCredentials
  /** 资源组 */
  resourceGroup: string
  /** 容器应用名称 */
  appName: string
  /** 环境名称 */
  environmentName: string
  /** 镜像 */
  image: string
  /** 容器配置 */
  container?: {
    cpu?: number
    memory?: string
    env?: Record<string, string>
  }
  /** 入口配置 */
  ingress?: {
    external?: boolean
    targetPort?: number
    transport?: 'auto' | 'http' | 'http2' | 'tcp'
  }
  /** 副本配置 */
  scale?: {
    minReplicas?: number
    maxReplicas?: number
  }
}

/**
 * 云部署结果
 */
export interface CloudDeployResult {
  /** 是否成功 */
  success: boolean
  /** 消息 */
  message: string
  /** 服务 URL（如果可用） */
  serviceUrl?: string
  /** 部署 ID */
  deploymentId?: string
  /** 资源 ARN/ID */
  resourceId?: string
  /** 部署时长 */
  duration: number
  /** 时间戳 */
  timestamp: string
}
