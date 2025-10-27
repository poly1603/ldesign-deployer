/**
 * 资源监控器
 * @module monitoring/ResourceMonitor
 * 
 * @description 监控部署过程中的资源使用情况
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

/**
 * 资源使用快照接口
 */
export interface ResourceSnapshot {
  /** 时间戳 */
  timestamp: Date;
  /** CPU 使用率（百分比） */
  cpuUsage: number;
  /** 内存使用量（字节） */
  memoryUsage: number;
  /** 内存使用率（百分比） */
  memoryPercent: number;
  /** 磁盘使用量（字节） */
  diskUsage?: number;
  /** 网络接收字节数 */
  networkRx?: number;
  /** 网络发送字节数 */
  networkTx?: number;
}

/**
 * 监控配置接口
 */
export interface MonitorConfig {
  /** 采样间隔（毫秒） */
  interval?: number;
  /** 是否监控 CPU */
  trackCpu?: boolean;
  /** 是否监控内存 */
  trackMemory?: boolean;
  /** 是否监控磁盘 */
  trackDisk?: boolean;
  /** 是否监控网络 */
  trackNetwork?: boolean;
  /** CPU 告警阈值（百分比） */
  cpuThreshold?: number;
  /** 内存告警阈值（百分比） */
  memoryThreshold?: number;
}

/**
 * 资源监控器类
 * 
 * @description 实时监控系统资源使用情况，支持阈值告警
 * 
 * @example
 * ```typescript
 * const monitor = new ResourceMonitor({
 *   interval: 5000,  // 每 5 秒采样
 *   cpuThreshold: 80,
 *   memoryThreshold: 85
 * });
 * 
 * // 监听告警
 * monitor.on('alert', (alert) => {
 *   console.log(`资源告警: ${alert.type} 使用率 ${alert.value}%`);
 * });
 * 
 * // 开始监控
 * monitor.start();
 * 
 * // 停止监控
 * monitor.stop();
 * ```
 */
export class ResourceMonitor extends EventEmitter {
  private config: Required<MonitorConfig>;
  private intervalId?: NodeJS.Timeout;
  private snapshots: ResourceSnapshot[] = [];
  private isRunning = false;
  private lastCpuUsage?: NodeJS.CpuUsage;

  /**
   * 创建资源监控器
   * 
   * @param config - 监控配置
   */
  constructor(config: MonitorConfig = {}) {
    super();
    this.config = {
      interval: config.interval || 5000,
      trackCpu: config.trackCpu !== false,
      trackMemory: config.trackMemory !== false,
      trackDisk: config.trackDisk || false,
      trackNetwork: config.trackNetwork || false,
      cpuThreshold: config.cpuThreshold || 80,
      memoryThreshold: config.memoryThreshold || 85,
    };
  }

  /**
   * 开始监控
   * 
   * @example
   * ```typescript
   * monitor.start();
   * ```
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[ResourceMonitor] Already running');
      return;
    }

    logger.info('[ResourceMonitor] Starting resource monitoring...');
    this.isRunning = true;
    this.snapshots = [];
    this.lastCpuUsage = process.cpuUsage();

    // 立即采集一次
    this.collectSnapshot();

    // 定时采集
    this.intervalId = setInterval(() => {
      this.collectSnapshot();
    }, this.config.interval);

    this.emit('started');
  }

  /**
   * 停止监控
   * 
   * @example
   * ```typescript
   * monitor.stop();
   * ```
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('[ResourceMonitor] Stopping resource monitoring...');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.isRunning = false;
    this.emit('stopped');
  }

  /**
   * 采集资源快照
   * 
   * @private
   */
  private collectSnapshot(): void {
    const snapshot: ResourceSnapshot = {
      timestamp: new Date(),
      cpuUsage: 0,
      memoryUsage: 0,
      memoryPercent: 0,
    };

    // 采集 CPU
    if (this.config.trackCpu) {
      snapshot.cpuUsage = this.getCpuUsage();
      this.checkThreshold('cpu', snapshot.cpuUsage, this.config.cpuThreshold);
    }

    // 采集内存
    if (this.config.trackMemory) {
      const memInfo = this.getMemoryUsage();
      snapshot.memoryUsage = memInfo.used;
      snapshot.memoryPercent = memInfo.percent;
      this.checkThreshold('memory', snapshot.memoryPercent, this.config.memoryThreshold);
    }

    this.snapshots.push(snapshot);
    this.emit('snapshot', snapshot);
  }

  /**
   * 获取 CPU 使用率
   * 
   * @private
   * @returns CPU 使用率（百分比）
   */
  private getCpuUsage(): number {
    if (!this.lastCpuUsage) {
      this.lastCpuUsage = process.cpuUsage();
      return 0;
    }

    const currentUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();

    // 计算 CPU 使用百分比
    const totalUsage = currentUsage.user + currentUsage.system;
    const totalTime = this.config.interval * 1000; // 微秒
    const percent = (totalUsage / totalTime) * 100;

    return Math.min(100, Math.max(0, percent));
  }

  /**
   * 获取内存使用情况
   * 
   * @private
   * @returns 内存使用信息
   */
  private getMemoryUsage(): { used: number; total: number; percent: number } {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usedMemory = memUsage.heapUsed;
    const percent = (usedMemory / totalMemory) * 100;

    return {
      used: usedMemory,
      total: totalMemory,
      percent,
    };
  }

  /**
   * 检查阈值
   * 
   * @private
   * @param type - 资源类型
   * @param value - 当前值
   * @param threshold - 阈值
   */
  private checkThreshold(type: string, value: number, threshold: number): void {
    if (value >= threshold) {
      this.emit('alert', {
        type,
        value,
        threshold,
        message: `${type} usage (${value.toFixed(2)}%) exceeded threshold (${threshold}%)`,
      });
    }
  }

  /**
   * 获取所有快照
   * 
   * @returns 快照数组
   */
  getSnapshots(): ResourceSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * 获取最新快照
   * 
   * @returns 最新快照或 undefined
   */
  getLatestSnapshot(): ResourceSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  /**
   * 获取统计信息
   * 
   * @returns 统计信息
   */
  getStatistics(): {
    avgCpu: number;
    maxCpu: number;
    avgMemory: number;
    maxMemory: number;
    sampleCount: number;
  } {
    if (this.snapshots.length === 0) {
      return {
        avgCpu: 0,
        maxCpu: 0,
        avgMemory: 0,
        maxMemory: 0,
        sampleCount: 0,
      };
    }

    const cpuValues = this.snapshots.map(s => s.cpuUsage);
    const memoryValues = this.snapshots.map(s => s.memoryPercent);

    return {
      avgCpu: cpuValues.reduce((sum, v) => sum + v, 0) / cpuValues.length,
      maxCpu: Math.max(...cpuValues),
      avgMemory: memoryValues.reduce((sum, v) => sum + v, 0) / memoryValues.length,
      maxMemory: Math.max(...memoryValues),
      sampleCount: this.snapshots.length,
    };
  }

  /**
   * 清空快照
   */
  clearSnapshots(): void {
    this.snapshots = [];
  }

  /**
   * 是否正在运行
   * 
   * @returns 是否正在监控
   */
  isMonitoring(): boolean {
    return this.isRunning;
  }
}

