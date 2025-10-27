/**
 * @ldesign/deployer 主入口
 * 部署工具 - Docker/K8s 部署、CI/CD 模板、蓝绿/金丝雀发布、回滚机制
 */

// 核心模块
export * from './core/index.js'

// Docker 模块
export * from './docker/index.js'

// Kubernetes 模块
export * from './kubernetes/index.js'

// 策略模块
export * from './strategies/index.js'

// 回滚模块
export * from './rollback/index.js'

// CI/CD 模块
export * from './cicd/index.js'

// 监控模块
export * from './monitoring/index.js'

// 扩缩容模块
export * from './scaling/index.js'

// 报告模块
export * from './reports/index.js'

// 安全模块
export * from './security/index.js'

// 可视化模块
export * from './visualization/index.js'

// 分析器模块
export * from './analyzer/index.js'

// 通知模块
export * from './notifications/index.js'

// 模板系统
export * from './templates/index.js'

// 配置预览
export * from './preview/index.js'

// 类型定义
export * from './types/index.js'

// 工具函数
export { logger, createLogger } from './utils/logger.js'
export { validateDeployConfig, isValidVersion } from './utils/validator.js'

// 便捷导出
import { Deployer } from './core/Deployer.js'
import { EnhancedDeployer } from './core/EnhancedDeployer.js'
import type { DeployConfig } from './types/index.js'

/**
 * 创建部署器实例
 */
export function createDeployer(options?: { workDir?: string }): Deployer {
  return new Deployer(options)
}

/**
 * 创建增强版部署器实例（推荐）
 */
export function createEnhancedDeployer(options?: { workDir?: string }): EnhancedDeployer {
  return new EnhancedDeployer(options)
}

/**
 * 快速部署
 */
export async function deploy(config: DeployConfig) {
  const deployer = createDeployer()
  return deployer.deploy({ config })
}

// 默认导出
export default {
  Deployer,
  EnhancedDeployer,
  createDeployer,
  createEnhancedDeployer,
  deploy,
}

