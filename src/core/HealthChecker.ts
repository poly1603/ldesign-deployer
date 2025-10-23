/**
 * 健康检查器
 */

import { logger } from '../utils/logger.js'
import type { HealthCheckConfig, ProbeConfig } from '../types/index.js'
import http from 'http'
import https from 'https'

export interface HealthCheckResult {
  healthy: boolean
  message: string
  timestamp: string
  duration: number
}

export class HealthChecker {
  /**
   * 执行健康检查
   */
  async check(config: HealthCheckConfig): Promise<HealthCheckResult> {
    if (!config.enabled) {
      return {
        healthy: true,
        message: 'Health check disabled',
        timestamp: new Date().toISOString(),
        duration: 0,
      }
    }

    const startTime = Date.now()

    try {
      const healthy = await this.performCheck(config)
      const duration = Date.now() - startTime

      return {
        healthy,
        message: healthy ? 'Health check passed' : 'Health check failed',
        timestamp: new Date().toISOString(),
        duration,
      }
    } catch (error: any) {
      const duration = Date.now() - startTime

      return {
        healthy: false,
        message: `Health check error: ${error.message}`,
        timestamp: new Date().toISOString(),
        duration,
      }
    }
  }

  /**
   * 执行 HTTP 健康检查
   */
  async checkHttp(url: string, timeout = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      const client = url.startsWith('https') ? https : http
      const timer = setTimeout(() => {
        resolve(false)
      }, timeout)

      client
        .get(url, (res) => {
          clearTimeout(timer)
          resolve(res.statusCode === 200)
        })
        .on('error', () => {
          clearTimeout(timer)
          resolve(false)
        })
    })
  }

  /**
   * 生成 Kubernetes 探针配置
   */
  generateK8sProbe(type: 'liveness' | 'readiness' | 'startup', config: HealthCheckConfig): ProbeConfig | undefined {
    if (!config.enabled) {
      return undefined
    }

    const probe: ProbeConfig = {
      httpGet: {
        path: config.path || '/health',
        port: config.port || 3000,
        scheme: 'HTTP',
      },
      initialDelaySeconds: type === 'startup' ? 0 : 10,
      periodSeconds: config.interval || 30,
      timeoutSeconds: config.timeout || 5,
      successThreshold: 1,
      failureThreshold: config.retries || 3,
    }

    if (type === 'startup') {
      probe.failureThreshold = 30 // Give more time for startup
    }

    return probe
  }

  /**
   * 生成 Docker 健康检查命令
   */
  generateDockerHealthCheck(config: HealthCheckConfig): string | undefined {
    if (!config.enabled) {
      return undefined
    }

    const path = config.path || '/health'
    const port = config.port || 3000
    const interval = config.interval || 30
    const timeout = config.timeout || 5
    const retries = config.retries || 3
    const startPeriod = config.startPeriod || 5

    return `HEALTHCHECK --interval=${interval}s --timeout=${timeout}s --start-period=${startPeriod}s --retries=${retries} \\
  CMD wget --quiet --tries=1 --spider http://localhost:${port}${path} || exit 1`
  }

  /**
   * 执行健康检查
   */
  private async performCheck(config: HealthCheckConfig): Promise<boolean> {
    const url = `http://localhost:${config.port || 3000}${config.path || '/health'}`
    return this.checkHttp(url, config.timeout || 5000)
  }

  /**
   * 持续健康检查（用于监控）
   */
  async monitor(
    config: HealthCheckConfig,
    onResult: (result: HealthCheckResult) => void,
    intervalMs?: number
  ): Promise<() => void> {
    const interval = intervalMs || (config.interval || 30) * 1000

    const intervalId = setInterval(async () => {
      const result = await this.check(config)
      onResult(result)

      if (!result.healthy) {
        logger.warn('Health check failed:', result.message)
      }
    }, interval)

    // 返回停止函数
    return () => clearInterval(intervalId)
  }
}




