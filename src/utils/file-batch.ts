/**
 * 批量文件操作工具
 * @module utils/file-batch
 * 
 * @description 提供批量文件读写功能，提高 I/O 性能
 */

import { readFile as fsReadFile, writeFile as fsWriteFile } from 'fs/promises';
import { logger } from './logger.js';

/**
 * 文件操作接口
 */
export interface FileOperation {
  /** 文件路径 */
  path: string;
  /** 操作类型 */
  type: 'read' | 'write';
  /** 写入内容（仅用于 write） */
  content?: string;
}

/**
 * 批量操作结果接口
 */
export interface BatchResult<T> {
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  results: T[];
  /** 错误列表 */
  errors: Array<{ path: string; error: Error }>;
}

/**
 * 文件批处理器类
 * 
 * @description 批量处理文件读写操作，提高性能
 * 
 * @example
 * ```typescript
 * const batcher = new FileBatcher();
 * 
 * // 批量读取
 * const files = await batcher.readMany([
 *   'config1.json',
 *   'config2.json',
 *   'config3.json'
 * ]);
 * 
 * // 批量写入
 * await batcher.writeMany([
 *   { path: 'file1.txt', content: 'content1' },
 *   { path: 'file2.txt', content: 'content2' }
 * ]);
 * ```
 */
export class FileBatcher {
  private concurrency: number;

  /**
   * 创建文件批处理器
   * 
   * @param concurrency - 并发数，默认 10
   */
  constructor(concurrency = 10) {
    this.concurrency = concurrency;
  }

  /**
   * 批量读取文件
   * 
   * @param paths - 文件路径数组
   * @param options - 读取选项
   * @returns 批量读取结果
   * 
   * @example
   * ```typescript
   * const result = await batcher.readMany(['a.txt', 'b.txt', 'c.txt']);
   * if (result.success) {
   *   console.log('所有文件读取成功');
   *   result.results.forEach(({ path, content }) => {
   *     console.log(`${path}: ${content}`);
   *   });
   * }
   * ```
   */
  async readMany(
    paths: string[],
    options: { encoding?: BufferEncoding; continueOnError?: boolean } = {}
  ): Promise<BatchResult<{ path: string; content: string }>> {
    const { encoding = 'utf-8', continueOnError = true } = options;

    logger.debug(`[FileBatcher] Reading ${paths.length} files...`);

    const results: Array<{ path: string; content: string }> = [];
    const errors: Array<{ path: string; error: Error }> = [];

    // 分批处理
    for (let i = 0; i < paths.length; i += this.concurrency) {
      const batch = paths.slice(i, i + this.concurrency);
      const promises = batch.map(async path => {
        try {
          const content = await fsReadFile(path, encoding);
          results.push({ path, content });
        } catch (error) {
          errors.push({ path, error: error as Error });
          if (!continueOnError) {
            throw error;
          }
        }
      });

      await Promise.all(promises);
    }

    const success = errors.length === 0;

    if (!success) {
      logger.warn(`[FileBatcher] ${errors.length}/${paths.length} files failed to read`);
    }

    return { success, results, errors };
  }

  /**
   * 批量写入文件
   * 
   * @param operations - 写入操作数组
   * @param options - 写入选项
   * @returns 批量写入结果
   * 
   * @example
   * ```typescript
   * await batcher.writeMany([
   *   { path: 'file1.txt', content: 'content1' },
   *   { path: 'file2.txt', content: 'content2' }
   * ]);
   * ```
   */
  async writeMany(
    operations: Array<{ path: string; content: string }>,
    options: { encoding?: BufferEncoding; continueOnError?: boolean } = {}
  ): Promise<BatchResult<{ path: string }>> {
    const { encoding = 'utf-8', continueOnError = true } = options;

    logger.debug(`[FileBatcher] Writing ${operations.length} files...`);

    const results: Array<{ path: string }> = [];
    const errors: Array<{ path: string; error: Error }> = [];

    // 分批处理
    for (let i = 0; i < operations.length; i += this.concurrency) {
      const batch = operations.slice(i, i + this.concurrency);
      const promises = batch.map(async ({ path, content }) => {
        try {
          await fsWriteFile(path, content, encoding);
          results.push({ path });
        } catch (error) {
          errors.push({ path, error: error as Error });
          if (!continueOnError) {
            throw error;
          }
        }
      });

      await Promise.all(promises);
    }

    const success = errors.length === 0;

    if (!success) {
      logger.warn(`[FileBatcher] ${errors.length}/${operations.length} files failed to write`);
    }

    return { success, results, errors };
  }

  /**
   * 批量执行文件操作
   * 
   * @param operations - 文件操作数组
   * @returns 批量操作结果
   */
  async executeBatch(operations: FileOperation[]): Promise<BatchResult<any>> {
    const reads = operations.filter(op => op.type === 'read');
    const writes = operations.filter(op => op.type === 'write');

    const results: any[] = [];
    const errors: Array<{ path: string; error: Error }> = [];

    // 先执行读取
    if (reads.length > 0) {
      const readResult = await this.readMany(reads.map(op => op.path));
      results.push(...readResult.results);
      errors.push(...readResult.errors);
    }

    // 再执行写入
    if (writes.length > 0) {
      const writeOps = writes.map(op => ({
        path: op.path,
        content: op.content!,
      }));
      const writeResult = await this.writeMany(writeOps);
      results.push(...writeResult.results);
      errors.push(...writeResult.errors);
    }

    return {
      success: errors.length === 0,
      results,
      errors,
    };
  }

  /**
   * 设置并发数
   * 
   * @param concurrency - 并发数
   */
  setConcurrency(concurrency: number): void {
    this.concurrency = concurrency;
  }

  /**
   * 获取并发数
   * 
   * @returns 并发数
   */
  getConcurrency(): number {
    return this.concurrency;
  }
}

/**
 * 默认批处理器实例
 */
export const defaultBatcher = new FileBatcher();

/**
 * 批量读取文件（便捷函数）
 * 
 * @param paths - 文件路径数组
 * @returns 批量读取结果
 */
export async function readManyFiles(paths: string[]): Promise<BatchResult<{ path: string; content: string }>> {
  return defaultBatcher.readMany(paths);
}

/**
 * 批量写入文件（便捷函数）
 * 
 * @param operations - 写入操作数组
 * @returns 批量写入结果
 */
export async function writeManyFiles(
  operations: Array<{ path: string; content: string }>
): Promise<BatchResult<{ path: string }>> {
  return defaultBatcher.writeMany(operations);
}

