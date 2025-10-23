/**
 * 部署进度追踪
 */

import { logger } from './logger.js'

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

    // 默认日志输出
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1)
    logger.info(`[${progress}%] [${elapsed}s] ${this.getPhaseIcon(phase)} ${message}`)
  }

  /**
   * 标记完成
   */
  complete(message = 'Deployment completed'): void {
    this.update(DeploymentPhase.COMPLETE, 100, message)
  }

  /**
   * 标记失败
   */
  fail(message = 'Deployment failed'): void {
    this.update(DeploymentPhase.FAILED, this.currentProgress, message)
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
  } {
    return {
      phase: this.currentPhase,
      progress: this.currentProgress,
      elapsed: Date.now() - this.startTime,
    }
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




