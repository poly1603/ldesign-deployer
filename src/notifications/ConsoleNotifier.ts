/**
 * 控制台通知器
 * @module notifications/ConsoleNotifier
 * 
 * @description 在控制台输出通知消息（用于开发和调试）
 */

import { BaseNotifier, NotificationMessage, NotifierConfig } from './BaseNotifier.js';
import chalk from 'chalk';

/**
 * 控制台通知器类
 * 
 * @description 在控制台以彩色格式输出通知消息
 * 
 * @example
 * ```typescript
 * const notifier = new ConsoleNotifier();
 * 
 * await notifier.send({
 *   title: '部署通知',
 *   message: '部署成功',
 *   level: 'success'
 * });
 * ```
 */
export class ConsoleNotifier extends BaseNotifier {
  /**
   * 创建控制台通知器
   * 
   * @param config - 通知器配置
   */
  constructor(config: NotifierConfig = {}) {
    super('Console', config);
  }

  /**
   * 发送通知
   * 
   * @param message - 通知消息
   * @returns Promise<void>
   */
  async send(message: NotificationMessage): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const icon = this.getLevelIcon(message.level);
    const color = this.getLevelColor(message.level);
    const timestamp = message.timestamp || new Date();

    console.log('\n' + '='.repeat(60));
    console.log(color(`${icon} ${message.title}`));
    console.log(chalk.gray(`[${timestamp.toLocaleString()}]`));
    console.log('='.repeat(60));
    console.log(message.message);

    if (message.metadata) {
      console.log('\n' + chalk.gray('Metadata:'));
      console.log(chalk.gray(JSON.stringify(message.metadata, null, 2)));
    }

    console.log('='.repeat(60) + '\n');
  }

  /**
   * 获取级别图标
   * 
   * @private
   * @param level - 通知级别
   * @returns 图标
   */
  private getLevelIcon(level: string): string {
    const icons: Record<string, string> = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    };
    return icons[level] || 'ℹ️';
  }

  /**
   * 获取级别颜色函数
   * 
   * @private
   * @param level - 通知级别
   * @returns Chalk 颜色函数
   */
  private getLevelColor(level: string): (text: string) => string {
    const colors: Record<string, (text: string) => string> = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
    };
    return colors[level] || chalk.white;
  }
}

