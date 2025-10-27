/**
 * 通知系统模块
 * @module notifications
 * 
 * @description 提供多渠道通知功能，支持 Webhook、控制台等方式
 */

export * from './BaseNotifier.js';
export * from './ConsoleNotifier.js';
export * from './WebhookNotifier.js';
export * from './NotificationManager.js';

// 便捷导出
export { BaseNotifier } from './BaseNotifier.js';
export { ConsoleNotifier } from './ConsoleNotifier.js';
export { WebhookNotifier } from './WebhookNotifier.js';
export { NotificationManager } from './NotificationManager.js';

