/**
 * 配置 Diff 示例
 */

import { ConfigDiffer, ChangeAnalyzer } from '../src/preview/index.js';
import type { DeployConfig } from '../src/types/index.js';

async function diffExample() {
  console.log('=== 配置 Diff 示例 ===\n');

  // 模拟旧配置
  const oldConfig: DeployConfig = {
    name: 'my-app',
    version: '1.0.0',
    environment: 'production',
    platform: 'docker',
    projectType: 'node',
    docker: {
      image: 'my-app',
      tag: '1.0.0',
      registry: 'docker.io',
    },
    healthCheck: {
      enabled: true,
      path: '/health',
      port: 3000,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
  };

  // 模拟新配置
  const newConfig: DeployConfig = {
    name: 'my-app',
    version: '1.1.0',
    environment: 'production',
    platform: 'kubernetes', // 平台变更
    projectType: 'node',
    docker: {
      image: 'my-app',
      tag: '1.1.0', // 版本变更
      registry: 'docker.io',
    },
    kubernetes: {
      // 新增 K8s 配置
      namespace: 'production',
      deployment: {
        replicas: 3,
        resources: {
          requests: {
            cpu: '100m',
            memory: '128Mi',
          },
          limits: {
            cpu: '500m',
            memory: '512Mi',
          },
        },
      },
      service: {
        type: 'ClusterIP',
        port: 80,
        targetPort: 3000,
      },
    },
    healthCheck: {
      enabled: true,
      path: '/api/health', // 路径变更
      port: 3000,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
  };

  // 1. 对比配置
  const differ = new ConfigDiffer();
  const diffReport = differ.compare(oldConfig, newConfig);

  console.log('📋 差异报告:');
  console.log(differ.formatReport(diffReport));

  // 2. 分析影响
  console.log('\n📊 影响分析:');
  const analyzer = new ChangeAnalyzer();
  const analysis = analyzer.analyze(diffReport, oldConfig, newConfig);

  console.log(analyzer.formatReport(analysis));

  // 3. 获取高风险变更
  console.log('\n🚨 高风险变更:');
  const highRiskChanges = differ.getHighRiskChanges(diffReport);
  if (highRiskChanges.length > 0) {
    highRiskChanges.forEach(change => {
      console.log(`  - ${change.path}: ${change.description}`);
    });
  } else {
    console.log('  无高风险变更');
  }

  // 4. JSON 输出
  console.log('\n📄 JSON 格式差异:');
  console.log(differ.toJSON(diffReport));
}

// 运行示例
diffExample().catch(console.error);

