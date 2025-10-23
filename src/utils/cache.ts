/**
 * 缓存系统
 * 提供配置缓存、构建缓存等功能，优化性能
 */

import { readFile, writeFile, fileExists } from './file-system.js'
import { logger } from './logger.js'
import { join } from 'path'
import { createHash } from 'crypto'

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  key: string
}

/**
 * 缓存配置
 */
interface CacheOptions {
  ttl?: number // 缓存生存时间（毫秒）
  maxSize?: number // 最大缓存条目数
  persistent?: boolean // 是否持久化到文件
  cacheDir?: string // 持久化目录
}

/**
 * 内存缓存管理器
 */
export class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private maxSize: number
  private defaultTTL: number

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 100
    this.defaultTTL = options.ttl || 60000 // 默认 60 秒
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.getOldestKey()
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      key,
    })
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 检查缓存是否存在且有效
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size
  }

  /**
   * 获取最旧的缓存键
   */
  private getOldestKey(): string | null {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    return oldestKey
  }

  /**
   * 获取所有缓存键
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        cleaned++
      }
    }

    return cleaned
  }
}

/**
 * 持久化缓存管理器
 */
export class PersistentCache extends MemoryCache {
  private cacheDir: string
  private cacheFile: string

  constructor(options: CacheOptions = {}) {
    super(options)
    this.cacheDir = options.cacheDir || '.deployer-cache'
    this.cacheFile = join(this.cacheDir, 'cache.json')
  }

  /**
   * 从文件加载缓存
   */
  async load(): Promise<void> {
    try {
      if (await fileExists(this.cacheFile)) {
        const content = await readFile(this.cacheFile)
        const entries = JSON.parse(content) as CacheEntry<any>[]

        entries.forEach((entry) => {
          // 只加载未过期的条目
          if (Date.now() - entry.timestamp <= entry.ttl) {
            super.set(entry.key, entry.data, entry.ttl)
          }
        })

        logger.debug(`Loaded ${entries.length} cache entries from disk`)
      }
    } catch (error: any) {
      logger.warn('Failed to load cache from disk:', error.message)
    }
  }

  /**
   * 保存缓存到文件
   */
  async save(): Promise<void> {
    try {
      const entries = this.keys().map((key) => {
        const entry = this.get(key)
        return entry
      }).filter(Boolean)

      await writeFile(this.cacheFile, JSON.stringify(entries, null, 2))
      logger.debug(`Saved ${entries.length} cache entries to disk`)
    } catch (error: any) {
      logger.warn('Failed to save cache to disk:', error.message)
    }
  }

  /**
   * 设置缓存（重写以支持自动保存）
   */
  override set<T>(key: string, data: T, ttl?: number): void {
    super.set(key, data, ttl)
    // 异步保存，不阻塞
    this.save().catch(() => { })
  }

  /**
   * 删除缓存（重写以支持自动保存）
   */
  override delete(key: string): boolean {
    const result = super.delete(key)
    // 异步保存，不阻塞
    this.save().catch(() => { })
    return result
  }

  /**
   * 清空缓存（重写以支持自动保存）
   */
  override clear(): void {
    super.clear()
    // 异步保存，不阻塞
    this.save().catch(() => { })
  }
}

/**
 * 配置缓存管理器
 */
export class ConfigCache {
  private static cache = new MemoryCache({ ttl: 60000, maxSize: 50 })

  /**
   * 生成配置缓存键
   */
  static generateKey(configFile: string): string {
    return `config:${configFile}`
  }

  /**
   * 获取配置缓存
   */
  static get<T>(configFile: string): T | null {
    const key = this.generateKey(configFile)
    return this.cache.get<T>(key)
  }

  /**
   * 设置配置缓存
   */
  static set<T>(configFile: string, config: T, ttl?: number): void {
    const key = this.generateKey(configFile)
    this.cache.set(key, config, ttl)
  }

  /**
   * 删除配置缓存
   */
  static delete(configFile: string): boolean {
    const key = this.generateKey(configFile)
    return this.cache.delete(key)
  }

  /**
   * 清空所有配置缓存
   */
  static clear(): void {
    this.cache.clear()
  }

  /**
   * 检查配置缓存是否存在
   */
  static has(configFile: string): boolean {
    const key = this.generateKey(configFile)
    return this.cache.has(key)
  }
}

/**
 * Docker 构建缓存管理器
 */
export class BuildCache {
  private static cache = new MemoryCache({ ttl: 3600000, maxSize: 20 }) // 1小时

  /**
   * 生成构建缓存键（基于 Dockerfile 和上下文哈希）
   */
  static generateKey(context: string, dockerfile?: string): string {
    const hash = createHash('sha256')
    hash.update(context)
    if (dockerfile) {
      hash.update(dockerfile)
    }
    return `build:${hash.digest('hex')}`
  }

  /**
   * 获取构建缓存
   */
  static get(context: string, dockerfile?: string): string | null {
    const key = this.generateKey(context, dockerfile)
    return this.cache.get<string>(key)
  }

  /**
   * 设置构建缓存（保存镜像 ID）
   */
  static set(context: string, imageId: string, dockerfile?: string): void {
    const key = this.generateKey(context, dockerfile)
    this.cache.set(key, imageId)
  }

  /**
   * 删除构建缓存
   */
  static delete(context: string, dockerfile?: string): boolean {
    const key = this.generateKey(context, dockerfile)
    return this.cache.delete(key)
  }

  /**
   * 清空所有构建缓存
   */
  static clear(): void {
    this.cache.clear()
  }
}

/**
 * 健康检查缓存管理器
 */
export class HealthCheckCache {
  private static cache = new MemoryCache({ ttl: 30000, maxSize: 10 }) // 30秒

  /**
   * 生成健康检查缓存键
   */
  static generateKey(url: string): string {
    return `health:${url}`
  }

  /**
   * 获取健康检查结果缓存
   */
  static get(url: string): boolean | null {
    const key = this.generateKey(url)
    return this.cache.get<boolean>(key)
  }

  /**
   * 设置健康检查结果缓存
   */
  static set(url: string, healthy: boolean): void {
    const key = this.generateKey(url)
    this.cache.set(key, healthy)
  }

  /**
   * 删除健康检查缓存
   */
  static delete(url: string): boolean {
    const key = this.generateKey(url)
    return this.cache.delete(key)
  }

  /**
   * 清空所有健康检查缓存
   */
  static clear(): void {
    this.cache.clear()
  }
}

/**
 * 通用缓存装饰器
 */
export function Cacheable(ttl?: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const cache = new MemoryCache({ ttl: ttl || 60000 })

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`

      // 尝试从缓存获取
      const cached = cache.get(cacheKey)
      if (cached !== null) {
        logger.debug(`Cache hit for ${propertyKey}`)
        return cached
      }

      // 执行原始方法
      const result = await originalMethod.apply(this, args)

      // 缓存结果
      cache.set(cacheKey, result)

      return result
    }

    return descriptor
  }
}

/**
 * 清理所有缓存
 */
export function clearAllCaches(): void {
  ConfigCache.clear()
  BuildCache.clear()
  HealthCheckCache.clear()
  logger.info('All caches cleared')
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats() {
  return {
    config: {
      size: ConfigCache['cache'].size(),
      keys: ConfigCache['cache'].keys().length,
    },
    build: {
      size: BuildCache['cache'].size(),
      keys: BuildCache['cache'].keys().length,
    },
    healthCheck: {
      size: HealthCheckCache['cache'].size(),
      keys: HealthCheckCache['cache'].keys().length,
    },
  }
}

