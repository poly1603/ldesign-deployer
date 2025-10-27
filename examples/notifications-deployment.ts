/**
 * 部署通知示例
 */

import {
  NotificationManager,
  ConsoleNotifier,
} from '../src/notifications/index.js';

async function deploymentNotificationExample() {
  console.log('=== 部署通知示例 ===\n');

  const manager = new NotificationManager();
  manager.addNotifier(new ConsoleNotifier());

  // 模拟部署开始
  await manager.sendAll({
    title: '🚀 开始部署',
    message: '开始部署应用到生产环境...',
    level: 'info',
    metadata: {
      appName: 'my-app',
      version: '1.0.0',
      environment: 'production',
    },
  });

  // 模拟部署过程
  console.log('\n正在部署...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 发送成功的部署通知
  await manager.sendDeployment({
    appName: 'my-app',
    version: '1.0.0',
    environment: 'production',
    success: true,
    duration: 45000,
    title: '部署成功',
    message: '应用已成功部署到生产环境',
    level: 'success',
  });

  console.log('\n--- 模拟失败场景 ---\n');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 发送失败的部署通知
  await manager.sendDeployment({
    appName: 'my-app',
    version: '1.0.1',
    environment: 'production',
    success: false,
    duration: 30000,
    error: 'Health check failed after deployment',
    title: '部署失败',
    message: '部署过程中发生错误',
    level: 'error',
  });
}

// 运行示例
deploymentNotificationExample().catch(console.error);

