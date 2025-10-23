/**
 * 重试和超时工具测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withRetry, withTimeout, sleep, shouldRetryError, ExponentialBackoff } from '../retry.js'
import { TimeoutError } from '../errors.js'

describe('withRetry', () => {
  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    const result = await withRetry(fn, { maxAttempts: 3 })
    
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('success')
    
    const result = await withRetry(fn, { maxAttempts: 3, delay: 10 })
    
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should fail after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    
    await expect(
      withRetry(fn, { maxAttempts: 3, delay: 10 })
    ).rejects.toThrow('fail')
    
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should call onRetry callback', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success')
    
    const onRetry = vi.fn()
    
    await withRetry(fn, { maxAttempts: 3, delay: 10, onRetry })
    
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
  })

  it('should respect shouldRetry filter', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fatal'))
    const shouldRetry = vi.fn().mockReturnValue(false)
    
    await expect(
      withRetry(fn, { maxAttempts: 3, shouldRetry })
    ).rejects.toThrow('fatal')
    
    expect(fn).toHaveBeenCalledTimes(1) // 不应重试
  })

  it('should apply exponential backoff', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success')
    
    const start = Date.now()
    await withRetry(fn, { maxAttempts: 3, delay: 100, backoff: 2 })
    const elapsed = Date.now() - start
    
    // 第一次等待 100ms，第二次等待 200ms，总共至少 300ms
    expect(elapsed).toBeGreaterThanOrEqual(250)
  })
})

describe('withTimeout', () => {
  it('should resolve if promise completes in time', async () => {
    const promise = Promise.resolve('success')
    const result = await withTimeout(promise, 1000)
    
    expect(result).toBe('success')
  })

  it('should reject if promise times out', async () => {
    const promise = new Promise((resolve) => setTimeout(resolve, 200))
    
    await expect(
      withTimeout(promise, 100, 'TestOp')
    ).rejects.toThrow(TimeoutError)
  })

  it('should include operation name in timeout error', async () => {
    const promise = new Promise((resolve) => setTimeout(resolve, 200))
    
    try {
      await withTimeout(promise, 100, 'MyOperation')
    } catch (error: any) {
      expect(error).toBeInstanceOf(TimeoutError)
      expect(error.message).toContain('MyOperation')
      expect(error.operation).toBe('MyOperation')
      expect(error.timeout).toBe(100)
    }
  })
})

describe('sleep', () => {
  it('should sleep for specified time', async () => {
    const start = Date.now()
    await sleep(100)
    const elapsed = Date.now() - start
    
    expect(elapsed).toBeGreaterThanOrEqual(95)
    expect(elapsed).toBeLessThan(150)
  })
})

describe('shouldRetryError', () => {
  it('should return true for network errors', () => {
    expect(shouldRetryError(new Error('ECONNREFUSED'))).toBe(true)
    expect(shouldRetryError(new Error('ECONNRESET'))).toBe(true)
    expect(shouldRetryError(new Error('ETIMEDOUT'))).toBe(true)
    expect(shouldRetryError(new Error('Network error occurred'))).toBe(true)
  })

  it('should return false for non-retryable errors', () => {
    expect(shouldRetryError(new Error('Invalid config'))).toBe(false)
    expect(shouldRetryError(new Error('Permission denied'))).toBe(false)
  })
})

describe('ExponentialBackoff', () => {
  it('should calculate exponential delays', () => {
    const backoff = new ExponentialBackoff(1000, 30000, 2)
    
    expect(backoff.getDelay(1)).toBe(1000)
    expect(backoff.getDelay(2)).toBe(2000)
    expect(backoff.getDelay(3)).toBe(4000)
    expect(backoff.getDelay(4)).toBe(8000)
  })

  it('should cap at max delay', () => {
    const backoff = new ExponentialBackoff(1000, 5000, 2)
    
    expect(backoff.getDelay(10)).toBe(5000) // 应该被限制在 5000
  })

  it('should wait for calculated delay', async () => {
    const backoff = new ExponentialBackoff(100, 1000, 2)
    
    const start = Date.now()
    await backoff.wait(2)
    const elapsed = Date.now() - start
    
    expect(elapsed).toBeGreaterThanOrEqual(180) // 100 * 2^1 = 200
    expect(elapsed).toBeLessThan(250)
  })
})



