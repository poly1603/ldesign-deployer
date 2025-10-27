/**
 * 通知管理器
 * @module notifications/NotificationManager
 * 
 * @description 管理多个通知器，支持批量发送通知
 */

import { BaseNotifier, NotificationMessage, DeploymentNotification } from './BaseNotifier.js';
import { logger } from '../utils/logger.js';

/**
 * 通知管理器类
 * 
 * @description 管理多个通知器，可以同时向多个渠道发送通知
 * 
 * @example
 * ```typescript
 * const manager = new NotificationManager();
 * 
 * // 添加通知器
 * manager.addNotifier(new ConsoleNotifier());
 * manager.addNotifier(new WebhookNotifier({ url: '...' }));
 * 
 * // 发送通知
 * await manager.sendAll({
 *   title: '部署通知',
 *   message: '部署成功',
 *   level: 'success'
 * });
 * ```
 */
export class NotificationManager {
  private notifiers: Map<string, BaseNotifier> = new Map();

  /**
   * 添加通知器
   * 
   * @param notifier - 通知器实例
   * @returns 管理器实例（支持链式调用）
   * 
   * @example
   * ```typescript
   * manager
   *   .addNotifier(new ConsoleNotifier())
   *   .addNotifier(new WebhookNotifier({ url: '...' }));
   * ```
   */
  addNotifier(notifier: BaseNotifier): this {
    this.notifiers.set(notifier.getName(), notifier);
    logger.debug(`[NotificationManager] Added notifier: ${notifier.getName()}`);
    return this;
  }

  /**
   * 移除通知器
   * 
   * @param name - 通知器名称
   * @returns 是否成功移除
   */
  removeNotifier(name: string): boolean {
    const removed = this.notifiers.delete(name);
    if (removed) {
      logger.debug(`[NotificationManager] Removed notifier: ${name}`);
    }
    return removed;
  }

  /**
   * 获取通知器
   * 
   * @param name - 通知器名称
   * @returns 通知器实例或 undefined
   */
  getNotifier(name: string): BaseNotifier | undefined {
    return this.notifiers.get(name);
  }

  /**
   * 获取所有通知器
   * 
   * @returns 通知器数组
   */
  getAllNotifiers(): BaseNotifier[] {
    return Array.from(this.notifiers.values());
  }

  /**
   * 获取已启用的通知器
   * 
   * @returns 已启用的通知器数组
   */
  getEnabledNotifiers(): BaseNotifier[] {
    return this.getAllNotifiers().filter(n => n.isEnabled());
  }

  /**
   * 向所有已启用的通知器发送消息
   * 
   * @param message - 通知消息
   * @param options - 发送选项
   * @param options.parallel - 是否并行发送（默认 true）
   * @param options.continueOnError - 是否在发生错误时继续（默认 true）
   * @returns Promise<void>
   */
  async sendAll(
    message: NotificationMessage,
    options: { parallel?: boolean; continueOnError?: boolean } = {}
  ): Promise<void> {
    const { parallel = true, continueOnError = true } = options;
    const enabledNotifiers = this.getEnabledNotifiers();

    if (enabledNotifiers.length === 0) {
      logger.debug('[NotificationManager] No enabled notifiers');
      return;
    }

    logger.debug(`[NotificationManager] Sending to ${enabledNotifiers.length} notifiers`);

    if (parallel) {
      // 并行发送
      const promises = enabledNotifiers.map(notifier =>
        this.sendToNotifier(notifier, message, continueOnError)
      );
      await Promise.all(promises);
    } else {
      // 串行发送
      for (const notifier of enabledNotifiers) {
        await this.sendToNotifier(notifier, message, continueOnError);
      }
    }
  }

  /**
   * 发送部署通知
   * 
   * @param notification - 部署通知信息
   * @param options - 发送选项
   * @returns Promise<void>
   */
  async sendDeployment(
    notification: DeploymentNotification,
    options?: { parallel?: boolean; continueOnError?: boolean }
  ): Promise<void> {
    const enabledNotifiers = this.getEnabledNotifiers();

    const promises = enabledNotifiers.map(notifier =>
      this.sendDeploymentToNotifier(notifier, notification, options?.continueOnError ?? true)
    );

    if (options?.parallel !== false) {
      await Promise.all(promises);
    } else {
      for (const promise of promises) {
        await promise;
      }
    }
  }

  /**
   * 向单个通知器发送消息
   * 
   * @private
   * @param notifier - 通知器实例
   * @param message - 通知消息
   * @param continueOnError - 是否在错误时继续
   * @returns Promise<void>
   */
  private async sendToNotifier(
    notifier: BaseNotifier,
    message: NotificationMessage,
    continueOnError: boolean
  ): Promise<void> {
    try {
      await notifier.send(message);
      logger.debug(`[NotificationManager] Sent to ${notifier.getName()}`);
    } catch (error: any) {
      logger.error(`[NotificationManager] Failed to send to ${notifier.getName()}:`, error.message);
      if (!continueOnError) {
        throw error;
      }
    }
  }

  /**
   * 向单个通知器发送部署通知
   * 
   * @private
   * @param notifier - 通知器实例
   * @param notification - 部署通知信息
   * @param continueOnError - 是否在错误时继续
   * @returns Promise<void>
   */
  private async sendDeploymentToNotifier(
    notifier: BaseNotifier,
    notification: DeploymentNotification,
    continueOnError: boolean
  ): Promise<void> {
    try {
      await notifier.sendDeployment(notification);
      logger.debug(`[NotificationManager] Sent deployment to ${notifier.getName()}`);
    } catch (error: any) {
      logger.error(
        `[NotificationManager] Failed to send deployment to ${notifier.getName()}:`,
        error.message
      );
      if (!continueOnError) {
        throw error;
      }
    }
  }

  /**
   * 清空所有通知器
   */
  clear(): void {
    this.notifiers.clear();
    logger.debug('[NotificationManager] Cleared all notifiers');
  }

  /**
   * 获取通知器数量
   * 
   * @returns 通知器数量
   */
  count(): number {
    return this.notifiers.size;
  }
}

