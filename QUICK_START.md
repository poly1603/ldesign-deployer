# 🚀 @ldesign/deployer 快速开始

## 📦 安装

```bash
npm install @ldesign/deployer
# 或
pnpm add @ldesign/deployer
# 或
yarn add @ldesign/deployer
```

## ⚡ 5 分钟快速上手

### 1. 初始化配置

```bash
npx ldesign-deployer init my-app
```

这将创建 `deploy.config.json` 文件。

### 2. 编辑配置

编辑 `deploy.config.json`：

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "environment": "production",
  "platform": "docker",
  "projectType": "node",
  "docker": {
    "image": "my-app",
    "tag": "latest"
  }
}
```

### 3. 执行部署

```bash
npx ldesign-deployer deploy --env production
```

### 4. 查看历史

```bash
npx ldesign-deployer history
```

### 5. 回滚（如需要）

```bash
npx ldesign-deployer rollback
```

## 🎯 常用场景

### 场景 1: Docker 部署

```bash
# 生成 Dockerfile
ldesign-deployer docker:dockerfile --type node --multi-stage

# 生成 docker-compose.yml
ldesign-deployer docker:compose --db postgres

# 部署
ldesign-deployer deploy --env production
```

### 场景 2: Kubernetes 部署

```json
// deploy.config.json
{
  "platform": "kubernetes",
  "kubernetes": {
    "namespace": "production",
    "deployment": {
      "replicas": 3
    },
    "ingress": {
      "enabled": true,
      "host": "my-app.com"
    }
  }
}
```

```bash
# 生成 K8s 清单
ldesign-deployer k8s:manifests

# 部署到 K8s
ldesign-deployer deploy --env production
```

### 场景 3: 蓝绿部署

```typescript
import { BlueGreenStrategy } from '@ldesign/deployer'

const strategy = new BlueGreenStrategy()

await strategy.deploy({
  blueVersion: '1.0.0',
  greenVersion: '1.1.0',
  activeColor: 'blue',
  trafficSwitch: { immediate: true },
  rollbackOnError: true,
})
```

### 场景 4: 金丝雀发布

```typescript
import { CanaryStrategy } from '@ldesign/deployer'

const strategy = new CanaryStrategy()

await strategy.deploy({
  baselineVersion: '1.0.0',
  canaryVersion: '1.1.0',
  steps: [
    { weight: 10, duration: 300 },
    { weight: 50, duration: 600 },
    { weight: 100, duration: 0 },
  ],
  autoRollback: true,
})
```

### 场景 5: 自动回滚监控

```typescript
import { AutoRollback } from '@ldesign/deployer'

const autoRollback = new AutoRollback()

await autoRollback.start(
  { enabled: true, path: '/health', port: 3000 },
  { enabled: true, errorThreshold: 3, checkInterval: 30 }
)
```

### 场景 6: CI/CD 集成

```bash
# GitHub Actions
ldesign-deployer cicd:github

# GitLab CI
ldesign-deployer cicd:gitlab

# Jenkins
ldesign-deployer cicd:jenkins
```

## 📖 更多资源

- [完整文档](./README.md)
- [配置示例](./examples/deploy.config.example.json)
- [代码示例](./examples/)
- [项目计划](./PROJECT_PLAN.md)

## 💡 提示

1. **dry-run 模式**: 使用 `--dry-run` 预览部署操作
2. **健康检查**: 配置 `healthCheck` 确保部署成功
3. **回滚准备**: 启用版本历史，方便快速回滚
4. **CI/CD**: 使用 `cicd:*` 命令生成 CI/CD 配置
5. **监控**: 使用 PrometheusIntegration 设置监控

## 🆘 常见问题

### Q: 如何跳过健康检查？

```bash
ldesign-deployer deploy --skip-health-check
```

### Q: 如何回滚到指定版本？

```bash
ldesign-deployer rollback 1.0.0
```

### Q: 如何查看详细日志？

```bash
ldesign-deployer deploy --debug
```

### Q: 如何配置多环境？

创建多个配置文件：
- `deploy.dev.json`
- `deploy.staging.json`
- `deploy.prod.json`

然后使用：

```bash
ldesign-deployer deploy --config deploy.prod.json
```

## 🎉 开始使用

现在你已经掌握了基础知识，开始部署你的应用吧！

```bash
ldesign-deployer init my-awesome-app
ldesign-deployer deploy --env production
```

有问题？查看 [完整文档](./README.md) 或提交 [Issue](https://github.com/ldesign/deployer/issues)




