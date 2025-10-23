/**
 * 重试和超时工具
 */

import { logger } from './logger.js'
import { TimeoutError } from './errors.js'

export interface RetryOptions {
  maxAttempts?: number
  delay?: number
  backoff?: number
  timeout?: number
  onRetry?: (attempt: number, error: Error) => void
  shouldRetry?: (error: Error) => boolean
}

/**
 * 带重试的异步函数执行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 2,
    timeout,
    onRetry,
    shouldRetry = () => true,
  } = options

  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // 如果设置了超时，使用超时包装
      if (timeout) {
        return await withTimeout(fn(), timeout)
      }

      return await fn()
    } catch (error) {
      lastError = error as Error

      // 如果是最后一次尝试，直接抛出
      if (attempt === maxAttempts) {
        throw error
      }

      // 检查是否应该重试
      if (!shouldRetry(lastError)) {
        throw error
      }

      // 执行重试回调
      if (onRetry) {
        onRetry(attempt, lastError)
      } else {
        logger.warn(`Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}, retrying...`)
      }

      // 计算等待时间（指数退避）
      const waitTime = delay * Math.pow(backoff, attempt - 1)
      await sleep(waitTime)
    }
  }

  throw lastError!
}

/**
 * 带超时的 Promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation = 'Operation'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new TimeoutError(`${operation} timed out after ${timeoutMs}ms`, operation, timeoutMs)),
        timeoutMs
      )
    ),
  ])
}

/**
 * 睡眠函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 带取消的超时
 */
export class CancellableTimeout {
  private timeoutId?: NodeJS.Timeout

  wait(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.timeoutId = setTimeout(resolve, ms)
    })
  }

  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = undefined
    }
  }
}

/**
 * 重试特定错误
 */
export function shouldRetryError(error: Error): boolean {
  const retryableErrors = [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'Network error',
    'Connection refused',
  ]

  return retryableErrors.some((msg) =>
    error.message.toLowerCase().includes(msg.toLowerCase())
  )
}

/**
 * 指数退避重试
 */
export class ExponentialBackoff {
  constructor(
    private baseDelay = 1000,
    private maxDelay = 30000,
    private factor = 2
  ) { }

  getDelay(attempt: number): number {
    const delay = this.baseDelay * Math.pow(this.factor, attempt - 1)
    return Math.min(delay, this.maxDelay)
  }

  async wait(attempt: number): Promise<void> {
    const delay = this.getDelay(attempt)
    logger.debug(`Waiting ${delay}ms before retry...`)
    await sleep(delay)
  }
}




