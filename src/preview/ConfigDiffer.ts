/**
 * 配置差异对比器
 * @module preview/ConfigDiffer
 * 
 * @description 对比两个部署配置，生成详细的差异报告
 */

import type { DeployConfig } from '../types/index.js';

/**
 * 差异类型
 */
export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

/**
 * 差异项接口
 */
export interface DiffItem {
  /** 字段路径 */
  path: string;
  /** 差异类型 */
  type: DiffType;
  /** 旧值 */
  oldValue?: any;
  /** 新值 */
  newValue?: any;
  /** 描述 */
  description?: string;
}

/**
 * 差异报告接口
 */
export interface DiffReport {
  /** 差异总数 */
  total: number;
  /** 添加的字段数 */
  added: number;
  /** 删除的字段数 */
  removed: number;
  /** 修改的字段数 */
  modified: number;
  /** 未变更的字段数 */
  unchanged: number;
  /** 详细差异列表 */
  diffs: DiffItem[];
  /** 是否有差异 */
  hasDifferences: boolean;
}

/**
 * 配置差异对比器类
 * 
 * @description 对比两个部署配置的差异，生成详细报告
 * 
 * @example
 * ```typescript
 * const differ = new ConfigDiffer();
 * 
 * const report = differ.compare(oldConfig, newConfig);
 * 
 * console.log(`总共 ${report.total} 处差异`);
 * console.log(`新增: ${report.added}, 删除: ${report.removed}, 修改: ${report.modified}`);
 * 
 * // 格式化输出
 * console.log(differ.formatReport(report));
 * ```
 */
export class ConfigDiffer {
  /**
   * 对比两个配置
   * 
   * @param oldConfig - 旧配置
   * @param newConfig - 新配置
   * @returns 差异报告
   */
  compare(oldConfig: DeployConfig, newConfig: DeployConfig): DiffReport {
    const diffs: DiffItem[] = [];

    // 对比所有字段
    this.compareObjects(oldConfig, newConfig, '', diffs);

    // 统计差异
    const stats = this.calculateStats(diffs);

    return {
      ...stats,
      diffs,
      hasDifferences: stats.total > 0,
    };
  }

  /**
   * 对比两个对象
   * 
   * @private
   * @param oldObj - 旧对象
   * @param newObj - 新对象
   * @param path - 当前路径
   * @param diffs - 差异数组
   */
  private compareObjects(
    oldObj: any,
    newObj: any,
    path: string,
    diffs: DiffItem[]
  ): void {
    // 获取所有键
    const allKeys = new Set([
      ...Object.keys(oldObj || {}),
      ...Object.keys(newObj || {}),
    ]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const oldValue = oldObj?.[key];
      const newValue = newObj?.[key];

      // 判断差异类型
      if (oldValue === undefined && newValue !== undefined) {
        // 新增
        diffs.push({
          path: currentPath,
          type: 'added',
          newValue,
          description: this.describeValue(newValue),
        });
      } else if (oldValue !== undefined && newValue === undefined) {
        // 删除
        diffs.push({
          path: currentPath,
          type: 'removed',
          oldValue,
          description: this.describeValue(oldValue),
        });
      } else if (this.isObject(oldValue) && this.isObject(newValue)) {
        // 递归对比对象
        this.compareObjects(oldValue, newValue, currentPath, diffs);
      } else if (!this.deepEqual(oldValue, newValue)) {
        // 修改
        diffs.push({
          path: currentPath,
          type: 'modified',
          oldValue,
          newValue,
          description: `${this.describeValue(oldValue)} → ${this.describeValue(newValue)}`,
        });
      }
    }
  }

  /**
   * 判断是否为对象
   * 
   * @private
   * @param value - 值
   * @returns 是否为对象
   */
  private isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * 深度比较两个值
   * 
   * @private
   * @param a - 值 A
   * @param b - 值 B
   * @returns 是否相等
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, index) => this.deepEqual(val, b[index]));
    }

    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => this.deepEqual(a[key], b[key]));
    }

    return false;
  }

  /**
   * 描述值
   * 
   * @private
   * @param value - 值
   * @returns 描述文本
   */
  private describeValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return `Array[${value.length}]`;
    if (typeof value === 'object') return 'Object';
    return String(value);
  }

  /**
   * 计算统计信息
   * 
   * @private
   * @param diffs - 差异数组
   * @returns 统计信息
   */
  private calculateStats(diffs: DiffItem[]): Omit<DiffReport, 'diffs' | 'hasDifferences'> {
    return {
      total: diffs.length,
      added: diffs.filter(d => d.type === 'added').length,
      removed: diffs.filter(d => d.type === 'removed').length,
      modified: diffs.filter(d => d.type === 'modified').length,
      unchanged: 0, // 不统计未变更的
    };
  }

  /**
   * 格式化差异报告
   * 
   * @param report - 差异报告
   * @param options - 格式化选项
   * @returns 格式化后的文本
   */
  formatReport(
    report: DiffReport,
    options: { colors?: boolean; verbose?: boolean } = {}
  ): string {
    const { colors = false, verbose = true } = options;
    const lines: string[] = [];

    // 标题
    lines.push('='.repeat(60));
    lines.push('配置差异报告');
    lines.push('='.repeat(60));

    // 摘要
    lines.push('');
    lines.push('摘要:');
    lines.push(`  总差异数: ${report.total}`);
    lines.push(`  新增字段: ${report.added}`);
    lines.push(`  删除字段: ${report.removed}`);
    lines.push(`  修改字段: ${report.modified}`);

    if (!report.hasDifferences) {
      lines.push('');
      lines.push('✅ 配置无差异');
      lines.push('='.repeat(60));
      return lines.join('\n');
    }

    // 详细差异
    if (verbose) {
      lines.push('');
      lines.push('详细差异:');
      lines.push('');

      // 按类型分组
      const grouped = this.groupByType(report.diffs);

      if (grouped.added.length > 0) {
        lines.push('➕ 新增字段:');
        grouped.added.forEach(diff => {
          lines.push(`  + ${diff.path}: ${diff.description}`);
        });
        lines.push('');
      }

      if (grouped.removed.length > 0) {
        lines.push('➖ 删除字段:');
        grouped.removed.forEach(diff => {
          lines.push(`  - ${diff.path}: ${diff.description}`);
        });
        lines.push('');
      }

      if (grouped.modified.length > 0) {
        lines.push('🔄 修改字段:');
        grouped.modified.forEach(diff => {
          lines.push(`  ~ ${diff.path}: ${diff.description}`);
        });
        lines.push('');
      }
    }

    lines.push('='.repeat(60));
    return lines.join('\n');
  }

  /**
   * 按类型分组差异
   * 
   * @private
   * @param diffs - 差异数组
   * @returns 分组后的差异
   */
  private groupByType(diffs: DiffItem[]): Record<DiffType, DiffItem[]> {
    return {
      added: diffs.filter(d => d.type === 'added'),
      removed: diffs.filter(d => d.type === 'removed'),
      modified: diffs.filter(d => d.type === 'modified'),
      unchanged: diffs.filter(d => d.type === 'unchanged'),
    };
  }

  /**
   * 生成 JSON 格式的差异报告
   * 
   * @param report - 差异报告
   * @returns JSON 字符串
   */
  toJSON(report: DiffReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * 获取高风险变更
   * 
   * @param report - 差异报告
   * @returns 高风险变更列表
   * 
   * @description 识别可能导致服务中断的配置变更
   */
  getHighRiskChanges(report: DiffReport): DiffItem[] {
    const highRiskPaths = [
      'platform',
      'environment',
      'docker.registry',
      'kubernetes.namespace',
      'healthCheck.enabled',
    ];

    return report.diffs.filter(diff =>
      highRiskPaths.some(path => diff.path.startsWith(path))
    );
  }
}

