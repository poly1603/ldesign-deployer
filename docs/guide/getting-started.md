# 快速开始

本指南将帮助您在 5 分钟内开始使用 LDesign Deployer。

## 前置要求

- Node.js 18+ 
- npm / pnpm / yarn
- Docker（可选，用于 Docker 部署）
- kubectl（可选，用于 Kubernetes 部署）

## 安装

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

## 方式一：使用模板快速开始（推荐）

### 1. 查看可用模板

```bash
npx ldesign-deployer templates
```

输出示例：
```
📦 可用模板 (13个):

Node.js 后端:
  ✓ express-basic        Express 基础 Docker 模板
  ✓ express-k8s          Express Kubernetes 模板
  ✓ express-fullstack    Express 全栈模板
  ✓ nestjs-basic         NestJS 基础 Docker 模板
  ✓ nestjs-k8s           NestJS Kubernetes 模板
  ✓ nestjs-microservice  NestJS 微服务模板

前端应用:
  ✓ nextjs-basic         Next.js 基础模板
  ✓ nextjs-k8s           Next.js Kubernetes 模板
  ✓ react-spa            React SPA 模板
  ✓ react-k8s            React Kubernetes 模板
  ✓ react-vite           React + Vite 模板
  ✓ vue-spa              Vue SPA 模板
  ✓ vue-k8s              Vue Kubernetes 模板
```

### 2. 使用模板创建配置

```bash
# 使用 NestJS K8s 模板
npx ldesign-deployer template:use nestjs-k8s \
  --name my-api \
  --domain api.example.com \
  --port 3000
```

这将自动生成 `deploy.config.json` 配置文件：

```json
{
  "name": "my-api",
  "version": "1.0.0",
  "environment": "production",
  "platform": "kubernetes",
  "projectType": "node",
  "docker": {
    "image": "my-api",
    "tag": "latest",
    "registry": "docker.io",
    "multiStage": true
  },
  "kubernetes": {
    "namespace": "default",
    "deployment": {
      "replicas": 3,
      "resources": {
        "requests": { "cpu": "200m", "memory": "256Mi" },
        "limits": { "cpu": "1000m", "memory": "512Mi" }
      }
    },
    "service": {
      "type": "ClusterIP",
      "port": 80,
      "targetPort": 3000
    },
    "ingress": {
      "enabled": true,
      "host": "api.example.com"
    }
  },
  "healthCheck": {
    "enabled": true,
    "path": "/health",
    "port": 3000
  }
}
```

### 3. 执行部署

```bash
# 部署到生产环境
npx ldesign-deployer deploy --env production

# 或使用增强模式（带重试和超时控制）
npx ldesign-deployer deploy --env production --retry --timeout 600
```

## 方式二：手动配置

### 1. 初始化配置

```bash
# 使用交互式向导
npx ldesign-deployer init --interactive

# 或直接创建
npx ldesign-deployer init my-app
```

### 2. 编辑配置文件

创建 `deploy.config.json`：

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "environment": "production",
  "platform": "docker",
  "projectType": "node",
  "docker": {
    "image": "my-app",
    "tag": "latest",
    "multiStage": true
  },
  "healthCheck": {
    "enabled": true,
    "path": "/health",
    "port": 3000
  }
}
```

### 3. 执行部署

```bash
npx ldesign-deployer deploy --env production
```

## 方式三：编程方式使用

### 基础部署

```typescript
import { createEnhancedDeployer } from '@ldesign/deployer'

const deployer = createEnhancedDeployer()

// 监听进度
deployer.onProgress((event) => {
  console.log(`[${event.progress}%] ${event.message}`)
})

// 执行部署
const result = await deployer.deploy({
  environment: 'production',
  configFile: 'deploy.config.json',
  enableAudit: true,
  enableProgress: true,
  retryOnFailure: true
})

if (result.success) {
  console.log('✅ 部署成功!')
} else {
  console.error('❌ 部署失败:', result.message)
}
```

### 使用模板

```typescript
import { 
  initializeMarketplace,
  TemplateRegistry 
} from '@ldesign/deployer'

// 初始化模板市场
initializeMarketplace()

// 获取注册表
const registry = TemplateRegistry.getInstance()

// 使用模板生成配置
const config = registry.useTemplate('nestjs-k8s', {
  name: 'my-api',
  domain: 'api.example.com',
  port: 3000,
  replicas: 3
})

console.log('配置已生成:', config)
```

### 配置通知

```typescript
import { 
  NotificationManager,
  SlackNotifier,
  DingTalkNotifier 
} from '@ldesign/deployer'

const notifications = new NotificationManager()

// 添加 Slack 通知
notifications.addNotifier(new SlackNotifier({
  webhookUrl: process.env.SLACK_WEBHOOK,
  channel: '#deployments',
  username: 'Deploy Bot'
}))

// 添加钉钉通知
notifications.addNotifier(new DingTalkNotifier({
  webhookUrl: process.env.DINGTALK_WEBHOOK,
  secret: process.env.DINGTALK_SECRET,
  atMobiles: ['13800138000']
}))

// 发送部署通知
await notifications.sendDeployment({
  appName: 'my-api',
  version: '1.0.0',
  environment: 'production',
  success: true,
  duration: 45000
})
```

## 常用命令

### 部署相关

```bash
# 部署到不同环境
npx ldesign-deployer deploy --env development
npx ldesign-deployer deploy --env staging
npx ldesign-deployer deploy --env production

# 干运行（不实际部署）
npx ldesign-deployer deploy --env production --dry-run

# 跳过健康检查
npx ldesign-deployer deploy --env production --skip-health-check
```

### 回滚相关

```bash
# 回滚到上一个版本
npx ldesign-deployer rollback

# 回滚到指定版本
npx ldesign-deployer rollback 1.0.0

# 查看部署历史
npx ldesign-deployer history

# 查看部署状态
npx ldesign-deployer status
```

### 模板相关

```bash
# 查看所有模板
npx ldesign-deployer templates

# 筛选模板
npx ldesign-deployer templates --type node --platform kubernetes

# 使用模板
npx ldesign-deployer template:use express-k8s --name my-app
```

### Docker 相关

```bash
# 生成 Dockerfile
npx ldesign-deployer docker:dockerfile --type node --multi-stage

# 生成 docker-compose.yml
npx ldesign-deployer docker:compose --db postgres --nginx
```

### Kubernetes 相关

```bash
# 生成 K8s 清单
npx ldesign-deployer k8s:manifests --config deploy.config.json

# 生成 Helm Chart
npx ldesign-deployer k8s:helm --output ./helm-chart
```

### CI/CD 相关

```bash
# 生成 GitHub Actions 工作流
npx ldesign-deployer cicd:github

# 生成 GitLab CI Pipeline
npx ldesign-deployer cicd:gitlab

# 生成 Jenkins Pipeline
npx ldesign-deployer cicd:jenkins
```

## 下一步

- 学习 [配置文件](/guide/configuration) 的详细选项
- 了解 [部署策略](/guide/strategies) 如蓝绿部署和金丝雀发布
- 查看 [完整示例](/examples/complete-workflow) 了解生产级部署流程
- 浏览 [API 文档](/api/core) 学习编程接口

## 常见问题

### Q: 部署失败了怎么办？

A: 查看详细的错误日志，使用 `--debug` 选项获取更多信息：
```bash
npx ldesign-deployer deploy --env production --debug
```

### Q: 如何配置多个环境？

A: 为每个环境创建单独的配置文件：
```bash
deploy.dev.json
deploy.staging.json
deploy.prod.json
```

然后使用 `--config` 参数指定：
```bash
npx ldesign-deployer deploy --config deploy.prod.json
```

### Q: 如何集成到 CI/CD？

A: 参考 [GitHub Actions](/guide/github-actions)、[GitLab CI](/guide/gitlab-ci) 或 [Jenkins](/guide/jenkins) 指南。

### Q: 支持哪些部署平台？

A: 目前支持：
- Docker
- Kubernetes
- Docker Compose

更多平台支持正在开发中。
