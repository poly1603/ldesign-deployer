/**
 * 基础通知器
 * @module notifications/BaseNotifier
 * 
 * @description 所有通知器的基类，定义统一的通知接口
 */

/**
 * 通知级别
 */
export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

/**
 * 通知消息接口
 */
export interface NotificationMessage {
  /** 消息标题 */
  title: string;
  /** 消息内容 */
  message: string;
  /** 通知级别 */
  level: NotificationLevel;
  /** 附加数据 */
  metadata?: Record<string, any>;
  /** 时间戳 */
  timestamp?: Date;
}

/**
 * 部署通知接口
 */
export interface DeploymentNotification extends NotificationMessage {
  /** 应用名称 */
  appName: string;
  /** 版本号 */
  version: string;
  /** 环境 */
  environment: string;
  /** 部署结果 */
  success: boolean;
  /** 部署时长（毫秒） */
  duration?: number;
  /** 错误信息（如果失败） */
  error?: string;
}

/**
 * 通知器配置接口
 */
export interface NotifierConfig {
  /** 是否启用 */
  enabled?: boolean;
  /** 自定义标签 */
  tags?: string[];
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 基础通知器抽象类
 * 
 * @description 定义通知器的基本接口和通用功能
 * 
 * @example
 * ```typescript
 * class MyNotifier extends BaseNotifier {
 *   async send(message: NotificationMessage): Promise<void> {
 *     // 实现发送逻辑
 *   }
 * }
 * ```
 */
export abstract class BaseNotifier {
  protected config: NotifierConfig;
  protected name: string;

  /**
   * 创建通知器实例
   * 
   * @param name - 通知器名称
   * @param config - 通知器配置
   */
  constructor(name: string, config: NotifierConfig = {}) {
    this.name = name;
    this.config = {
      enabled: true,
      timeout: 10000,
      ...config,
    };
  }

  /**
   * 发送通知
   * 
   * @param message - 通知消息
   * @returns Promise<void>
   * 
   * @description 子类必须实现此方法
   */
  abstract send(message: NotificationMessage): Promise<void>;

  /**
   * 发送部署通知
   * 
   * @param notification - 部署通知信息
   * @returns Promise<void>
   */
  async sendDeployment(notification: DeploymentNotification): Promise<void> {
    const message: NotificationMessage = {
      title: notification.success
        ? `✅ 部署成功 - ${notification.appName}`
        : `❌ 部署失败 - ${notification.appName}`,
      message: this.formatDeploymentMessage(notification),
      level: notification.success ? 'success' : 'error',
      metadata: notification,
      timestamp: new Date(),
    };

    return this.send(message);
  }

  /**
   * 格式化部署消息
   * 
   * @protected
   * @param notification - 部署通知信息
   * @returns 格式化后的消息
   */
  protected formatDeploymentMessage(notification: DeploymentNotification): string {
    const lines: string[] = [
      `应用: ${notification.appName}`,
      `版本: ${notification.version}`,
      `环境: ${notification.environment}`,
      `状态: ${notification.success ? '成功' : '失败'}`,
    ];

    if (notification.duration) {
      lines.push(`耗时: ${(notification.duration / 1000).toFixed(2)}s`);
    }

    if (!notification.success && notification.error) {
      lines.push(`错误: ${notification.error}`);
    }

    return lines.join('\n');
  }

  /**
   * 检查是否启用
   * 
   * @returns 是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled === true;
  }

  /**
   * 获取通知器名称
   * 
   * @returns 通知器名称
   */
  getName(): string {
    return this.name;
  }
}

