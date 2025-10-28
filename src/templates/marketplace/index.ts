/**
 * 模板市场
 * @module templates/marketplace
 * 
 * @description 预定义的部署配置模板集合
 */

import { TemplateRegistry } from '../TemplateRegistry.js';
import { expressTemplates } from './express.js';
import { nextjsTemplates } from './nextjs.js';
import { vueTemplates } from './vue.js';
import { nestjsTemplates } from './nestjs.js';
import { reactTemplates } from './react.js';

/**
 * 初始化模板市场
 * 
 * @description 注册所有预定义的模板到注册表
 * 
 * @example
 * ```typescript
 * import { initializeMarketplace } from '@ldesign/deployer';
 * 
 * initializeMarketplace();
 * 
 * const registry = TemplateRegistry.getInstance();
 * const templates = registry.getAllTemplates();
 * ```
 */
export function initializeMarketplace(): void {
  const registry = TemplateRegistry.getInstance();

  // 注册 Express 模板
  expressTemplates.forEach(template => registry.register(template));

  // 注册 Next.js 模板
  nextjsTemplates.forEach(template => registry.register(template));

  // 注册 Vue 模板
  vueTemplates.forEach(template => registry.register(template));

  // 注册 NestJS 模板
  nestjsTemplates.forEach(template => registry.register(template));

  // 注册 React 模板
  reactTemplates.forEach(template => registry.register(template));
}

// 导出所有模板
export * from './express.js';
export * from './nextjs.js';
export * from './vue.js';
export * from './nestjs.js';
export * from './react.js';

// 导出模板列表
export const allMarketplaceTemplates = [
  ...expressTemplates,
  ...nextjsTemplates,
  ...vueTemplates,
  ...nestjsTemplates,
  ...reactTemplates,
];

