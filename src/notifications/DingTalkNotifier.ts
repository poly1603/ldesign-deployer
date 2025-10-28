/**
 * 钉钉通知器
 * @module notifications/DingTalkNotifier
 * 
 * @description 通过钉钉机器人 Webhook 发送通知
 */

import { BaseNotifier, NotificationMessage, DeploymentNotification } from './BaseNotifier.js'
import { logger } from '../utils/logger.js'
import { createHmac } from 'crypto'

/**
 * 钉钉通知器配置
 */
export interface DingTalkNotifierConfig {
  /** Webhook URL */
  webhookUrl: string
  /** 安全签名密钥（可选） */
  secret?: string
  /** @人的手机号列表（可选） */
  atMobiles?: string[]
  /** 是否@所有人（可选） */
  atAll?: boolean
  /** 是否启用 */
  enabled?: boolean
}

/**
 * 钉钉通知器类
 * 
 * @description 将通知发送到钉钉群聊
 * 
 * @example
 * ```typescript
 * const notifier = new DingTalkNotifier({
 *   webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=...',
 *   secret: 'SEC...',
 *   atMobiles: ['13800138000']
 * })
 * 
 * await notifier.send({
 *   title: '部署通知',
 *   message: '部署成功',
 *   level: 'success'
 * })
 * ```
 */
export class DingTalkNotifier extends BaseNotifier {
  private webhookUrl: string
  private secret?: string
  private atMobiles: string[]
  private atAll: boolean

  constructor(config: DingTalkNotifierConfig) {
    super()
    this.webhookUrl = config.webhookUrl
    this.secret = config.secret
    this.atMobiles = config.atMobiles || []
    this.atAll = config.atAll || false
    this.enabled = config.enabled !== false
  }

  getName(): string {
    return 'dingtalk'
  }

  /**
   * 发送通知
   */
  async send(message: NotificationMessage): Promise<void> {
    const payload = this.buildPayload(message)
    await this.sendToDingTalk(payload)
  }

  /**
   * 发送部署通知
   */
  async sendDeployment(notification: DeploymentNotification): Promise<void> {
    const payload = this.buildDeploymentPayload(notification)
    await this.sendToDingTalk(payload)
  }

  /**
   * 构建钉钉消息负载（Markdown 格式）
   */
  private buildPayload(message: NotificationMessage): any {
    const emoji = this.getEmoji(message.level)
    const title = `${emoji} ${message.title}`
    
    let text = `### ${title}\n\n${message.message}\n\n`
    
    if (message.metadata) {
      text += '---\n\n'
      for (const [key, value] of Object.entries(message.metadata)) {
        text += `**${key}:** ${value}\n\n`
      }
    }
    
    text += `> 来自 LDesign Deployer  \n> ${new Date().toLocaleString('zh-CN')}`
    
    return {
      msgtype: 'markdown',
      markdown: {
        title,
        text
      },
      at: {
        atMobiles: this.atMobiles,
        isAtAll: this.atAll
      }
    }
  }

  /**
   * 构建部署通知负载
   */
  private buildDeploymentPayload(notification: DeploymentNotification): any {
    const emoji = notification.success ? '✅' : '❌'
    const status = notification.success ? '成功' : '失败'
    const color = notification.success ? '🟢' : '🔴'
    const title = `${emoji} 部署${status}`
    
    let text = `### ${title}\n\n`
    text += `${color} **应用名称:** ${notification.appName}\n\n`
    text += `📦 **版本:** ${notification.version}\n\n`
    text += `🌍 **环境:** ${notification.environment}\n\n`
    text += `⏱️ **耗时:** ${(notification.duration / 1000).toFixed(2)}s\n\n`
    
    if (notification.details) {
      text += `📝 **详情:** ${notification.details}\n\n`
    }
    
    text += `---\n\n`
    text += `> 来自 LDesign Deployer  \n> ${new Date().toLocaleString('zh-CN')}`
    
    return {
      msgtype: 'markdown',
      markdown: {
        title,
        text
      },
      at: {
        atMobiles: notification.success ? [] : this.atMobiles, // 失败时@人
        isAtAll: !notification.success && this.atAll // 失败时@所有人
      }
    }
  }

  /**
   * 发送到钉钉
   */
  private async sendToDingTalk(payload: any): Promise<void> {
    try {
      let url = this.webhookUrl
      
      // 如果配置了密钥，添加签名
      if (this.secret) {
        const timestamp = Date.now()
        const sign = this.generateSign(timestamp)
        url += `&timestamp=${timestamp}&sign=${sign}`
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      
      if (result.errcode !== 0) {
        throw new Error(`DingTalk API error: ${result.errmsg}`)
      }

      logger.debug('[DingTalkNotifier] Message sent successfully')
    } catch (error: any) {
      logger.error('[DingTalkNotifier] Failed to send message:', error.message)
      throw error
    }
  }

  /**
   * 生成签名
   */
  private generateSign(timestamp: number): string {
    if (!this.secret) {
      return ''
    }
    
    const stringToSign = `${timestamp}\n${this.secret}`
    const hmac = createHmac('sha256', this.secret)
    hmac.update(stringToSign)
    const sign = encodeURIComponent(hmac.digest('base64'))
    
    return sign
  }

  /**
   * 获取表情符号
   */
  private getEmoji(level: string): string {
    const emojis: Record<string, string> = {
      success: '✅',
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌'
    }
    return emojis[level] || emojis.info
  }
}
