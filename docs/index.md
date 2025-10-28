---
layout: home

hero:
  name: LDesign Deployer
  text: 企业级部署工具
  tagline: 让应用发布变得简单可靠
  image:
    src: /logo.svg
    alt: LDesign Deployer
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 查看示例
      link: /examples/basic-deployment
    - theme: alt
      text: GitHub
      link: https://github.com/ldesign/deployer

features:
  - icon: 🚀
    title: 多平台支持
    details: 支持 Docker、Kubernetes、Docker Compose 等主流部署平台，一套工具解决所有部署需求

  - icon: 🔵🟢
    title: 蓝绿部署
    details: 零停机部署，秒级回滚，通过维护两个独立环境实现无缝切换

  - icon: 🐤
    title: 金丝雀发布
    details: 渐进式流量迁移（10% → 50% → 100%），风险可控，支持自动回滚

  - icon: ⏪
    title: 智能回滚
    details: Docker 和 K8s 回滚支持，版本历史管理，回滚影响预览，一键快速回滚

  - icon: 🔔
    title: 多渠道通知
    details: 支持 Slack、钉钉、邮件、Webhook 等 5 种通知渠道，实时掌握部署状态

  - icon: 📦
    title: 13+ 框架模板
    details: Express、NestJS、Next.js、React、Vue 等主流框架模板，开箱即用

  - icon: 📊
    title: 可视化报告
    details: 支持 JSON、Markdown、HTML、Text 四种格式，精美的部署报告自动生成

  - icon: 🔐
    title: 安全可靠
    details: 完整的错误处理，健康检查集成，审计日志记录，生产级可靠性

  - icon: ⚡
    title: 性能优化
    details: 批量操作、缓存机制、并发控制，20-50% 性能提升

  - icon: 🛠️
    title: 27+ CLI 命令
    details: 丰富的命令行工具，覆盖部署、回滚、监控、审计等各个环节

  - icon: 📈
    title: 资源监控
    details: CPU、内存实时监控，阈值告警，统计分析，资源使用一目了然

  - icon: 🧩
    title: 高度可扩展
    details: 模块化设计，易于扩展，支持自定义模板、策略、通知器等
---

## 快速开始

### 安装

::: code-group
```bash [npm]
npm install @ldesign/deployer --save-dev
```

```bash [pnpm]
pnpm add @ldesign/deployer -D
```

```bash [yarn]
yarn add @ldesign/deployer --dev
```
:::

### 使用模板快速开始

```bash
# 1. 查看可用模板
npx ldesign-deployer templates

# 2. 使用模板创建配置
npx ldesign-deployer template:use nestjs-k8s \
  --name my-api \
  --domain api.example.com

# 3. 执行部署
npx ldesign-deployer deploy --env production
```

### 编程方式使用

```typescript
import { 
  CanaryStrategy, 
  NotificationManager,
  SlackNotifier,
  initializeMarketplace,
  TemplateRegistry 
} from '@ldesign/deployer'

// 1. 使用模板
initializeMarketplace()
const config = TemplateRegistry.getInstance()
  .useTemplate('nestjs-k8s', {
    name: 'my-api',
    domain: 'api.example.com'
  })

// 2. 配置通知
const notifications = new NotificationManager()
notifications.addNotifier(new SlackNotifier({
  webhookUrl: process.env.SLACK_WEBHOOK,
  channel: '#deployments'
}))

// 3. 执行金丝雀发布
const strategy = new CanaryStrategy()
const result = await strategy.deploy({
  appName: 'my-api',
  baselineVersion: '1.0.0',
  canaryVersion: '1.1.0',
  platform: 'kubernetes',
  steps: [
    { weight: 10, duration: 300 },
    { weight: 50, duration: 600 },
    { weight: 100, duration: 0 }
  ],
  autoRollback: true
})

// 4. 发送通知
await notifications.sendDeployment({
  appName: 'my-api',
  version: '1.1.0',
  environment: 'production',
  success: result.success,
  duration: 45000
})
```

## 为什么选择 LDesign Deployer？

<div class="vp-feature-grid">

### 🎯 功能完善
- **98% 功能完整度** - 覆盖企业级部署全流程
- **27 个 CLI 命令** - 部署、回滚、监控、审计一应俱全
- **13 个框架模板** - 主流技术栈开箱即用

### ✅ 生产就绪
- **95% 生产就绪度** - 完整的错误处理和监控
- **蓝绿/金丝雀策略** - 零停机、风险可控
- **智能回滚系统** - 快速恢复、影响预览

### 🚀 易于使用
- **5 个通知渠道** - 覆盖国内外主流工具
- **4 种报告格式** - JSON、Markdown、HTML、Text
- **完整的文档** - 丰富的示例和 API 参考

### 💎 高质量代码
- **TypeScript** - 100% 类型安全
- **模块化设计** - 易于维护和扩展
- **最佳实践** - 遵循行业标准

</div>

## 核心特性

### 部署策略

支持多种企业级部署策略，满足不同场景需求：

- **蓝绿部署** - 零停机部署，快速回滚
- **金丝雀发布** - 渐进式发布，风险可控
- **滚动更新** - Kubernetes 原生支持
- **A/B 测试** - 流量分割和定向规则

### 平台支持

一套工具，支持多种部署平台：

- **Docker** - 容器化部署
- **Kubernetes** - 云原生编排
- **Docker Compose** - 本地开发和测试

### 通知集成

实时通知，掌握部署状态：

- **Slack** - 团队协作工具
- **钉钉** - 国内主流办公平台
- **邮件** - 传统但可靠
- **Webhook** - 自定义集成

## 社区与支持

- **GitHub**: [ldesign/deployer](https://github.com/ldesign/deployer)
- **问题反馈**: [Issues](https://github.com/ldesign/deployer/issues)
- **贡献指南**: [Contributing](/contributing)

## 许可证

[MIT License](https://github.com/ldesign/deployer/blob/main/LICENSE)
