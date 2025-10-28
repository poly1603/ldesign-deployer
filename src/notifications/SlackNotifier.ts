/**
 * Slack 通知器
 * @module notifications/SlackNotifier
 * 
 * @description 通过 Slack Webhook 发送通知
 */

import { BaseNotifier, NotificationMessage, DeploymentNotification } from './BaseNotifier.js'
import { logger } from '../utils/logger.js'

/**
 * Slack 通知器配置
 */
export interface SlackNotifierConfig {
  /** Webhook URL */
  webhookUrl: string
  /** 默认频道（可选） */
  channel?: string
  /** 用户名（可选） */
  username?: string
  /** 图标表情（可选） */
  iconEmoji?: string
  /** 是否启用 */
  enabled?: boolean
}

/**
 * Slack 通知器类
 * 
 * @description 将通知发送到 Slack 频道
 * 
 * @example
 * ```typescript
 * const notifier = new SlackNotifier({
 *   webhookUrl: 'https://hooks.slack.com/services/...',
 *   channel: '#deployments',
 *   username: 'Deploy Bot',
 *   iconEmoji: ':rocket:'
 * })
 * 
 * await notifier.send({
 *   title: '部署通知',
 *   message: '部署成功',
 *   level: 'success'
 * })
 * ```
 */
export class SlackNotifier extends BaseNotifier {
  private webhookUrl: string
  private channel?: string
  private username: string
  private iconEmoji: string

  constructor(config: SlackNotifierConfig) {
    super()
    this.webhookUrl = config.webhookUrl
    this.channel = config.channel
    this.username = config.username || 'Deployer Bot'
    this.iconEmoji = config.iconEmoji || ':rocket:'
    this.enabled = config.enabled !== false
  }

  getName(): string {
    return 'slack'
  }

  /**
   * 发送通知
   */
  async send(message: NotificationMessage): Promise<void> {
    const payload = this.buildPayload(message)
    await this.sendToSlack(payload)
  }

  /**
   * 发送部署通知
   */
  async sendDeployment(notification: DeploymentNotification): Promise<void> {
    const payload = this.buildDeploymentPayload(notification)
    await this.sendToSlack(payload)
  }

  /**
   * 构建 Slack 消息负载
   */
  private buildPayload(message: NotificationMessage): any {
    const color = this.getColor(message.level)
    
    return {
      channel: this.channel,
      username: this.username,
      icon_emoji: this.iconEmoji,
      attachments: [
        {
          color,
          title: message.title,
          text: message.message,
          fields: message.metadata ? Object.entries(message.metadata).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true
          })) : undefined,
          footer: 'LDesign Deployer',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    }
  }

  /**
   * 构建部署通知负载
   */
  private buildDeploymentPayload(notification: DeploymentNotification): any {
    const color = notification.success ? 'good' : 'danger'
    const emoji = notification.success ? ':white_check_mark:' : ':x:'
    const status = notification.success ? '成功' : '失败'
    
    return {
      channel: this.channel,
      username: this.username,
      icon_emoji: this.iconEmoji,
      text: `${emoji} 部署${status}`,
      attachments: [
        {
          color,
          fields: [
            {
              title: '应用名称',
              value: notification.appName,
              short: true
            },
            {
              title: '版本',
              value: notification.version,
              short: true
            },
            {
              title: '环境',
              value: notification.environment,
              short: true
            },
            {
              title: '耗时',
              value: `${(notification.duration / 1000).toFixed(2)}s`,
              short: true
            },
            ...(notification.details ? [{
              title: '详情',
              value: notification.details,
              short: false
            }] : [])
          ],
          footer: 'LDesign Deployer',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    }
  }

  /**
   * 发送到 Slack
   */
  private async sendToSlack(payload: any): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`)
      }

      logger.debug('[SlackNotifier] Message sent successfully')
    } catch (error: any) {
      logger.error('[SlackNotifier] Failed to send message:', error.message)
      throw error
    }
  }

  /**
   * 获取颜色
   */
  private getColor(level: string): string {
    const colors: Record<string, string> = {
      success: 'good',
      info: '#2196F3',
      warning: 'warning',
      error: 'danger'
    }
    return colors[level] || colors.info
  }
}
