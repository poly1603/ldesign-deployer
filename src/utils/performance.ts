/**
 * 性能监控和优化工具
 * @module utils/performance
 * 
 * @description 提供性能监控、计时和优化工具
 */

import { logger } from './logger.js';

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  /** 操作名称 */
  name: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
  /** 持续时间（毫秒） */
  duration: number;
  /** 内存使用（字节） */
  memoryUsage?: number;
}

/**
 * 性能计时器类
 * 
 * @description 用于测量操作的执行时间和资源使用
 * 
 * @example
 * ```typescript
 * const timer = new PerformanceTimer('部署操作');
 * 
 * // 执行操作
 * await deployApplication();
 * 
 * const metrics = timer.end();
 * console.log(`耗时: ${metrics.duration}ms`);
 * ```
 */
export class PerformanceTimer {
  private name: string;
  private startTime: number;
  private startMemory?: number;

  /**
   * 创建性能计时器
   * 
   * @param name - 操作名称
   * @param trackMemory - 是否追踪内存使用
   */
  constructor(name: string, trackMemory = false) {
    this.name = name;
    this.startTime = Date.now();

    if (trackMemory && process.memoryUsage) {
      this.startMemory = process.memoryUsage().heapUsed;
    }
  }

  /**
   * 结束计时
   * 
   * @returns 性能指标
   */
  end(): PerformanceMetrics {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    let memoryUsage: number | undefined;
    if (this.startMemory && process.memoryUsage) {
      const endMemory = process.memoryUsage().heapUsed;
      memoryUsage = endMemory - this.startMemory;
    }

    const metrics: PerformanceMetrics = {
      name: this.name,
      startTime: this.startTime,
      endTime,
      duration,
      memoryUsage,
    };

    logger.debug(
      `[Performance] ${this.name}: ${duration}ms` +
      (memoryUsage ? ` (${this.formatBytes(memoryUsage)})` : '')
    );

    return metrics;
  }

  /**
   * 格式化字节数
   * 
   * @private
   * @param bytes - 字节数
   * @returns 格式化后的字符串
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = Math.abs(bytes);
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    const sign = bytes < 0 ? '-' : '+';
    return `${sign}${value.toFixed(2)} ${units[unitIndex]}`;
  }
}

/**
 * 性能监控装饰器
 * 
 * @param name - 操作名称
 * @returns 装饰器函数
 * 
 * @example
 * ```typescript
 * class MyClass {
 *   @measurePerformance('deploy')
 *   async deploy() {
 *     // 部署逻辑
 *   }
 * }
 * ```
 */
export function measurePerformance(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const operationName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const timer = new PerformanceTimer(operationName);
      try {
        const result = await originalMethod.apply(this, args);
        timer.end();
        return result;
      } catch (error) {
        timer.end();
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 包装异步函数以测量性能
 * 
 * @param fn - 异步函数
 * @param name - 操作名称
 * @returns 包装后的函数
 * 
 * @example
 * ```typescript
 * const timedFn = withPerformanceTracking(
 *   async () => await heavyOperation(),
 *   'Heavy Operation'
 * );
 * 
 * const result = await timedFn();
 * ```
 */
export function withPerformanceTracking<T>(
  fn: () => Promise<T>,
  name: string
): () => Promise<T> {
  return async () => {
    const timer = new PerformanceTimer(name);
    try {
      const result = await fn();
      timer.end();
      return result;
    } catch (error) {
      timer.end();
      throw error;
    }
  };
}

/**
 * 性能基准测试
 * 
 * @param fn - 要测试的函数
 * @param iterations - 迭代次数
 * @param name - 测试名称
 * @returns 平均执行时间（毫秒）
 * 
 * @example
 * ```typescript
 * const avgTime = await benchmark(
 *   async () => await someOperation(),
 *   100,
 *   'Some Operation'
 * );
 * 
 * console.log(`平均耗时: ${avgTime}ms`);
 * ```
 */
export async function benchmark(
  fn: () => Promise<any>,
  iterations: number,
  name = 'Benchmark'
): Promise<number> {
  const times: number[] = [];

  logger.info(`[Benchmark] Running ${name} ${iterations} times...`);

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    times.push(duration);
  }

  const avg = times.reduce((sum, t) => sum + t, 0) / iterations;
  const min = Math.min(...times);
  const max = Math.max(...times);

  logger.info(`[Benchmark] ${name} Results:`);
  logger.info(`  Average: ${avg.toFixed(2)}ms`);
  logger.info(`  Min: ${min}ms`);
  logger.info(`  Max: ${max}ms`);

  return avg;
}

/**
 * 记忆化缓存（函数结果缓存）
 * 
 * @param fn - 要缓存的函数
 * @param keyGenerator - 缓存键生成函数
 * @returns 缓存包装后的函数
 * 
 * @example
 * ```typescript
 * const cachedFn = memoize(
 *   async (id: string) => await fetchData(id),
 *   (id) => `data-${id}`
 * );
 * 
 * // 第一次调用会执行函数
 * await cachedFn('123');
 * 
 * // 第二次调用直接返回缓存结果
 * await cachedFn('123');
 * ```
 */
export function memoize<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, any>();

  return (async (...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      logger.debug(`[Memoize] Cache hit for: ${key}`);
      return cache.get(key);
    }

    logger.debug(`[Memoize] Cache miss for: ${key}`);
    const result = await fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * 节流函数
 * 
 * @param fn - 要节流的函数
 * @param wait - 等待时间（毫秒）
 * @returns 节流后的函数
 * 
 * @example
 * ```typescript
 * const throttledFn = throttle(
 *   async () => await saveConfig(),
 *   1000
 * );
 * 
 * // 快速多次调用只会执行一次
 * throttledFn();
 * throttledFn();
 * throttledFn();
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    lastArgs = args;

    if (!timeout) {
      timeout = setTimeout(() => {
        if (lastArgs) {
          fn(...lastArgs);
        }
        timeout = null;
      }, wait);
    }
  };
}

/**
 * 防抖函数
 * 
 * @param fn - 要防抖的函数
 * @param wait - 等待时间（毫秒）
 * @returns 防抖后的函数
 * 
 * @example
 * ```typescript
 * const debouncedFn = debounce(
 *   async () => await validateConfig(),
 *   500
 * );
 * 
 * // 快速多次调用只会在最后一次后执行
 * debouncedFn();
 * debouncedFn();
 * debouncedFn(); // 只有这次会实际执行
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      fn(...args);
      timeout = null;
    }, wait);
  };
}

