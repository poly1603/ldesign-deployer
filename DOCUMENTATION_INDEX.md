# 📚 Deployer 文档索引

> 快速查找所有文档和资源

## 🚀 快速导航

### 我是新用户，从哪里开始？

1. 📖 [README.md](./README.md) - **从这里开始**
2. 🎯 [快速开始指南](#快速开始)
3. 📋 [功能清单](./FEATURES.md)
4. 💡 [示例代码](#示例代码)

### 我想了解新功能？

1. 🔔 [通知系统](./src/notifications/README.md)
2. 📋 [配置模板](./src/templates/README.md)
3. 🔍 [配置预览](./src/preview/README.md)
4. 📊 [资源监控](#资源监控)

### 我想了解优化详情？

1. 🎉 [优化完成报告](./🎉_OPTIMIZATION_COMPLETE.md)
2. 📊 [完整优化报告](./COMPLETE_OPTIMIZATION_REPORT.md)
3. 📈 [优化进度](./CODE_OPTIMIZATION_PROGRESS.md)

## 📖 核心文档

### 主要文档

| 文档 | 描述 | 推荐指数 |
|------|------|----------|
| [README.md](./README.md) | 项目主文档，包含安装、快速开始、API 等 | ⭐⭐⭐⭐⭐ |
| [FEATURES.md](./FEATURES.md) | 完整功能清单和对比 | ⭐⭐⭐⭐⭐ |
| [CHANGELOG.md](./CHANGELOG.md) | 版本变更历史 | ⭐⭐⭐⭐☆ |
| [QUICK_START.md](./QUICK_START.md) | 快速开始指南 | ⭐⭐⭐⭐⭐ |

### 优化报告

| 文档 | 描述 | 适合人群 |
|------|------|----------|
| [🎉_OPTIMIZATION_COMPLETE.md](./🎉_OPTIMIZATION_COMPLETE.md) | 优化工作完成总结 | 所有人 |
| [COMPLETE_OPTIMIZATION_REPORT.md](./COMPLETE_OPTIMIZATION_REPORT.md) | 完整优化报告（英文） | 开发者 |
| [优化完成报告.md](./优化完成报告.md) | 优化报告（中文） | 中文用户 |
| [CODE_OPTIMIZATION_PROGRESS.md](./CODE_OPTIMIZATION_PROGRESS.md) | 优化进度追踪 | 维护者 |
| [PHASE1_COMPLETE.md](./PHASE1_COMPLETE.md) | 阶段1完成详情 | 开发者 |

## 🔧 功能文档

### 新增功能（v0.3.0）

| 功能 | 文档 | 示例 |
|------|------|------|
| 通知系统 | [src/notifications/README.md](./src/notifications/README.md) | [notifications-basic.ts](./examples/notifications-basic.ts) |
| 配置模板 | [src/templates/README.md](./src/templates/README.md) | [template-basic.ts](./examples/template-basic.ts) |
| 配置预览 | [src/preview/README.md](./src/preview/README.md) | [preview-diff.ts](./examples/preview-diff.ts) |
| 资源监控 | - | [resource-monitoring.ts](./examples/resource-monitoring.ts) |

## 💻 示例代码

### 基础示例

| 示例 | 功能 | 难度 |
|------|------|------|
| [simple-deploy.ts](./examples/simple-deploy.ts) | 简单部署 | 🟢 初级 |
| [enhanced-deploy.ts](./examples/enhanced-deploy.ts) | 增强部署 | 🟡 中级 |

### 部署策略

| 示例 | 功能 | 难度 |
|------|------|------|
| [blue-green-deploy.ts](./examples/blue-green-deploy.ts) | 蓝绿部署 | 🟡 中级 |
| [canary-deploy.ts](./examples/canary-deploy.ts) | 金丝雀发布 | 🟡 中级 |

### 高级功能

| 示例 | 功能 | 难度 |
|------|------|------|
| [auto-rollback.ts](./examples/auto-rollback.ts) | 自动回滚 | 🟠 高级 |
| [progress-monitoring.ts](./examples/progress-monitoring.ts) | 进度监控 | 🟢 初级 |
| [audit-log-query.ts](./examples/audit-log-query.ts) | 审计查询 | 🟢 初级 |

### 新功能示例

| 示例 | 功能 | 难度 |
|------|------|------|
| [notifications-basic.ts](./examples/notifications-basic.ts) | 基础通知 | 🟢 初级 |
| [notifications-deployment.ts](./examples/notifications-deployment.ts) | 部署通知 | 🟢 初级 |
| [template-basic.ts](./examples/template-basic.ts) | 模板使用 | 🟢 初级 |
| [preview-diff.ts](./examples/preview-diff.ts) | 配置对比 | 🟡 中级 |
| [resource-monitoring.ts](./examples/resource-monitoring.ts) | 资源监控 | 🟡 中级 |

**总计: 12 个示例**

## 🎯 按使用场景导航

### 场景 1: 我想快速开始部署

1. 查看 [README.md](./README.md#快速开始)
2. 使用模板: [模板文档](./src/templates/README.md)
3. 运行: `ldesign-deployer template:use express-basic --name my-app`

### 场景 2: 我想了解如何配置通知

1. 查看 [通知系统文档](./src/notifications/README.md)
2. 查看示例: [notifications-deployment.ts](./examples/notifications-deployment.ts)
3. 集成到部署流程

### 场景 3: 我想分析配置变更的影响

1. 查看 [配置预览文档](./src/preview/README.md)
2. 查看示例: [preview-diff.ts](./examples/preview-diff.ts)
3. 运行: `ldesign-deployer preview:analyze old.json new.json`

### 场景 4: 我想监控部署资源使用

1. 查看示例: [resource-monitoring.ts](./examples/resource-monitoring.ts)
2. 集成 ResourceMonitor 到部署流程
3. 配置告警阈值

### 场景 5: 我想贡献代码

1. 查看 [优化报告](./COMPLETE_OPTIMIZATION_REPORT.md)
2. 了解架构设计
3. 查找标记为 @todo 的功能

## 🔍 按主题查找

### 部署相关

- [部署引擎](./README.md#编程-api)
- [Docker 部署](./README.md#docker-命令)
- [Kubernetes 部署](./README.md#kubernetes-命令)
- [部署策略](./README.md#使用示例)

### 配置相关

- [配置管理](./README.md#配置示例)
- [配置模板](./src/templates/README.md)
- [配置验证](./README.md#配置示例)
- [配置预览](./src/preview/README.md)

### 监控相关

- [健康检查](./README.md#配置示例)
- [进度追踪](./examples/progress-monitoring.ts)
- [审计日志](./examples/audit-log-query.ts)
- [资源监控](./examples/resource-monitoring.ts)

### 通知相关

- [通知系统](./src/notifications/README.md)
- [Webhook 通知](./src/notifications/README.md#webhooknotifier)
- [部署通知](./examples/notifications-deployment.ts)

### 性能相关

- [性能优化](./COMPLETE_OPTIMIZATION_REPORT.md#性能优化工具)
- [批量操作](./src/utils/file-batch.ts)
- [性能监控](./src/utils/performance.ts)

## 📋 CLI 命令索引

### 所有命令分类

#### 基础命令（6个）
- `init` - 初始化配置
- `deploy` - 执行部署
- `rollback` - 回滚版本
- `history` - 查看历史
- `status` - 查看状态
- `doctor` - 健康诊断

#### 模板命令（2个）✨
- `templates` - 列出模板
- `template:use` - 使用模板

#### 预览命令（2个）✨
- `preview:diff` - 配置对比
- `preview:analyze` - 影响分析

#### Docker 命令（2个）
- `docker:dockerfile` - 生成 Dockerfile
- `docker:compose` - 生成 Compose

#### K8s 命令（2个）
- `k8s:manifests` - 生成清单
- `k8s:helm` - 生成 Helm Chart

#### CI/CD 命令（3个）
- `cicd:github` - GitHub Actions
- `cicd:gitlab` - GitLab CI
- `cicd:jenkins` - Jenkins

#### 版本命令（2个）
- `version:bump` - 递增版本
- `version:tag` - 创建 Tag

#### 管理命令（6个）
- `lock:status` - 锁状态
- `lock:release` - 释放锁
- `audit:stats` - 审计统计
- `audit:query` - 审计查询
- `cache:clear` - 清空缓存
- `cache:stats` - 缓存统计

**总计: 27 个命令**

详细命令说明见 [README.md](./README.md#cli-命令)

## 🎓 学习路径

### 初学者路径

1. 📖 阅读 [README.md](./README.md)
2. 🏃 跟随 [快速开始](./README.md#快速开始)
3. 📋 使用模板创建配置
4. 🚀 执行第一次部署
5. 💡 查看示例代码

### 进阶路径

1. 🔔 配置通知系统
2. 🔍 使用配置预览
3. 📊 启用资源监控
4. 🎯 理解部署策略
5. 📈 优化部署流程

### 高级路径

1. 🛠️ 自定义模板
2. 🔌 开发通知插件
3. ⚙️ 扩展部署策略
4. 📦 贡献代码

## 💡 最佳实践

### 推荐阅读顺序

1. [README.md](./README.md) - 了解基础
2. [FEATURES.md](./FEATURES.md) - 了解功能
3. [模板文档](./src/templates/README.md) - 快速开始
4. [通知文档](./src/notifications/README.md) - 增强体验
5. [预览文档](./src/preview/README.md) - 降低风险

### 常用文档快捷方式

- **快速开始**: [README.md#快速开始](./README.md#快速开始)
- **CLI 命令**: [README.md#CLI-命令](./README.md#CLI-命令)
- **配置示例**: [README.md#配置示例](./README.md#配置示例)
- **API 文档**: [README.md#API-文档](./README.md#API-文档)
- **模板列表**: [src/templates/README.md#可用模板](./src/templates/README.md#可用模板)

## 🔗 外部资源

### 官方链接

- [GitHub 仓库](https://github.com/ldesign/deployer)
- [NPM 包](https://www.npmjs.com/package/@ldesign/deployer)
- [问题反馈](https://github.com/ldesign/deployer/issues)

### 相关技术

- [Docker 文档](https://docs.docker.com/)
- [Kubernetes 文档](https://kubernetes.io/docs/)
- [Semantic Versioning](https://semver.org/)

## 📞 获取帮助

### 常见问题

查看 [README.md](./README.md#常见问题) 的常见问题部分

### 提交 Issue

前往 [GitHub Issues](https://github.com/ldesign/deployer/issues) 提交问题

### 社区支持

- 💬 讨论区
- 📧 邮件列表
- 💻 开发者社区

---

**最后更新:** 2025-01  
**文档版本:** v0.3.0

