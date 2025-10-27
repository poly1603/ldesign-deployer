/**
 * 通知系统基础使用示例
 */

import {
  NotificationManager,
  ConsoleNotifier,
  WebhookNotifier,
} from '../src/notifications/index.js';

async function basicExample() {
  console.log('=== 基础通知示例 ===\n');

  // 1. 使用单个通知器
  const consoleNotifier = new ConsoleNotifier();

  await consoleNotifier.send({
    title: '测试通知',
    message: '这是一条测试消息',
    level: 'info',
  });

  // 2. 使用通知管理器
  const manager = new NotificationManager();

  // 添加多个通知器
  manager.addNotifier(new ConsoleNotifier());

  // 如果有 Webhook URL，可以添加 WebhookNotifier
  if (process.env.WEBHOOK_URL) {
    manager.addNotifier(new WebhookNotifier({
      url: process.env.WEBHOOK_URL,
      authToken: process.env.WEBHOOK_TOKEN,
    }));
  }

  // 发送不同级别的通知
  await manager.sendAll({
    title: '信息通知',
    message: '这是一条信息消息',
    level: 'info',
  });

  await manager.sendAll({
    title: '成功通知',
    message: '操作成功完成',
    level: 'success',
  });

  await manager.sendAll({
    title: '警告通知',
    message: '发现潜在问题',
    level: 'warning',
  });

  await manager.sendAll({
    title: '错误通知',
    message: '操作失败',
    level: 'error',
  });
}

// 运行示例
basicExample().catch(console.error);

