# LDesign Deployer 文档

这是 LDesign Deployer 的完整文档，使用 VitePress 构建。

## 文档结构

```
docs/
├── .vitepress/
│   └── config.ts          # VitePress 配置
├── guide/                 # 使用指南
│   ├── introduction.md
│   ├── getting-started.md
│   ├── installation.md
│   ├── configuration.md
│   ├── strategies.md
│   ├── blue-green.md
│   ├── canary.md
│   ├── rollback.md
│   └── ...
├── api/                   # API 文档
│   ├── core.md
│   ├── deployer.md
│   ├── strategies.md
│   ├── rollback.md
│   ├── notifications.md
│   └── ...
├── examples/             # 示例代码
│   ├── basic-deployment.md
│   ├── blue-green.md
│   ├── canary.md
│   ├── complete-workflow.md
│   └── ...
├── templates/            # 模板文档
│   ├── overview.md
│   ├── usage.md
│   ├── express.md
│   ├── nestjs.md
│   └── ...
├── changelog.md          # 更新日志
├── contributing.md       # 贡献指南
└── index.md              # 首页
```

## 本地开发

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm docs:dev
```

文档将在 http://localhost:5173 上运行。

### 构建文档

```bash
pnpm docs:build
```

### 预览构建结果

```bash
pnpm docs:preview
```

## 文档编写指南

### Markdown 格式

文档使用标准的 Markdown 格式，支持 VitePress 的所有扩展功能。

### 代码块

使用代码组展示多种包管理器的命令：

\`\`\`markdown
::: code-group
\`\`\`bash [npm]
npm install package
\`\`\`

\`\`\`bash [pnpm]
pnpm add package
\`\`\`
:::
\`\`\`

### 提示框

\`\`\`markdown
::: tip 提示
这是一个提示信息
:::

::: warning 警告
这是一个警告信息
:::

::: danger 危险
这是一个危险提示
:::
\`\`\`

### 自定义容器

\`\`\`markdown
::: details 点击查看详情
这里是详细内容
:::
\`\`\`

## 文档待完成

以下页面待创建：

### 指南 (Guide)
- [x] introduction.md - 介绍
- [x] getting-started.md - 快速开始
- [ ] installation.md - 安装指南
- [ ] configuration.md - 配置文件
- [ ] strategies.md - 部署策略
- [ ] blue-green.md - 蓝绿部署
- [ ] canary.md - 金丝雀发布
- [ ] rollback.md - 回滚机制
- [ ] notifications.md - 通知系统
- [ ] monitoring.md - 监控集成
- [ ] github-actions.md - GitHub Actions 集成
- [ ] gitlab-ci.md - GitLab CI 集成
- [ ] jenkins.md - Jenkins 集成

### API 文档
- [ ] core.md - 核心 API
- [ ] deployer.md - 部署器 API
- [ ] strategies.md - 策略 API
- [ ] rollback.md - 回滚 API
- [ ] notifications.md - 通知 API
- [ ] templates.md - 模板 API

### 示例
- [ ] basic-deployment.md - 基础部署
- [ ] docker.md - Docker 部署
- [ ] kubernetes.md - Kubernetes 部署
- [ ] blue-green.md - 蓝绿部署示例
- [ ] canary.md - 金丝雀发布示例
- [ ] notifications.md - 多渠道通知
- [ ] complete-workflow.md - 完整工作流
- [ ] nodejs-app.md - Node.js 应用
- [ ] react-app.md - React 应用
- [ ] microservices.md - 微服务

### 模板
- [ ] overview.md - 模板概览
- [ ] usage.md - 使用模板
- [ ] custom.md - 自定义模板
- [ ] express.md - Express 模板
- [ ] nestjs.md - NestJS 模板
- [ ] nextjs.md - Next.js 模板
- [ ] react.md - React 模板
- [ ] vue.md - Vue 模板

### 其他
- [ ] changelog.md - 更新日志
- [ ] contributing.md - 贡献指南

## 贡献文档

欢迎贡献文档！请参考 [贡献指南](../CONTRIBUTING.md)。

### 提交流程

1. Fork 仓库
2. 创建分支
3. 编写/修改文档
4. 提交 PR

### 文档规范

- 使用简体中文
- 代码示例要完整可运行
- 添加适当的提示和警告
- 包含必要的截图和图表

## 许可证

MIT License
