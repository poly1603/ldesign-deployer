/**
 * 部署策略相关类型定义
 */

/**
 * 部署策略类型
 */
export type StrategyType = 'rolling' | 'bluegreen' | 'canary' | 'abtest'

/**
 * 策略执行结果
 */
export interface StrategyResult {
  success: boolean
  strategy: StrategyType
  message: string
  details?: any
  timestamp: string
}

/**
 * 滚动更新配置
 */
export interface RollingUpdateConfig {
  maxSurge: number | string
  maxUnavailable: number | string
  pauseBetweenBatches?: number
  healthCheckInterval?: number
}

/**
 * 蓝绿部署配置
 */
export interface BlueGreenDeployConfig {
  blueVersion: string
  greenVersion: string
  activeColor: 'blue' | 'green'
  trafficSwitch: {
    immediate?: boolean
    scheduled?: {
      time: string
    }
    manual?: boolean
  }
  rollbackOnError?: boolean
  healthCheckTimeout?: number
  previewMode?: boolean
}

/**
 * 金丝雀发布配置
 */
export interface CanaryDeployConfig {
  baselineVersion: string
  canaryVersion: string
  steps: CanaryDeployStep[]
  analysis?: {
    interval: number
    threshold: {
      successRate?: number
      errorRate?: number
      latency?: number
    }
    metrics?: string[]
  }
  autoPromote?: boolean
  autoRollback?: boolean
}

/**
 * 金丝雀步骤
 */
export interface CanaryDeployStep {
  weight: number
  duration: number
  pause?: boolean
}

/**
 * A/B 测试配置
 */
export interface ABTestConfig {
  versionA: string
  versionB: string
  trafficSplit: {
    a: number
    b: number
  }
  targetingRules?: ABTestRule[]
  duration?: number
  successCriteria?: {
    metric: string
    threshold: number
    comparison: 'greater' | 'less' | 'equal'
  }
}

/**
 * A/B 测试规则
 */
export interface ABTestRule {
  type: 'header' | 'cookie' | 'query' | 'ip' | 'user'
  key: string
  value: string
  operator: 'equals' | 'contains' | 'regex'
  version: 'a' | 'b'
}

/**
 * 流量管理配置
 */
export interface TrafficConfig {
  routing: TrafficRoute[]
  mirror?: {
    enabled: boolean
    destination: string
    percentage?: number
  }
}

/**
 * 流量路由
 */
export interface TrafficRoute {
  destination: string
  weight: number
  match?: TrafficMatch[]
}

/**
 * 流量匹配规则
 */
export interface TrafficMatch {
  headers?: Record<string, string>
  uri?: {
    prefix?: string
    exact?: string
    regex?: string
  }
  method?: string
}

/**
 * 部署状态
 */
export type DeploymentStatus = 'pending' | 'progressing' | 'available' | 'failed' | 'rolled_back'

/**
 * 部署监控数据
 */
export interface DeploymentMetrics {
  requestRate: number
  errorRate: number
  latency: {
    p50: number
    p95: number
    p99: number
  }
  availability: number
  timestamp: string
}




