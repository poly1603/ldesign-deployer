/**
 * 资源监控示例
 */

import { ResourceMonitor } from '../src/monitoring/ResourceMonitor.js';

async function monitoringExample() {
  console.log('=== 资源监控示例 ===\n');

  // 创建监控器
  const monitor = new ResourceMonitor({
    interval: 2000,        // 每 2 秒采样
    trackCpu: true,
    trackMemory: true,
    cpuThreshold: 70,      // CPU 70% 告警
    memoryThreshold: 80,   // 内存 80% 告警
  });

  // 监听快照事件
  monitor.on('snapshot', (snapshot) => {
    console.log(`📊 [${snapshot.timestamp.toLocaleTimeString()}]`);
    console.log(`   CPU: ${snapshot.cpuUsage.toFixed(2)}%`);
    console.log(`   内存: ${snapshot.memoryPercent.toFixed(2)}% (${formatBytes(snapshot.memoryUsage)})`);
  });

  // 监听告警事件
  monitor.on('alert', (alert) => {
    console.log(`\n⚠️  资源告警!`);
    console.log(`   类型: ${alert.type}`);
    console.log(`   当前值: ${alert.value.toFixed(2)}%`);
    console.log(`   阈值: ${alert.threshold}%`);
    console.log(`   消息: ${alert.message}\n`);
  });

  // 开始监控
  monitor.start();
  console.log('✅ 监控已启动，运行 10 秒...\n');

  // 模拟一些负载
  setTimeout(() => {
    // 创建一些内存压力
    const arr = new Array(1000000).fill('test');
    console.log('💪 创建了内存压力...\n');
  }, 3000);

  // 运行 10 秒后停止
  await new Promise(resolve => setTimeout(resolve, 10000));

  monitor.stop();
  console.log('\n🛑 监控已停止\n');

  // 显示统计信息
  const stats = monitor.getStatistics();
  console.log('📈 统计信息:');
  console.log(`   平均 CPU: ${stats.avgCpu.toFixed(2)}%`);
  console.log(`   最大 CPU: ${stats.maxCpu.toFixed(2)}%`);
  console.log(`   平均内存: ${stats.avgMemory.toFixed(2)}%`);
  console.log(`   最大内存: ${stats.maxMemory.toFixed(2)}%`);
  console.log(`   采样次数: ${stats.sampleCount}`);
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

// 运行示例
monitoringExample().catch(console.error);

