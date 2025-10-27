/**
 * Webhook 通知器
 * @module notifications/WebhookNotifier
 * 
 * @description 通过 HTTP Webhook 发送通知
 */

import { BaseNotifier, NotificationMessage, NotifierConfig } from './BaseNotifier.js';
import { logger } from '../utils/logger.js';

/**
 * Webhook 配置接口
 */
export interface WebhookConfig extends NotifierConfig {
  /** Webhook URL */
  url: string;
  /** HTTP 方法 */
  method?: 'POST' | 'PUT';
  /** 请求头 */
  headers?: Record<string, string>;
  /** 认证 Token */
  authToken?: string;
}

/**
 * Webhook 通知器类
 * 
 * @description 发送 HTTP Webhook 通知，支持自定义格式和认证
 * 
 * @example
 * ```typescript
 * const notifier = new WebhookNotifier({
 *   url: 'https://hooks.example.com/webhook',
 *   authToken: 'secret-token',
 *   headers: {
 *     'Content-Type': 'application/json'
 *   }
 * });
 * 
 * await notifier.send({
 *   title: '部署通知',
 *   message: '部署成功',
 *   level: 'success'
 * });
 * ```
 */
export class WebhookNotifier extends BaseNotifier {
  private webhookConfig: WebhookConfig;

  /**
   * 创建 Webhook 通知器
   * 
   * @param config - Webhook 配置
   */
  constructor(config: WebhookConfig) {
    super('Webhook', config);
    this.webhookConfig = config;
  }

  /**
   * 发送通知
   * 
   * @param message - 通知消息
   * @returns Promise<void>
   */
  async send(message: NotificationMessage): Promise<void> {
    if (!this.isEnabled()) {
      logger.debug('[WebhookNotifier] Disabled, skipping notification');
      return;
    }

    try {
      const payload = this.buildPayload(message);
      const headers = this.buildHeaders();

      const response = await fetch(this.webhookConfig.url, {
        method: this.webhookConfig.method || 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeout || 10000),
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
      }

      logger.debug('[WebhookNotifier] Notification sent successfully');
    } catch (error: any) {
      logger.error('[WebhookNotifier] Failed to send notification:', error.message);
      throw error;
    }
  }

  /**
   * 构建请求载荷
   * 
   * @private
   * @param message - 通知消息
   * @returns 请求载荷
   */
  private buildPayload(message: NotificationMessage): Record<string, any> {
    return {
      title: message.title,
      message: message.message,
      level: message.level,
      timestamp: message.timestamp || new Date(),
      metadata: message.metadata,
      tags: this.config.tags,
    };
  }

  /**
   * 构建请求头
   * 
   * @private
   * @returns 请求头
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'ldesign-deployer',
      ...this.webhookConfig.headers,
    };

    if (this.webhookConfig.authToken) {
      headers['Authorization'] = `Bearer ${this.webhookConfig.authToken}`;
    }

    return headers;
  }
}

