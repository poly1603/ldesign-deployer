/**
 * 部署进度追踪
 * 支持 ora 旋转指示器和预估时间
 */

import { logger } from './logger.js'
import ora, { type Ora } from 'ora'

export enum DeploymentPhase {
  INIT = 'init',
  PRE_CHECK = 'preCheck',
  VALIDATE = 'validate',
  PRE_HOOKS = 'preHooks',
  BUILD = 'build',
  PUSH = 'push',
  DEPLOY = 'deploy',
  HEALTH_CHECK = 'healthCheck',
  POST_HOOKS = 'postHooks',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

export interface ProgressEvent {
  phase: DeploymentPhase
  progress: number // 0-100
  message: string
  timestamp: string
  data?: any
}

export type ProgressListener = (event: ProgressEvent) => void

export class ProgressTracker {
  private listeners: ProgressListener[] = []
  private currentPhase: DeploymentPhase = DeploymentPhase.INIT
  private currentProgress = 0
  private startTime = Date.now()
  private phaseStartTimes = new Map<DeploymentPhase, number>()
  private phaseDurations = new Map<DeploymentPhase, number>()
  private enableSpinner = false
  private spinner?: Ora

  /**
   * 启用旋转指示器
   */
  useSpinner(): void {
    this.enableSpinner = true
  }

  /**
   * 禁用旋转指示器
   */
  disableSpinner(): void {
    this.enableSpinner = false
    if (this.spinner) {
      this.spinner.stop()
      this.spinner = undefined
    }
  }

  /**
   * 添加监听器
   */
  on(listener: ProgressListener): void {
    this.listeners.push(listener)
  }

  /**
   * 移除监听器
   */
  off(listener: ProgressListener): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * 更新进度
   */
  update(phase: DeploymentPhase, progress: number, message: string, data?: any): void {
    // 记录阶段切换时间
    if (phase !== this.currentPhase) {
      if (this.currentPhase && this.phaseStartTimes.has(this.currentPhase)) {
        const duration = Date.now() - this.phaseStartTimes.get(this.currentPhase)!
        this.phaseDurations.set(this.currentPhase, duration)
      }
      this.phaseStartTimes.set(phase, Date.now())
    }

    this.currentPhase = phase
    this.currentProgress = progress

    const event: ProgressEvent = {
      phase,
      progress,
      message,
      timestamp: new Date().toISOString(),
      data,
    }

    // 触发所有监听器
    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        logger.error('Progress listener error:', error)
      }
    })

    // 使用 spinner 或默认日志输出
    if (this.enableSpinner) {
      this.updateSpinner(phase, progress, message)
    } else {
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1)
      const estimate = this.getEstimatedTime()
      const estimateStr = estimate ? ` (剩余 ~${estimate}s)` : ''
      logger.info(`[${progress}%] [${elapsed}s]${estimateStr} ${this.getPhaseIcon(phase)} ${message}`)
    }
  }

  /**
   * 更新旋转指示器
   */
  private updateSpinner(phase: DeploymentPhase, progress: number, message: string): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1)
    const estimate = this.getEstimatedTime()
    const estimateStr = estimate ? ` (剩余 ~${estimate}s)` : ''
    const text = `[${progress}%] [${elapsed}s]${estimateStr} ${this.getPhaseIcon(phase)} ${message}`

    if (!this.spinner) {
      this.spinner = ora(text).start()
    } else {
      this.spinner.text = text
    }

    // 根据进度更新 spinner 颜色
    if (progress === 100) {
      this.spinner.succeed(text)
      this.spinner = undefined
    } else if (progress < 30) {
      this.spinner.color = 'blue'
    } else if (progress < 70) {
      this.spinner.color = 'yellow'
    } else {
      this.spinner.color = 'green'
    }
  }

  /**
   * 预估剩余时间（秒）
   */
  private getEstimatedTime(): number | null {
    if (this.currentProgress === 0) return null

    const elapsed = Date.now() - this.startTime
    const estimatedTotal = (elapsed / this.currentProgress) * 100
    const remaining = Math.ceil((estimatedTotal - elapsed) / 1000)

    return remaining > 0 ? remaining : null
  }

  /**
   * 标记完成
   */
  complete(message = 'Deployment completed'): void {
    this.update(DeploymentPhase.COMPLETE, 100, message)

    if (this.spinner) {
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1)
      this.spinner.succeed(`✅ ${message} (${elapsed}s)`)
      this.spinner = undefined
    }
  }

  /**
   * 标记失败
   */
  fail(message = 'Deployment failed'): void {
    this.update(DeploymentPhase.FAILED, this.currentProgress, message)

    if (this.spinner) {
      this.spinner.fail(`❌ ${message}`)
      this.spinner = undefined
    }
  }

  /**
   * 重置
   */
  reset(): void {
    this.currentPhase = DeploymentPhase.INIT
    this.currentProgress = 0
    this.startTime = Date.now()
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    phase: DeploymentPhase
    progress: number
    elapsed: number
    estimatedRemaining: number | null
  } {
    return {
      phase: this.currentPhase,
      progress: this.currentProgress,
      elapsed: Date.now() - this.startTime,
      estimatedRemaining: this.getEstimatedTime(),
    }
  }

  /**
   * 获取阶段统计
   */
  getPhaseStats(): Array<{
    phase: DeploymentPhase
    duration: number
    percentage: number
  }> {
    const total = Date.now() - this.startTime
    const stats: Array<{
      phase: DeploymentPhase
      duration: number
      percentage: number
    }> = []

    this.phaseDurations.forEach((duration, phase) => {
      stats.push({
        phase,
        duration,
        percentage: Math.round((duration / total) * 100),
      })
    })

    return stats.sort((a, b) => b.duration - a.duration)
  }

  /**
   * 获取阶段图标
   */
  private getPhaseIcon(phase: DeploymentPhase): string {
    const icons: Record<DeploymentPhase, string> = {
      [DeploymentPhase.INIT]: '🚀',
      [DeploymentPhase.PRE_CHECK]: '🔍',
      [DeploymentPhase.VALIDATE]: '✓',
      [DeploymentPhase.PRE_HOOKS]: '🔧',
      [DeploymentPhase.BUILD]: '🏗️',
      [DeploymentPhase.PUSH]: '📤',
      [DeploymentPhase.DEPLOY]: '🚢',
      [DeploymentPhase.HEALTH_CHECK]: '🏥',
      [DeploymentPhase.POST_HOOKS]: '🔧',
      [DeploymentPhase.COMPLETE]: '✅',
      [DeploymentPhase.FAILED]: '❌',
    }

    return icons[phase] || '•'
  }
}

/**
 * 创建控制台进度条
 */
export class ConsoleProgressBar {
  private width = 40

  render(progress: number, message?: string): void {
    const filled = Math.round((progress / 100) * this.width)
    const empty = this.width - filled

    const bar = '█'.repeat(filled) + '░'.repeat(empty)
    const percent = `${progress}%`.padStart(4)

    process.stdout.write(`\r${bar} ${percent} ${message || ''}`)

    if (progress >= 100) {
      process.stdout.write('\n')
    }
  }

  clear(): void {
    process.stdout.write('\r' + ' '.repeat(80) + '\r')
  }
}




