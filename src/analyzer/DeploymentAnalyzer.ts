/**
 * 部署分析器
 * 分析部署数据并提供优化建议
 */

import type { DeployConfig, DeploymentHistory } from '../types/index.js'
import { logger } from '../utils/logger.js'

/**
 * 分析结果
 */
export interface AnalysisResult {
  score: number // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  issues: Issue[]
  recommendations: Recommendation[]
  metrics: AnalysisMetrics
}

/**
 * 问题
 */
export interface Issue {
  severity: 'critical' | 'warning' | 'info'
  category: string
  message: string
  suggestion: string
}

/**
 * 建议
 */
export interface Recommendation {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  impact: string
  implementation: string
}

/**
 * 分析指标
 */
export interface AnalysisMetrics {
  reliability: number
  performance: number
  security: number
  costEfficiency: number
  bestPractices: number
}

/**
 * 部署分析器
 */
export class DeploymentAnalyzer {
  /**
   * 分析配置
   */
  analyzeConfig(config: DeployConfig): AnalysisResult {
    const issues: Issue[] = []
    const recommendations: Recommendation[] = []
    const metrics: AnalysisMetrics = {
      reliability: 100,
      performance: 100,
      security: 100,
      costEfficiency: 100,
      bestPractices: 100,
    }

    // 分析 Docker 配置
    if (config.docker) {
      this.analyzeDocker(config, issues, recommendations, metrics)
    }

    // 分析 Kubernetes 配置
    if (config.kubernetes) {
      this.analyzeKubernetes(config, issues, recommendations, metrics)
    }

    // 分析健康检查
    this.analyzeHealthCheck(config, issues, recommendations, metrics)

    // 分析资源配置
    this.analyzeResources(config, issues, recommendations, metrics)

    // 计算总分
    const score = Math.round(
      (metrics.reliability +
        metrics.performance +
        metrics.security +
        metrics.costEfficiency +
        metrics.bestPractices) /
        5
    )

    const grade = this.calculateGrade(score)

    return {
      score,
      grade,
      issues,
      recommendations,
      metrics,
    }
  }

  /**
   * 分析部署历史
   */
  analyzeHistory(history: DeploymentHistory[]): {
    successRate: number
    avgDuration: number
    failurePatterns: string[]
    recommendations: Recommendation[]
  } {
    if (history.length === 0) {
      return {
        successRate: 0,
        avgDuration: 0,
        failurePatterns: [],
        recommendations: [],
      }
    }

    const successful = history.filter((h) => h.status === 'success').length
    const successRate = (successful / history.length) * 100

    // 计算平均持续时间（模拟）
    const avgDuration = 120 // 秒

    // 识别失败模式
    const failurePatterns: string[] = []
    const failures = history.filter((h) => h.status === 'failed')

    if (failures.length > 0) {
      failurePatterns.push(`最近 ${failures.length} 次失败部署`)
    }

    const recommendations: Recommendation[] = []

    // 成功率低的建议
    if (successRate < 80) {
      recommendations.push({
        title: '提升部署成功率',
        description: `当前成功率为 ${successRate.toFixed(1)}%，需要改进`,
        priority: 'high',
        impact: '提升部署稳定性和团队信心',
        implementation: '添加更完善的前置检查、健康检查和回滚机制',
      })
    }

    // 部署频率建议
    if (history.length < 10) {
      recommendations.push({
        title: '增加部署频率',
        description: '更频繁的小批量部署可以降低风险',
        priority: 'medium',
        impact: '降低每次部署的风险，更快交付价值',
        implementation: '建立 CI/CD 流程，自动化部署',
      })
    }

    return {
      successRate,
      avgDuration,
      failurePatterns,
      recommendations,
    }
  }

  /**
   * 分析 Docker 配置
   */
  private analyzeDocker(
    config: DeployConfig,
    issues: Issue[],
    recommendations: Recommendation[],
    metrics: AnalysisMetrics
  ): void {
    if (!config.docker) return

    // 检查多阶段构建
    if (!config.docker.multiStage) {
      issues.push({
        severity: 'warning',
        category: 'Docker',
        message: '未启用多阶段构建',
        suggestion: '使用多阶段构建可以大幅减小镜像大小',
      })
      metrics.bestPractices -= 10
    }

    // 检查镜像标签
    if (config.docker.tag === 'latest') {
      issues.push({
        severity: 'warning',
        category: 'Docker',
        message: '使用 latest 标签',
        suggestion: '使用具体的版本号标签以便于追踪和回滚',
      })
      metrics.reliability -= 5
    }

    // 检查 Registry
    if (!config.docker.registry) {
      issues.push({
        severity: 'info',
        category: 'Docker',
        message: '未配置镜像仓库',
        suggestion: '配置私有镜像仓库以提升安全性',
      })
      metrics.security -= 5
    }

    // 建议
    if (!config.docker.multiStage) {
      recommendations.push({
        title: '启用 Docker 多阶段构建',
        description: '多阶段构建可以减小镜像大小 50-70%',
        priority: 'high',
        impact: '减少镜像大小，加快部署速度，降低存储成本',
        implementation: '在 Dockerfile 中使用 FROM ... AS builder 模式',
      })
    }
  }

  /**
   * 分析 Kubernetes 配置
   */
  private analyzeKubernetes(
    config: DeployConfig,
    issues: Issue[],
    recommendations: Recommendation[],
    metrics: AnalysisMetrics
  ): void {
    if (!config.kubernetes) return

    // 检查副本数
    const replicas = config.kubernetes.deployment?.replicas || 1
    if (config.environment === 'production' && replicas < 2) {
      issues.push({
        severity: 'critical',
        category: 'Kubernetes',
        message: '生产环境副本数不足',
        suggestion: '生产环境建议至少 2-3 个副本以保证高可用',
      })
      metrics.reliability -= 20
    }

    // 检查资源限制
    const resources = config.kubernetes.deployment?.resources
    if (!resources || !resources.limits) {
      issues.push({
        severity: 'warning',
        category: 'Kubernetes',
        message: '未设置资源限制',
        suggestion: '设置资源限制可以防止单个 Pod 消耗过多资源',
      })
      metrics.reliability -= 10
      metrics.performance -= 10
    }

    // 检查探针
    const deployment = config.kubernetes.deployment
    if (!deployment?.livenessProbe) {
      issues.push({
        severity: 'warning',
        category: 'Kubernetes',
        message: '未配置存活探针',
        suggestion: '存活探针可以自动重启故障 Pod',
      })
      metrics.reliability -= 10
    }

    if (!deployment?.readinessProbe) {
      issues.push({
        severity: 'warning',
        category: 'Kubernetes',
        message: '未配置就绪探针',
        suggestion: '就绪探针可以避免将流量发送到未就绪的 Pod',
      })
      metrics.reliability -= 10
    }

    // 建议
    if (config.environment === 'production' && replicas < 3) {
      recommendations.push({
        title: '增加生产环境副本数',
        description: `当前副本数为 ${replicas}，建议增加到 3 个`,
        priority: 'high',
        impact: '提升服务可用性和容错能力',
        implementation: '在配置中设置 kubernetes.deployment.replicas: 3',
      })
    }

    if (!resources?.requests || !resources?.limits) {
      recommendations.push({
        title: '配置资源请求和限制',
        description: '未设置资源配置可能导致资源争用或浪费',
        priority: 'high',
        impact: '优化资源使用，防止 OOM，提升稳定性',
        implementation: `设置合理的 CPU 和内存请求/限制
          例如: requests: { cpu: '100m', memory: '128Mi' }
               limits: { cpu: '500m', memory: '512Mi' }`,
      })
    }
  }

  /**
   * 分析健康检查
   */
  private analyzeHealthCheck(
    config: DeployConfig,
    issues: Issue[],
    recommendations: Recommendation[],
    metrics: AnalysisMetrics
  ): void {
    if (!config.healthCheck || !config.healthCheck.enabled) {
      issues.push({
        severity: 'critical',
        category: '健康检查',
        message: '未启用健康检查',
        suggestion: '健康检查是确保服务可用性的关键',
      })
      metrics.reliability -= 25

      recommendations.push({
        title: '启用健康检查',
        description: '健康检查可以确保只有健康的实例接收流量',
        priority: 'high',
        impact: '提升服务可用性，自动检测和处理故障',
        implementation: `配置健康检查端点:
          healthCheck: {
            enabled: true,
            path: '/health',
            port: 3000,
            interval: 30
          }`,
      })
    } else {
      // 检查健康检查配置合理性
      if (config.healthCheck.timeout && config.healthCheck.timeout > 10) {
        issues.push({
          severity: 'info',
          category: '健康检查',
          message: '健康检查超时时间过长',
          suggestion: '建议设置为 5-10 秒',
        })
        metrics.performance -= 5
      }

      if (config.healthCheck.retries && config.healthCheck.retries > 5) {
        issues.push({
          severity: 'info',
          category: '健康检查',
          message: '健康检查重试次数过多',
          suggestion: '建议设置为 3-5 次',
        })
        metrics.performance -= 5
      }
    }
  }

  /**
   * 分析资源配置
   */
  private analyzeResources(
    config: DeployConfig,
    issues: Issue[],
    recommendations: Recommendation[],
    metrics: AnalysisMetrics
  ): void {
    const resources = config.kubernetes?.deployment?.resources

    if (!resources) return

    // 分析 CPU 配置
    if (resources.requests?.cpu && resources.limits?.cpu) {
      const requestCpu = this.parseCpu(resources.requests.cpu)
      const limitCpu = this.parseCpu(resources.limits.cpu)

      if (limitCpu / requestCpu > 4) {
        issues.push({
          severity: 'warning',
          category: '资源配置',
          message: 'CPU 限制是请求的 4 倍以上',
          suggestion: '过大的差距可能导致资源争用',
        })
        metrics.costEfficiency -= 10
      }
    }

    // 分析内存配置
    if (resources.requests?.memory && resources.limits?.memory) {
      const requestMem = this.parseMemory(resources.requests.memory)
      const limitMem = this.parseMemory(resources.limits.memory)

      if (limitMem / requestMem > 4) {
        issues.push({
          severity: 'warning',
          category: '资源配置',
          message: '内存限制是请求的 4 倍以上',
          suggestion: '建议将内存限制设置为请求的 1.5-2 倍',
        })
        metrics.costEfficiency -= 10
      }
    }
  }

  /**
   * 计算等级
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  /**
   * 解析 CPU 值（转换为 millicores）
   */
  private parseCpu(cpu: string): number {
    if (cpu.endsWith('m')) {
      return parseInt(cpu)
    }
    return parseFloat(cpu) * 1000
  }

  /**
   * 解析内存值（转换为 MB）
   */
  private parseMemory(memory: string): number {
    if (memory.endsWith('Mi')) {
      return parseInt(memory)
    }
    if (memory.endsWith('Gi')) {
      return parseInt(memory) * 1024
    }
    if (memory.endsWith('M')) {
      return parseInt(memory)
    }
    if (memory.endsWith('G')) {
      return parseInt(memory) * 1024
    }
    return parseInt(memory)
  }

  /**
   * 生成分析报告
   */
  generateReport(result: AnalysisResult, config: DeployConfig): string {
    const lines: string[] = []

    lines.push('# 部署配置分析报告')
    lines.push('')
    lines.push(`**项目**: ${config.name}`)
    lines.push(`**环境**: ${config.environment}`)
    lines.push(`**平台**: ${config.platform}`)
    lines.push('')
    lines.push(`## 📊 总体评分: ${result.score}/100 (${result.grade})`)
    lines.push('')

    // 详细指标
    lines.push('### 详细指标')
    lines.push('')
    lines.push(`- 可靠性: ${result.metrics.reliability}/100`)
    lines.push(`- 性能: ${result.metrics.performance}/100`)
    lines.push(`- 安全性: ${result.metrics.security}/100`)
    lines.push(`- 成本效率: ${result.metrics.costEfficiency}/100`)
    lines.push(`- 最佳实践: ${result.metrics.bestPractices}/100`)
    lines.push('')

    // 问题列表
    if (result.issues.length > 0) {
      lines.push('## ⚠️ 发现的问题')
      lines.push('')

      const critical = result.issues.filter((i) => i.severity === 'critical')
      const warnings = result.issues.filter((i) => i.severity === 'warning')
      const infos = result.issues.filter((i) => i.severity === 'info')

      if (critical.length > 0) {
        lines.push('### 🔴 严重问题')
        critical.forEach((issue) => {
          lines.push(`- **${issue.category}**: ${issue.message}`)
          lines.push(`  - 建议: ${issue.suggestion}`)
        })
        lines.push('')
      }

      if (warnings.length > 0) {
        lines.push('### 🟡 警告')
        warnings.forEach((issue) => {
          lines.push(`- **${issue.category}**: ${issue.message}`)
          lines.push(`  - 建议: ${issue.suggestion}`)
        })
        lines.push('')
      }

      if (infos.length > 0) {
        lines.push('### 🔵 信息')
        infos.forEach((issue) => {
          lines.push(`- **${issue.category}**: ${issue.message}`)
          lines.push(`  - 建议: ${issue.suggestion}`)
        })
        lines.push('')
      }
    }

    // 优化建议
    if (result.recommendations.length > 0) {
      lines.push('## 💡 优化建议')
      lines.push('')

      const high = result.recommendations.filter((r) => r.priority === 'high')
      const medium = result.recommendations.filter((r) => r.priority === 'medium')
      const low = result.recommendations.filter((r) => r.priority === 'low')

      if (high.length > 0) {
        lines.push('### 高优先级')
        high.forEach((rec, index) => {
          lines.push(`#### ${index + 1}. ${rec.title}`)
          lines.push(`**描述**: ${rec.description}`)
          lines.push(`**影响**: ${rec.impact}`)
          lines.push(`**实施方案**:`)
          lines.push('```')
          lines.push(rec.implementation)
          lines.push('```')
          lines.push('')
        })
      }

      if (medium.length > 0) {
        lines.push('### 中优先级')
        medium.forEach((rec) => {
          lines.push(`- **${rec.title}**: ${rec.description}`)
        })
        lines.push('')
      }

      if (low.length > 0) {
        lines.push('### 低优先级')
        low.forEach((rec) => {
          lines.push(`- **${rec.title}**: ${rec.description}`)
        })
        lines.push('')
      }
    }

    lines.push('---')
    lines.push('')
    lines.push(`*报告生成时间: ${new Date().toLocaleString('zh-CN')}*`)

    return lines.join('\n')
  }
}

/**
 * 快速分析
 */
export async function analyzeDeployment(config: DeployConfig): Promise<AnalysisResult> {
  const analyzer = new DeploymentAnalyzer()
  const result = analyzer.analyzeConfig(config)

  logger.info(`\n📊 分析结果: ${result.score}/100 (${result.grade})`)
  logger.info(`   可靠性: ${result.metrics.reliability}/100`)
  logger.info(`   性能: ${result.metrics.performance}/100`)
  logger.info(`   安全性: ${result.metrics.security}/100`)

  if (result.issues.length > 0) {
    logger.warn(`\n⚠️  发现 ${result.issues.length} 个问题`)
  }

  if (result.recommendations.length > 0) {
    logger.info(`💡 有 ${result.recommendations.length} 条优化建议`)
  }

  return result
}

