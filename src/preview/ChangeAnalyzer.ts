/**
 * 变更影响分析器
 * @module preview/ChangeAnalyzer
 * 
 * @description 分析配置变更的影响范围和风险级别
 */

import type { DeployConfig } from '../types/index.js';
import type { DiffReport, DiffItem } from './ConfigDiffer.js';

/**
 * 风险级别
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * 影响范围
 */
export type ImpactScope = 'config' | 'deployment' | 'service' | 'network' | 'data';

/**
 * 变更影响接口
 */
export interface ChangeImpact {
  /** 字段路径 */
  path: string;
  /** 风险级别 */
  riskLevel: RiskLevel;
  /** 影响范围 */
  impactScope: ImpactScope[];
  /** 影响描述 */
  description: string;
  /** 建议操作 */
  recommendation?: string;
  /** 是否需要停机 */
  requiresDowntime: boolean;
  /** 是否可回滚 */
  rollbackable: boolean;
}

/**
 * 影响分析报告接口
 */
export interface ImpactAnalysisReport {
  /** 总变更数 */
  totalChanges: number;
  /** 高风险变更数 */
  highRiskChanges: number;
  /** 是否需要停机 */
  requiresDowntime: boolean;
  /** 估计影响时间（分钟） */
  estimatedImpactTime: number;
  /** 影响详情 */
  impacts: ChangeImpact[];
  /** 整体风险评分 (0-100) */
  overallRiskScore: number;
  /** 建议 */
  recommendations: string[];
}

/**
 * 变更影响分析器类
 * 
 * @description 分析配置变更可能产生的影响和风险
 * 
 * @example
 * ```typescript
 * const analyzer = new ChangeAnalyzer();
 * const analysis = analyzer.analyze(diffReport, oldConfig, newConfig);
 * 
 * console.log(`风险评分: ${analysis.overallRiskScore}/100`);
 * console.log(`需要停机: ${analysis.requiresDowntime ? '是' : '否'}`);
 * ```
 */
export class ChangeAnalyzer {
  private riskRules: Map<string, Partial<ChangeImpact>>;

  constructor() {
    this.riskRules = this.initializeRiskRules();
  }

  /**
   * 分析变更影响
   * 
   * @param diffReport - 差异报告
   * @param oldConfig - 旧配置
   * @param newConfig - 新配置
   * @returns 影响分析报告
   */
  analyze(
    diffReport: DiffReport,
    oldConfig: DeployConfig,
    newConfig: DeployConfig
  ): ImpactAnalysisReport {
    const impacts = diffReport.diffs.map(diff => this.analyzeChange(diff));

    const highRiskChanges = impacts.filter(
      i => i.riskLevel === 'high' || i.riskLevel === 'critical'
    );

    const requiresDowntime = impacts.some(i => i.requiresDowntime);
    const estimatedImpactTime = this.estimateImpactTime(impacts, oldConfig);
    const overallRiskScore = this.calculateRiskScore(impacts);
    const recommendations = this.generateRecommendations(impacts, requiresDowntime);

    return {
      totalChanges: diffReport.total,
      highRiskChanges: highRiskChanges.length,
      requiresDowntime,
      estimatedImpactTime,
      impacts,
      overallRiskScore,
      recommendations,
    };
  }

  /**
   * 分析单个变更
   * 
   * @private
   * @param diff - 差异项
   * @returns 变更影响
   */
  private analyzeChange(diff: DiffItem): ChangeImpact {
    // 查找匹配的规则
    const rule = this.findMatchingRule(diff.path);

    if (rule) {
      return {
        path: diff.path,
        riskLevel: rule.riskLevel || 'low',
        impactScope: rule.impactScope || ['config'],
        description: rule.description || `${diff.path} 发生变更`,
        recommendation: rule.recommendation,
        requiresDowntime: rule.requiresDowntime || false,
        rollbackable: rule.rollbackable !== false,
      };
    }

    // 默认规则
    return {
      path: diff.path,
      riskLevel: 'low',
      impactScope: ['config'],
      description: `${diff.path} 发生变更`,
      requiresDowntime: false,
      rollbackable: true,
    };
  }

  /**
   * 查找匹配的风险规则
   * 
   * @private
   * @param path - 字段路径
   * @returns 匹配的规则或 undefined
   */
  private findMatchingRule(path: string): Partial<ChangeImpact> | undefined {
    // 精确匹配
    if (this.riskRules.has(path)) {
      return this.riskRules.get(path);
    }

    // 前缀匹配
    for (const [rulePath, rule] of this.riskRules.entries()) {
      if (path.startsWith(rulePath)) {
        return rule;
      }
    }

    return undefined;
  }

  /**
   * 初始化风险规则
   * 
   * @private
   * @returns 风险规则映射
   */
  private initializeRiskRules(): Map<string, Partial<ChangeImpact>> {
    return new Map([
      // 关键配置
      ['platform', {
        riskLevel: 'critical',
        impactScope: ['deployment', 'service'],
        description: '部署平台变更',
        recommendation: '需要重新规划整个部署流程',
        requiresDowntime: true,
        rollbackable: false,
      }],
      ['environment', {
        riskLevel: 'critical',
        impactScope: ['deployment', 'service', 'data'],
        description: '环境变更',
        recommendation: '确保目标环境已准备好',
        requiresDowntime: true,
      }],

      // Docker 配置
      ['docker.registry', {
        riskLevel: 'high',
        impactScope: ['deployment'],
        description: '镜像仓库变更',
        recommendation: '确保新仓库可访问且镜像已同步',
        requiresDowntime: false,
      }],
      ['docker.image', {
        riskLevel: 'high',
        impactScope: ['deployment'],
        description: '镜像名称变更',
        requiresDowntime: true,
      }],

      // Kubernetes 配置
      ['kubernetes.namespace', {
        riskLevel: 'high',
        impactScope: ['deployment', 'network'],
        description: 'K8s 命名空间变更',
        recommendation: '确保新命名空间存在且权限正确',
        requiresDowntime: true,
      }],
      ['kubernetes.deployment.replicas', {
        riskLevel: 'medium',
        impactScope: ['service'],
        description: '副本数变更',
        recommendation: '逐步调整副本数以避免服务中断',
        requiresDowntime: false,
      }],
      ['kubernetes.service', {
        riskLevel: 'high',
        impactScope: ['network', 'service'],
        description: 'Service 配置变更',
        recommendation: '可能影响服务访问',
        requiresDowntime: false,
      }],

      // 健康检查
      ['healthCheck.enabled', {
        riskLevel: 'high',
        impactScope: ['service'],
        description: '健康检查启用状态变更',
        recommendation: '禁用健康检查可能导致故障实例无法自动恢复',
        requiresDowntime: false,
      }],
      ['healthCheck.path', {
        riskLevel: 'medium',
        impactScope: ['service'],
        description: '健康检查路径变更',
        recommendation: '确保新路径可访问',
        requiresDowntime: false,
      }],
    ]);
  }

  /**
   * 估算影响时间
   * 
   * @private
   * @param impacts - 影响列表
   * @param config - 配置
   * @returns 估计时间（分钟）
   */
  private estimateImpactTime(impacts: ChangeImpact[], config: DeployConfig): number {
    let time = 0;

    // 基础部署时间
    time += config.platform === 'kubernetes' ? 5 : 3;

    // 根据影响范围增加时间
    impacts.forEach(impact => {
      if (impact.requiresDowntime) {
        time += 5;
      }
      if (impact.riskLevel === 'high') {
        time += 2;
      }
      if (impact.riskLevel === 'critical') {
        time += 5;
      }
    });

    // 副本数影响
    const replicas = config.kubernetes?.deployment?.replicas || 1;
    time += Math.ceil(replicas / 3);

    return Math.ceil(time);
  }

  /**
   * 计算风险评分
   * 
   * @private
   * @param impacts - 影响列表
   * @returns 风险评分 (0-100)
   */
  private calculateRiskScore(impacts: ChangeImpact[]): number {
    if (impacts.length === 0) return 0;

    const riskWeights: Record<RiskLevel, number> = {
      low: 10,
      medium: 30,
      high: 60,
      critical: 100,
    };

    const totalRisk = impacts.reduce((sum, impact) => {
      return sum + riskWeights[impact.riskLevel];
    }, 0);

    const avgRisk = totalRisk / impacts.length;

    // 需要停机的额外增加风险
    const downtimeBonus = impacts.some(i => i.requiresDowntime) ? 10 : 0;

    return Math.min(100, Math.round(avgRisk + downtimeBonus));
  }

  /**
   * 生成建议
   * 
   * @private
   * @param impacts - 影响列表
   * @param requiresDowntime - 是否需要停机
   * @returns 建议列表
   */
  private generateRecommendations(
    impacts: ChangeImpact[],
    requiresDowntime: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (requiresDowntime) {
      recommendations.push('⚠️  此变更需要停机，请在维护窗口期进行');
      recommendations.push('📋 提前通知用户计划的维护时间');
    }

    const criticalChanges = impacts.filter(i => i.riskLevel === 'critical');
    if (criticalChanges.length > 0) {
      recommendations.push('🚨 包含关键变更，建议先在测试环境验证');
      recommendations.push('📸 建议在部署前创建备份或快照');
    }

    const highRiskChanges = impacts.filter(i => i.riskLevel === 'high');
    if (highRiskChanges.length > 0) {
      recommendations.push('⚡ 包含高风险变更，建议逐步部署');
      recommendations.push('📊 部署后密切监控服务指标');
    }

    if (impacts.some(i => !i.rollbackable)) {
      recommendations.push('⚠️  部分变更不可回滚，请谨慎操作');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ 变更风险较低，可以正常部署');
    }

    return recommendations;
  }

  /**
   * 格式化分析报告
   * 
   * @param report - 分析报告
   * @returns 格式化后的文本
   */
  formatReport(report: ImpactAnalysisReport): string {
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push('变更影响分析报告');
    lines.push('='.repeat(60));

    // 摘要
    lines.push('');
    lines.push('📊 摘要:');
    lines.push(`  总变更数: ${report.totalChanges}`);
    lines.push(`  高风险变更: ${report.highRiskChanges}`);
    lines.push(`  需要停机: ${report.requiresDowntime ? '是' : '否'}`);
    lines.push(`  估计影响时间: ${report.estimatedImpactTime} 分钟`);
    lines.push(`  风险评分: ${report.overallRiskScore}/100 ${this.getRiskEmoji(report.overallRiskScore)}`);

    // 建议
    if (report.recommendations.length > 0) {
      lines.push('');
      lines.push('💡 建议:');
      report.recommendations.forEach(rec => {
        lines.push(`  ${rec}`);
      });
    }

    // 高风险变更详情
    const highRiskImpacts = report.impacts.filter(
      i => i.riskLevel === 'high' || i.riskLevel === 'critical'
    );

    if (highRiskImpacts.length > 0) {
      lines.push('');
      lines.push('🚨 高风险变更:');
      highRiskImpacts.forEach(impact => {
        lines.push(`  ${this.getRiskIcon(impact.riskLevel)} ${impact.path}`);
        lines.push(`     风险: ${impact.riskLevel} | 影响: ${impact.impactScope.join(', ')}`);
        lines.push(`     ${impact.description}`);
        if (impact.recommendation) {
          lines.push(`     建议: ${impact.recommendation}`);
        }
        lines.push('');
      });
    }

    lines.push('='.repeat(60));
    return lines.join('\n');
  }

  /**
   * 获取风险图标
   * 
   * @private
   * @param level - 风险级别
   * @returns 图标
   */
  private getRiskIcon(level: RiskLevel): string {
    const icons: Record<RiskLevel, string> = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴',
    };
    return icons[level];
  }

  /**
   * 获取风险表情
   * 
   * @private
   * @param score - 风险评分
   * @returns 表情
   */
  private getRiskEmoji(score: number): string {
    if (score < 20) return '🟢';
    if (score < 40) return '🟡';
    if (score < 70) return '🟠';
    return '🔴';
  }
}

