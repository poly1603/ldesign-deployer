/**
 * 部署指标类型定义
 * @module metrics/types
 */

import type { Environment, Platform } from '../types/index.js'

/**
 * 部署记录
 */
export interface DeploymentRecord {
  /** 部署 ID */
  id: string
  /** 应用名称 */
  appName: string
  /** 版本号 */
  version: string
  /** 环境 */
  environment: Environment
  /** 平台 */
  platform: Platform
  /** 是否成功 */
  success: boolean
  /** 开始时间 */
  startTime: Date
  /** 结束时间 */
  endTime: Date
  /** 持续时间（毫秒） */
  duration: number
  /** 错误信息 */
  error?: string
  /** 操作用户 */
  user?: string
  /** Git 提交哈希 */
  gitCommit?: string
  /** Git 分支 */
  gitBranch?: string
  /** 附加元数据 */
  metadata?: Record<string, any>
}

/**
 * 部署统计
 */
export interface DeploymentStats {
  /** 总部署次数 */
  totalDeployments: number
  /** 成功次数 */
  successfulDeployments: number
  /** 失败次数 */
  failedDeployments: number
  /** 成功率 */
  successRate: number
  /** 平均部署时间（毫秒） */
  averageDuration: number
  /** 最短部署时间（毫秒） */
  minDuration: number
  /** 最长部署时间（毫秒） */
  maxDuration: number
  /** P50 部署时间（毫秒） */
  p50Duration: number
  /** P90 部署时间（毫秒） */
  p90Duration: number
  /** P99 部署时间（毫秒） */
  p99Duration: number
}

/**
 * 按时间段的统计
 */
export interface PeriodStats extends DeploymentStats {
  /** 时间段开始 */
  periodStart: Date
  /** 时间段结束 */
  periodEnd: Date
  /** 时间段标签 */
  periodLabel: string
}

/**
 * 按环境的统计
 */
export interface EnvironmentStats extends DeploymentStats {
  /** 环境 */
  environment: Environment
}

/**
 * 按应用的统计
 */
export interface AppStats extends DeploymentStats {
  /** 应用名称 */
  appName: string
  /** 最后部署时间 */
  lastDeployment?: Date
  /** 最后成功部署时间 */
  lastSuccessfulDeployment?: Date
}

/**
 * 趋势数据点
 */
export interface TrendDataPoint {
  /** 时间 */
  timestamp: Date
  /** 值 */
  value: number
  /** 标签 */
  label?: string
}

/**
 * 部署趋势
 */
export interface DeploymentTrend {
  /** 部署频率趋势 */
  frequency: TrendDataPoint[]
  /** 成功率趋势 */
  successRate: TrendDataPoint[]
  /** 平均时间趋势 */
  averageDuration: TrendDataPoint[]
}

/**
 * 时间范围
 */
export type TimeRange = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all'

/**
 * 查询选项
 */
export interface MetricsQueryOptions {
  /** 开始时间 */
  startDate?: Date
  /** 结束时间 */
  endDate?: Date
  /** 时间范围 */
  timeRange?: TimeRange
  /** 应用名称过滤 */
  appName?: string
  /** 环境过滤 */
  environment?: Environment
  /** 平台过滤 */
  platform?: Platform
  /** 仅成功的 */
  successOnly?: boolean
  /** 仅失败的 */
  failedOnly?: boolean
  /** 限制数量 */
  limit?: number
  /** 偏移量 */
  offset?: number
}

/**
 * 部署健康指标
 */
export interface DeploymentHealth {
  /** 健康评分（0-100） */
  score: number
  /** 状态 */
  status: 'healthy' | 'warning' | 'critical'
  /** 问题列表 */
  issues: HealthIssue[]
  /** 建议 */
  recommendations: string[]
}

/**
 * 健康问题
 */
export interface HealthIssue {
  /** 问题类型 */
  type: 'high_failure_rate' | 'slow_deployments' | 'no_recent_deployments' | 'unstable'
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high'
  /** 描述 */
  description: string
  /** 相关数据 */
  data?: Record<string, any>
}

/**
 * 指标存储接口
 */
export interface MetricsStorage {
  /** 保存部署记录 */
  save(record: DeploymentRecord): Promise<void>
  /** 查询部署记录 */
  query(options: MetricsQueryOptions): Promise<DeploymentRecord[]>
  /** 获取记录数量 */
  count(options?: MetricsQueryOptions): Promise<number>
  /** 删除记录 */
  delete(id: string): Promise<void>
  /** 清理旧记录 */
  cleanup(beforeDate: Date): Promise<number>
}
