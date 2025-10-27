/**
 * 模板系统基础使用示例
 */

import { TemplateRegistry, initializeMarketplace } from '../src/templates/index.js';
import { writeFile } from 'fs/promises';

async function basicExample() {
  console.log('=== 模板系统基础示例 ===\n');

  // 1. 初始化模板市场
  initializeMarketplace();
  const registry = TemplateRegistry.getInstance();

  // 2. 查看所有可用模板
  console.log('📚 可用模板:');
  const templates = registry.getAllTemplates();
  templates.forEach((t, i) => {
    const emoji = t.difficulty === 'beginner' ? '🟢' : t.difficulty === 'intermediate' ? '🟡' : '🔴';
    console.log(`${i + 1}. ${t.name} ${emoji}`);
    console.log(`   ID: ${t.id}`);
    console.log(`   类型: ${t.projectType} | 平台: ${t.platform}`);
    console.log(`   标签: ${t.tags.join(', ')}\n`);
  });

  // 3. 按条件搜索模板
  console.log('\n🔍 搜索 Express 模板:');
  const expressTemplates = registry.searchByTag('express');
  expressTemplates.forEach(t => console.log(`  - ${t.name}`));

  console.log('\n🔍 搜索 Kubernetes 模板:');
  const k8sTemplates = registry.searchByPlatform('kubernetes');
  k8sTemplates.forEach(t => console.log(`  - ${t.name}`));

  // 4. 使用模板生成配置
  console.log('\n⚙️  使用 express-basic 模板:');
  const config = registry.useTemplate('express-basic', {
    name: 'my-api',
    version: '1.0.0',
    port: 3000,
    environment: 'production'
  });

  console.log('生成的配置:');
  console.log(JSON.stringify(config, null, 2));

  // 5. 保存配置到文件
  await writeFile(
    'deploy.config.example.json',
    JSON.stringify(config, null, 2)
  );
  console.log('\n✅ 配置已保存到 deploy.config.example.json');
}

// 运行示例
basicExample().catch(console.error);

