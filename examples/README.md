# @ldesign/deployer 示例

本目录包含 @ldesign/deployer 的使用示例。

## 📁 文件说明

### 配置示例

- **deploy.config.example.json** - 完整的部署配置示例

### 代码示例

- **simple-deploy.ts** - 简单部署示例
- **blue-green-deploy.ts** - 蓝绿部署示例
- **canary-deploy.ts** - 金丝雀发布示例
- **auto-rollback.ts** - 自动回滚示例

## 🚀 运行示例

### 1. 安装依赖

```bash
npm install @ldesign/deployer
```

### 2. 创建配置文件

复制 `deploy.config.example.json` 并修改为你的配置：

```bash
cp examples/deploy.config.example.json deploy.config.json
```

### 3. 运行示例

```bash
# 简单部署
npx tsx examples/simple-deploy.ts

# 蓝绿部署
npx tsx examples/blue-green-deploy.ts

# 金丝雀发布
npx tsx examples/canary-deploy.ts

# 自动回滚监控
npx tsx examples/auto-rollback.ts
```

## 📖 CLI 示例

### 初始化配置

```bash
ldesign-deployer init my-app
```

### 部署到不同环境

```bash
# 开发环境
ldesign-deployer deploy --env development

# 测试环境
ldesign-deployer deploy --env test

# 生产环境
ldesign-deployer deploy --env production
```

### 生成 Docker 文件

```bash
# 生成 Dockerfile (Node.js)
ldesign-deployer docker:dockerfile --type node --multi-stage

# 生成 docker-compose.yml (带 PostgreSQL)
ldesign-deployer docker:compose --db postgres --nginx
```

### 生成 Kubernetes 文件

```bash
# 生成 K8s 清单
ldesign-deployer k8s:manifests

# 生成 Helm Chart
ldesign-deployer k8s:helm --output ./helm
```

### 生成 CI/CD 配置

```bash
# GitHub Actions
ldesign-deployer cicd:github

# GitLab CI
ldesign-deployer cicd:gitlab

# Jenkins
ldesign-deployer cicd:jenkins
```

### 版本管理

```bash
# 递增版本
ldesign-deployer version:bump patch  # 1.0.0 -> 1.0.1
ldesign-deployer version:bump minor  # 1.0.0 -> 1.1.0
ldesign-deployer version:bump major  # 1.0.0 -> 2.0.0

# 创建并推送 Git Tag
ldesign-deployer version:tag --push
```

### 回滚

```bash
# 回滚到上一个版本
ldesign-deployer rollback

# 回滚到指定版本
ldesign-deployer rollback 1.0.0

# Kubernetes 回滚到指定修订版本
ldesign-deployer rollback --revision 2
```

### 查看历史

```bash
# 查看最近 10 条部署历史
ldesign-deployer history

# 查看最近 20 条
ldesign-deployer history 20
```

## 💡 更多示例

更多使用示例请参考 [主文档](../README.md)




