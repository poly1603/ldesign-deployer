# @ldesign/deployer

> 🚀 自动化部署工具，让应用发布变得简单可靠

## ✨ 特性

- 🚀 **一键部署** - 支持多种部署目标（服务器/CDN/容器）
- 🔄 **回滚机制** - 版本回滚和灰度发布
- 📝 **部署脚本** - 自定义部署流程脚本
- 🔔 **通知集成** - 部署状态通知（钉钉/企业微信/Slack）
- 📊 **部署日志** - 详细的部署日志和历史记录
- 🔐 **安全部署** - SSH/SFTP 安全连接
- 🌊 **流水线支持** - CI/CD 流水线集成

## 📦 安装

```bash
npm install @ldesign/deployer --save-dev
```

## 🚀 快速开始

### 初始化部署配置

```bash
npx ldesign-deployer init
```

### 部署应用

```bash
# 部署到生产环境
npx ldesign-deployer deploy production

# 部署到测试环境
npx ldesign-deployer deploy staging

# 灰度发布
npx ldesign-deployer deploy production --canary 20%
```

### 回滚版本

```bash
# 回滚到上一个版本
npx ldesign-deployer rollback

# 回滚到指定版本
npx ldesign-deployer rollback --version 1.2.0
```

## ⚙️ 配置

创建 `deployer.config.js`：

```javascript
module.exports = {
  // 部署环境
  environments: {
    production: {
      type: 'ssh',
      host: 'prod.example.com',
      port: 22,
      username: 'deploy',
      path: '/var/www/app',
    },
    staging: {
      type: 'ssh',
      host: 'staging.example.com',
      port: 22,
      username: 'deploy',
      path: '/var/www/app',
    },
  },
  
  // 构建配置
  build: {
    command: 'npm run build',
    output: 'dist',
  },
  
  // 通知配置
  notifications: {
    dingtalk: {
      webhook: process.env.DINGTALK_WEBHOOK,
    },
  },
  
  // 备份配置
  backup: {
    enabled: true,
    keep: 5,
  },
};
```

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 📄 许可证

MIT © LDesign Team

> 企业级部署工具 - Docker/K8s 部署、CI/CD 模板、蓝绿/金丝雀发布、回滚机制

[![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)](./CHANGELOG.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](./tsconfig.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

## ✨ 特性

### 🎯 核心功能

- ✅ **多环境配置** - 支持 dev/test/staging/production 环境
- ✅ **Docker 部署** - Dockerfile 生成、镜像构建、Docker Compose
- ✅ **Kubernetes 部署** - Deployment/Service/Ingress/Helm Chart 生成
- ✅ **版本管理** - SemVer 版本控制、Git Tag 创建
- ✅ **健康检查** - HTTP/TCP/自定义探针

### 🦾 增强功能 (v0.2.0)

- ✅ **并发控制** - 部署锁机制，防止冲突
- ✅ **超时重试** - 智能重试和超时控制
- ✅ **优雅退出** - 安全的资源清理
- ✅ **前置检查** - 7 项部署前检查
- ✅ **进度追踪** - 实时部署进度
- ✅ **审计日志** - 完整的操作记录

### 🌟 新增功能 (v0.3.0)

- ✅ **通知系统** - Webhook/控制台多渠道通知
- ✅ **配置模板** - 7+ 个预置模板，快速开始
- ✅ **配置预览** - Diff 对比、影响分析、风险评估
- ✅ **性能优化** - 批量操作、记忆化、性能监控
- ✅ **资源监控** - CPU/内存实时监控和告警

### 🚀 高级功能

- 🔵🟢 **蓝绿部署** - 零停机部署，快速切换
- 🐤 **金丝雀发布** - 逐步流量迁移，风险控制
- 🔄 **滚动更新** - Kubernetes 滚动更新策略
- 🔀 **A/B 测试** - 流量分割和定向规则
- ⏪ **智能回滚** - 快速回滚、自动回滚、版本历史
- 📊 **监控集成** - Prometheus/Grafana 配置生成
- 📈 **自动扩缩容** - HPA/VPA 配置

### 🔧 CI/CD 集成

- 🐙 **GitHub Actions** - 自动化工作流
- 🦊 **GitLab CI** - Pipeline 配置
- 🔨 **Jenkins** - Jenkinsfile 生成

## 📦 安装

```bash
# npm
npm install @ldesign/deployer

# pnpm
pnpm add @ldesign/deployer

# yarn
yarn add @ldesign/deployer
```

## 🚀 快速开始

### CLI 使用

```bash
# 方式1: 使用模板快速开始 (推荐)
ldesign-deployer template:use express-k8s --name my-app --domain example.com

# 方式2: 手动初始化配置
ldesign-deployer init my-app

# 查看可用模板
ldesign-deployer templates

# 部署到开发环境
ldesign-deployer deploy --env development

# 部署到生产环境（增强模式，带重试和超时）
ldesign-deployer deploy --env production --retry --timeout 600

# 回滚到上一个版本
ldesign-deployer rollback

# 回滚到指定版本
ldesign-deployer rollback 1.0.0

# 查看部署历史
ldesign-deployer history

# 查看部署状态
ldesign-deployer status

# 查看审计日志
ldesign-deployer audit:stats
```

### 编程 API

#### 基础部署

```typescript
import { createDeployer } from '@ldesign/deployer'

// 创建部署器
const deployer = createDeployer()

// 执行部署
const result = await deployer.deploy({
  environment: 'production',
  configFile: 'deploy.config.json',
})

console.log('Deployment result:', result)
```

#### 增强版部署（推荐）

```typescript
import { createEnhancedDeployer } from '@ldesign/deployer'

// 创建增强版部署器
const deployer = createEnhancedDeployer()

// 监听部署进度
deployer.onProgress((event) => {
  console.log(`[${event.progress}%] ${event.phase}: ${event.message}`)
})

// 执行部署（带所有高级功能）
const result = await deployer.deploy({
  environment: 'production',
  deploymentTimeout: 600000,  // 10 分钟超时
  retryOnFailure: true,       // 失败自动重试
  enableAudit: true,          // 启用审计日志
  enableProgress: true,       // 启用进度追踪
})

if (result.success) {
  console.log('✅ Deployment successful!')
} else {
  console.error('❌ Deployment failed:', result.message)
}
```

## 📖 配置示例

### deploy.config.json

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "environment": "production",
  "platform": "kubernetes",
  "projectType": "node",
  "docker": {
    "image": "my-app",
    "tag": "latest",
    "registry": "docker.io",
    "multiStage": true
  },
  "kubernetes": {
    "namespace": "default",
    "deployment": {
      "replicas": 3,
      "resources": {
        "requests": { "cpu": "100m", "memory": "128Mi" },
        "limits": { "cpu": "500m", "memory": "512Mi" }
      }
    },
    "service": {
      "type": "ClusterIP",
      "port": 80,
      "targetPort": 3000
    },
    "ingress": {
      "enabled": true,
      "host": "my-app.example.com",
      "tls": {
        "enabled": true,
        "secretName": "my-app-tls"
      }
    }
  },
  "healthCheck": {
    "enabled": true,
    "path": "/health",
    "port": 3000,
    "interval": 30,
    "timeout": 5,
    "retries": 3
  }
}
```

## 🛠️ CLI 命令

### 模板命令

```bash
# 列出所有模板
ldesign-deployer templates

# 筛选模板
ldesign-deployer templates --type node --platform kubernetes

# 使用模板创建配置
ldesign-deployer template:use <template-id> \
  --name <app-name> \
  --port <port> \
  --domain <domain>

# 示例
ldesign-deployer template:use express-k8s --name my-api --domain api.example.com
```

### 配置预览命令

```bash
# 对比两个配置文件
ldesign-deployer preview:diff old-config.json new-config.json

# 分析变更影响
ldesign-deployer preview:analyze old-config.json new-config.json
```

### 部署命令

```bash
# 部署应用
ldesign-deployer deploy [options]
  --env <environment>    目标环境 (development/test/staging/production)
  --config <file>        配置文件路径
  --dry-run             试运行模式
  --skip-health-check   跳过健康检查
  --skip-hooks          跳过钩子脚本

# 回滚
ldesign-deployer rollback [version] [options]
  --revision <number>   Kubernetes 修订版本号
```

### Docker 命令

```bash
# 生成 Dockerfile
ldesign-deployer docker:dockerfile [options]
  --type <type>         项目类型 (node/static/spa)
  --multi-stage         使用多阶段构建

# 生成 docker-compose.yml
ldesign-deployer docker:compose [options]
  --db <database>       包含数据库 (postgres/mysql/mongodb/redis)
  --nginx              包含 nginx
```

### Kubernetes 命令

```bash
# 生成 Kubernetes 清单
ldesign-deployer k8s:manifests [options]
  --config <file>       配置文件路径

# 生成 Helm Chart
ldesign-deployer k8s:helm [options]
  --config <file>       配置文件路径
  --output <dir>        输出目录
```

### CI/CD 命令

```bash
# 生成 GitHub Actions 工作流
ldesign-deployer cicd:github

# 生成 GitLab CI Pipeline
ldesign-deployer cicd:gitlab

# 生成 Jenkins Pipeline
ldesign-deployer cicd:jenkins
```

### 版本命令

```bash
# 递增版本
ldesign-deployer version:bump <type>
  type: major | minor | patch

# 创建 Git Tag
ldesign-deployer version:tag [options]
  --push    推送 tag 到远程
```

## 💡 使用示例

### 使用模板快速开始

```bash
# 1. 查看可用模板
ldesign-deployer templates

# 2. 使用模板创建配置
ldesign-deployer template:use express-k8s \
  --name my-api \
  --domain api.example.com \
  --port 3000

# 3. 部署
ldesign-deployer deploy --env production
```

### 配置通知

```typescript
import { 
  EnhancedDeployer, 
  NotificationManager,
  WebhookNotifier 
} from '@ldesign/deployer'

const deployer = new EnhancedDeployer()
const notifications = new NotificationManager()

// 添加通知渠道
notifications.addNotifier(new WebhookNotifier({
  url: 'https://hooks.example.com/webhook',
  authToken: 'your-token'
}))

// 执行部署
const result = await deployer.deploy({
  environment: 'production'
})

// 发送通知
await notifications.sendDeployment({
  appName: 'my-app',
  version: '1.0.0',
  environment: 'production',
  success: result.success,
  duration: 45000
})
```

### 配置预览和分析

```typescript
import { ConfigDiffer, ChangeAnalyzer } from '@ldesign/deployer'

// 对比配置
const differ = new ConfigDiffer()
const diffReport = differ.compare(oldConfig, newConfig)

console.log(differ.formatReport(diffReport))

// 分析影响
const analyzer = new ChangeAnalyzer()
const analysis = analyzer.analyze(diffReport, oldConfig, newConfig)

console.log(`风险评分: ${analysis.overallRiskScore}/100`)
console.log(`需要停机: ${analysis.requiresDowntime ? '是' : '否'}`)
```

### 资源监控

```typescript
import { ResourceMonitor } from '@ldesign/deployer'

const monitor = new ResourceMonitor({
  interval: 5000,
  cpuThreshold: 80,
  memoryThreshold: 85
})

monitor.on('alert', (alert) => {
  console.log(`资源告警: ${alert.type} ${alert.value}%`)
})

monitor.start()

// 执行部署...

monitor.stop()
const stats = monitor.getStatistics()
console.log(`平均 CPU: ${stats.avgCpu.toFixed(2)}%`)
```

### 蓝绿部署

```typescript
import { BlueGreenStrategy } from '@ldesign/deployer'

const strategy = new BlueGreenStrategy()

await strategy.deploy({
  blueVersion: '1.0.0',
  greenVersion: '1.1.0',
  activeColor: 'blue',
  trafficSwitch: {
    immediate: true,
  },
  rollbackOnError: true,
})
```

### 金丝雀发布

```typescript
import { CanaryStrategy } from '@ldesign/deployer'

const strategy = new CanaryStrategy()

await strategy.deploy({
  baselineVersion: '1.0.0',
  canaryVersion: '1.1.0',
  steps: [
    { weight: 10, duration: 300 }, // 10% 流量，持续 5 分钟
    { weight: 50, duration: 600 }, // 50% 流量，持续 10 分钟
    { weight: 100, duration: 0 },  // 100% 流量
  ],
  autoRollback: true,
})
```

### 自动回滚

```typescript
import { AutoRollback, HealthChecker } from '@ldesign/deployer'

const autoRollback = new AutoRollback()

await autoRollback.start(
  {
    enabled: true,
    path: '/health',
    port: 3000,
    interval: 30,
  },
  {
    enabled: true,
    errorThreshold: 3,
    checkInterval: 30,
    onRollback: () => {
      console.log('Auto-rollback triggered!')
    },
  }
)
```

## 📚 API 文档

详细 API 文档请查看 [API Documentation](./docs/api.md)

## 🤝 贡献

欢迎贡献！请查看 [贡献指南](../../CONTRIBUTING.md)

## 📄 许可证

[MIT](./LICENSE)

## 🔗 相关链接

- [项目计划](./PROJECT_PLAN.md)
- [更新日志](./CHANGELOG.md)
- [GitHub](https://github.com/ldesign/deployer)

## 💬 支持

如有问题或建议，请提交 [Issue](https://github.com/ldesign/deployer/issues)

