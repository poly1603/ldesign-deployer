/**
 * 企业微信通知器
 * @module notifications/WeChatWorkNotifier
 * 
 * @description 通过企业微信机器人 Webhook 发送部署通知
 */

import { BaseNotifier, NotificationMessage, DeploymentNotification } from './BaseNotifier.js'

/**
 * 企业微信通知器配置
 */
export interface WeChatWorkNotifierOptions {
  /** Webhook URL */
  webhookUrl: string
  /** 需要 @ 的用户 ID 列表 */
  mentionedList?: string[]
  /** 需要 @ 的手机号列表 */
  mentionedMobileList?: string[]
  /** 是否 @ 所有人 */
  mentionAll?: boolean
  /** 消息类型 */
  msgType?: 'text' | 'markdown'
}

/**
 * 企业微信消息体
 */
interface WeChatWorkMessage {
  msgtype: 'text' | 'markdown'
  text?: {
    content: string
    mentioned_list?: string[]
    mentioned_mobile_list?: string[]
  }
  markdown?: {
    content: string
  }
}

/**
 * 企业微信通知器
 * 
 * @description 支持文本和 Markdown 格式的消息
 * 
 * @example
 * ```typescript
 * const notifier = new WeChatWorkNotifier({
 *   webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
 *   mentionAll: true,
 *   msgType: 'markdown'
 * });
 * 
 * await notifier.send({
 *   title: '部署通知',
 *   message: '生产环境部署成功'
 * });
 * ```
 */
export class WeChatWorkNotifier extends BaseNotifier {
  private webhookUrl: string
  private mentionedList: string[]
  private mentionedMobileList: string[]
  private mentionAll: boolean
  private msgType: 'text' | 'markdown'

  constructor(options: WeChatWorkNotifierOptions) {
    super('wechat-work')
    this.webhookUrl = options.webhookUrl
    this.mentionedList = options.mentionedList || []
    this.mentionedMobileList = options.mentionedMobileList || []
    this.mentionAll = options.mentionAll || false
    this.msgType = options.msgType || 'markdown'
  }

  /**
   * 发送通知
   */
  async send(message: NotificationMessage): Promise<void> {
    try {
      const wechatMessage = this.buildMessage(message)

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wechatMessage),
      })

      const result = await response.json() as { errcode: number; errmsg: string }

      if (result.errcode !== 0) {
        throw new Error(`WeChat Work API error: ${result.errmsg}`)
      }
    } catch (error: any) {
      throw new Error(`WeChat Work notification failed: ${error.message}`)
    }
  }

  /**
   * 发送部署通知（覆盖基类方法以支持更丰富的格式）
   */
  async sendDeployment(notification: DeploymentNotification): Promise<void> {
    const statusEmoji = notification.success ? '✅' : '❌'
    const statusText = notification.success ? '成功' : '失败'

    if (this.msgType === 'markdown') {
      const content = this.buildDeploymentMarkdown(notification, statusEmoji, statusText)
      const wechatMessage: WeChatWorkMessage = {
        msgtype: 'markdown',
        markdown: { content },
      }

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wechatMessage),
      })

      const result = await response.json() as { errcode: number; errmsg: string }
      if (result.errcode !== 0) {
        throw new Error(`WeChat Work API error: ${result.errmsg}`)
      }
      return
    }

    // 使用父类的方法发送文本格式
    await super.sendDeployment(notification)
  }

  /**
   * 构建消息体
   */
  private buildMessage(message: NotificationMessage): WeChatWorkMessage {
    if (this.msgType === 'markdown') {
      return {
        msgtype: 'markdown',
        markdown: {
          content: this.formatMarkdown(message),
        },
      }
    }

    const mentionedList = [...this.mentionedList]
    if (this.mentionAll) {
      mentionedList.push('@all')
    }

    return {
      msgtype: 'text',
      text: {
        content: this.formatText(message),
        mentioned_list: mentionedList.length > 0 ? mentionedList : undefined,
        mentioned_mobile_list: this.mentionedMobileList.length > 0
          ? this.mentionedMobileList
          : undefined,
      },
    }
  }

  /**
   * 格式化文本消息
   */
  private formatText(message: NotificationMessage): string {
    const parts: string[] = []

    if (message.title) {
      parts.push(message.title)
    }

    parts.push(message.message)

    if (message.timestamp) {
      parts.push(`时间: ${message.timestamp.toLocaleString('zh-CN')}`)
    }

    return parts.join('\n')
  }

  /**
   * 格式化 Markdown 消息
   */
  private formatMarkdown(message: NotificationMessage): string {
    const parts: string[] = []

    if (message.title) {
      // 根据类型添加颜色标记
      const color = this.getTypeColor(message.level)
      parts.push(`### <font color="${color}">${message.title}</font>`)
    }

    parts.push(message.message)

    if (message.timestamp) {
      parts.push(`> 时间: ${message.timestamp.toLocaleString('zh-CN')}`)
    }

    // @ 用户
    if (this.mentionAll) {
      parts.push('<@all>')
    } else if (this.mentionedList.length > 0) {
      parts.push(this.mentionedList.map(u => `<@${u}>`).join(' '))
    }

    return parts.join('\n')
  }

  /**
   * 构建部署 Markdown 消息
   */
  private buildDeploymentMarkdown(
    notification: DeploymentNotification,
    statusEmoji: string,
    statusText: string
  ): string {
    const lines: string[] = [
      `### ${statusEmoji} 部署${statusText}`,
      '',
      `**应用**: ${notification.appName}`,
      `**版本**: ${notification.version}`,
      `**环境**: <font color="${this.getEnvironmentColor(notification.environment)}">${notification.environment}</font>`,
    ]

    if (notification.duration) {
      lines.push(`**耗时**: ${(notification.duration / 1000).toFixed(2)}s`)
    }

    if (notification.error) {
      lines.push(`**错误**: ${notification.error}`)
    }

    lines.push('', `> ${new Date().toLocaleString('zh-CN')}`)

    // @ 用户
    if (this.mentionAll) {
      lines.push('<@all>')
    } else if (this.mentionedList.length > 0) {
      lines.push(this.mentionedList.map(u => `<@${u}>`).join(' '))
    }

    return lines.join('\n')
  }

  /**
   * 获取消息类型颜色
   */
  private getTypeColor(level?: string): string {
    switch (level) {
      case 'success':
        return 'info'
      case 'error':
        return 'warning'
      case 'warning':
        return 'comment'
      default:
        return 'info'
    }
  }

  /**
   * 获取环境颜色
   */
  private getEnvironmentColor(environment: string): string {
    switch (environment) {
      case 'production':
        return 'warning'
      case 'staging':
        return 'comment'
      default:
        return 'info'
    }
  }
}
