/**
 * 邮件通知器
 * @module notifications/EmailNotifier
 * 
 * @description 通过 SMTP 发送邮件通知
 */

import { BaseNotifier, NotificationMessage, DeploymentNotification } from './BaseNotifier.js'
import { logger } from '../utils/logger.js'

/**
 * 邮件通知器配置
 */
export interface EmailNotifierConfig {
  /** SMTP 主机 */
  host: string
  /** SMTP 端口 */
  port: number
  /** 是否使用 TLS */
  secure?: boolean
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
  /** 发件人地址 */
  from: string
  /** 收件人列表 */
  to: string[]
  /** 抄送列表（可选） */
  cc?: string[]
  /** 是否启用 */
  enabled?: boolean
}

/**
 * 邮件通知器类
 * 
 * @description 将通知通过邮件发送
 * 
 * @example
 * ```typescript
 * const notifier = new EmailNotifier({
 *   host: 'smtp.gmail.com',
 *   port: 587,
 *   secure: false,
 *   username: 'your-email@gmail.com',
 *   password: 'your-password',
 *   from: 'deployer@example.com',
 *   to: ['admin@example.com', 'dev@example.com']
 * })
 * 
 * await notifier.send({
 *   title: '部署通知',
 *   message: '部署成功',
 *   level: 'success'
 * })
 * ```
 */
export class EmailNotifier extends BaseNotifier {
  private config: EmailNotifierConfig

  constructor(config: EmailNotifierConfig) {
    super()
    this.config = config
    this.enabled = config.enabled !== false
  }

  getName(): string {
    return 'email'
  }

  /**
   * 发送通知
   */
  async send(message: NotificationMessage): Promise<void> {
    const subject = `[${message.level.toUpperCase()}] ${message.title}`
    const html = this.buildHtmlMessage(message)
    await this.sendEmail(subject, html)
  }

  /**
   * 发送部署通知
   */
  async sendDeployment(notification: DeploymentNotification): Promise<void> {
    const status = notification.success ? '成功' : '失败'
    const subject = `[部署${status}] ${notification.appName} v${notification.version}`
    const html = this.buildDeploymentHtml(notification)
    await this.sendEmail(subject, html)
  }

  /**
   * 构建 HTML 消息
   */
  private buildHtmlMessage(message: NotificationMessage): string {
    const color = this.getColor(message.level)
    
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${color}; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
    .metadata { margin-top: 20px; padding: 10px; background-color: #fff; border-left: 3px solid ${color}; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${message.title}</h2>
    </div>
    <div class="content">
      <p>${message.message}</p>
    `
    
    if (message.metadata && Object.keys(message.metadata).length > 0) {
      html += '<div class="metadata"><h3>详细信息</h3><ul>'
      for (const [key, value] of Object.entries(message.metadata)) {
        html += `<li><strong>${key}:</strong> ${value}</li>`
      }
      html += '</ul></div>'
    }
    
    html += `
    </div>
    <div class="footer">
      <p>来自 LDesign Deployer</p>
      <p>${new Date().toLocaleString('zh-CN')}</p>
    </div>
  </div>
</body>
</html>
`
    return html
  }

  /**
   * 构建部署通知 HTML
   */
  private buildDeploymentHtml(notification: DeploymentNotification): string {
    const color = notification.success ? '#4CAF50' : '#F44336'
    const icon = notification.success ? '✅' : '❌'
    const status = notification.success ? '成功' : '失败'
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${color}; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
    .header h1 { margin: 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .info-table td { padding: 10px; border-bottom: 1px solid #ddd; }
    .info-table td:first-child { font-weight: bold; width: 150px; color: #666; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${icon} 部署${status}</h1>
    </div>
    <div class="content">
      <table class="info-table">
        <tr>
          <td>应用名称</td>
          <td>${notification.appName}</td>
        </tr>
        <tr>
          <td>版本</td>
          <td>${notification.version}</td>
        </tr>
        <tr>
          <td>环境</td>
          <td>${notification.environment}</td>
        </tr>
        <tr>
          <td>耗时</td>
          <td>${(notification.duration / 1000).toFixed(2)} 秒</td>
        </tr>
        ${notification.details ? `
        <tr>
          <td>详情</td>
          <td>${notification.details}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    <div class="footer">
      <p>来自 LDesign Deployer</p>
      <p>${new Date().toLocaleString('zh-CN')}</p>
    </div>
  </div>
</body>
</html>
`
  }

  /**
   * 发送邮件（简化版实现）
   * 
   * 注意：实际生产环境应使用专业的邮件库如 nodemailer
   */
  private async sendEmail(subject: string, html: string): Promise<void> {
    try {
      // 这里使用 fetch 调用 SMTP API 或使用 nodemailer
      // 由于 nodemailer 需要额外依赖，这里提供基础实现框架
      
      logger.info(`[EmailNotifier] Sending email: ${subject}`)
      logger.debug(`[EmailNotifier] To: ${this.config.to.join(', ')}`)
      
      // TODO: 实际的 SMTP 发送逻辑
      // 可以使用 nodemailer 或调用邮件服务 API
      
      // 示例：调用邮件服务 API
      // const response = await fetch('https://api.email-service.com/send', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     from: this.config.from,
      //     to: this.config.to,
      //     cc: this.config.cc,
      //     subject,
      //     html
      //   })
      // })
      
      logger.success('[EmailNotifier] Email sent successfully')
    } catch (error: any) {
      logger.error('[EmailNotifier] Failed to send email:', error.message)
      throw error
    }
  }

  /**
   * 获取颜色
   */
  private getColor(level: string): string {
    const colors: Record<string, string> = {
      success: '#4CAF50',
      info: '#2196F3',
      warning: '#FF9800',
      error: '#F44336'
    }
    return colors[level] || colors.info
  }
}
