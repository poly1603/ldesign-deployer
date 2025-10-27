# 配置模板系统

> 预定义的部署配置模板，快速开始项目部署

## 功能特性

- ✅ **丰富的模板** - 预置 Express、Next.js、Vue 等主流框架模板
- ✅ **多平台支持** - Docker、Kubernetes、Docker Compose
- ✅ **易于使用** - 一条命令生成完整配置
- ✅ **灵活定制** - 支持自定义参数
- ✅ **类型安全** - 完整的 TypeScript 类型定义
- ✅ **可扩展** - 轻松添加自定义模板

## 快速开始

### CLI 使用

#### 查看所有可用模板

```bash
ldesign-deployer templates
```

#### 按条件筛选模板

```bash
# 按项目类型筛选
ldesign-deployer templates --type node

# 按平台筛选
ldesign-deployer templates --platform kubernetes

# 按标签筛选
ldesign-deployer templates --tag react
```

#### 使用模板创建配置

```bash
# 使用 Express 基础模板
ldesign-deployer template:use express-basic --name my-api --port 3000

# 使用 Next.js + Kubernetes 模板
ldesign-deployer template:use nextjs-k8s --name my-web --domain example.com

# 使用 Vue SPA 模板
ldesign-deployer template:use vue-spa --name my-frontend
```

### 编程API 使用

```typescript
import { TemplateRegistry, initializeMarketplace } from '@ldesign/deployer';

// 初始化模板市场
initializeMarketplace();

// 获取注册表实例
const registry = TemplateRegistry.getInstance();

// 查看所有模板
const allTemplates = registry.getAllTemplates();
console.log(allTemplates);

// 使用模板生成配置
const config = registry.useTemplate('express-basic', {
  name: 'my-app',
  version: '1.0.0',
  port: 3000
});

// 保存配置
await fs.writeFile('deploy.config.json', JSON.stringify(config, null, 2));
```

## 可用模板

### Express.js 模板

#### 1. express-basic 🟢
- **ID:** `express-basic`
- **项目类型:** Node.js
- **平台:** Docker
- **难度:** 初级
- **描述:** Express.js 应用的基础部署配置

**使用示例:**
```bash
ldesign-deployer template:use express-basic \
  --name my-api \
  --port 3000 \
  --version 1.0.0
```

#### 2. express-k8s 🟡
- **ID:** `express-k8s`
- **项目类型:** Node.js
- **平台:** Kubernetes
- **难度:** 中级
- **描述:** Express.js 应用的 Kubernetes 部署配置

**使用示例:**
```bash
ldesign-deployer template:use express-k8s \
  --name my-api \
  --port 3000 \
  --domain api.example.com \
  --replicas 3
```

#### 3. express-fullstack 🟡
- **ID:** `express-fullstack`
- **项目类型:** 全栈
- **平台:** Docker Compose
- **难度:** 中级
- **描述:** Express.js + 数据库的全栈部署配置

**使用示例:**
```bash
ldesign-deployer template:use express-fullstack \
  --name my-app \
  --database postgres  # 或 mongodb
```

### Next.js 模板

#### 1. nextjs-basic 🟢
- **ID:** `nextjs-basic`
- **项目类型:** SSR
- **平台:** Docker
- **难度:** 初级
- **描述:** Next.js SSR 应用的基础部署配置

**使用示例:**
```bash
ldesign-deployer template:use nextjs-basic \
  --name my-web \
  --port 3000
```

#### 2. nextjs-k8s 🟡
- **ID:** `nextjs-k8s`
- **项目类型:** SSR
- **平台:** Kubernetes
- **难度:** 中级
- **描述:** Next.js 应用的生产级 Kubernetes 部署配置

**使用示例:**
```bash
ldesign-deployer template:use nextjs-k8s \
  --name my-web \
  --domain example.com \
  --replicas 3 \
  --apiUrl https://api.example.com
```

### Vue.js 模板

#### 1. vue-spa 🟢
- **ID:** `vue-spa`
- **项目类型:** SPA
- **平台:** Docker
- **难度:** 初级
- **描述:** Vue.js SPA 的 Nginx 部署配置

**使用示例:**
```bash
ldesign-deployer template:use vue-spa \
  --name my-frontend \
  --apiUrl https://api.example.com
```

#### 2. vue-k8s 🟡
- **ID:** `vue-k8s`
- **项目类型:** SPA
- **平台:** Kubernetes
- **难度:** 中级
- **描述:** Vue.js SPA 的 Kubernetes 部署配置

**使用示例:**
```bash
ldesign-deployer template:use vue-k8s \
  --name my-frontend \
  --domain example.com
```

## 编程API

### TemplateRegistry

模板注册表，管理所有可用的配置模板。

#### 获取实例

```typescript
const registry = TemplateRegistry.getInstance();
```

#### 注册自定义模板

```typescript
registry.register({
  metadata: {
    id: 'my-template',
    name: '我的模板',
    description: '自定义模板描述',
    projectType: 'node',
    platform: 'docker',
    tags: ['custom'],
    difficulty: 'beginner'
  },
  generate: (options) => ({
    name: options.name,
    version: '1.0.0',
    environment: 'production',
    platform: 'docker',
    projectType: 'node',
    // ... 其他配置
  })
});
```

#### 搜索模板

```typescript
// 按项目类型搜索
const nodeTemplates = registry.searchByProjectType('node');

// 按平台搜索
const k8sTemplates = registry.searchByPlatform('kubernetes');

// 按标签搜索
const reactTemplates = registry.searchByTag('react');

// 关键词搜索
const results = registry.search('express');
```

#### 使用模板

```typescript
const config = registry.useTemplate('express-basic', {
  name: 'my-app',
  version: '1.0.0',
  port: 3000,
  environment: 'production'
});
```

## 创建自定义模板

### 步骤1: 定义模板

```typescript
import type { ConfigTemplate } from '@ldesign/deployer';

export const myCustomTemplate: ConfigTemplate = {
  metadata: {
    id: 'my-custom',
    name: '我的自定义模板',
    description: '针对特定需求的自定义配置',
    projectType: 'node',
    platform: 'kubernetes',
    tags: ['custom', 'production'],
    author: 'Your Name',
    version: '1.0.0',
    difficulty: 'intermediate'
  },
  generate: (options) => {
    return {
      name: options.name,
      version: options.version || '1.0.0',
      environment: 'production',
      platform: 'kubernetes',
      projectType: 'node',
      
      docker: {
        image: options.name,
        tag: 'latest',
        registry: options.registry || 'docker.io',
        multiStage: true
      },
      
      kubernetes: {
        namespace: options.namespace || 'default',
        deployment: {
          replicas: options.replicas || 3,
          resources: {
            requests: {
              cpu: '100m',
              memory: '128Mi'
            },
            limits: {
              cpu: '500m',
              memory: '512Mi'
            }
          }
        },
        service: {
          type: 'ClusterIP',
          port: 80,
          targetPort: options.port || 3000
        }
      },
      
      healthCheck: {
        enabled: true,
        path: '/health',
        port: options.port || 3000,
        interval: 30,
        timeout: 5,
        retries: 3
      }
    };
  }
};
```

### 步骤2: 注册模板

```typescript
import { TemplateRegistry } from '@ldesign/deployer';
import { myCustomTemplate } from './my-custom-template';

const registry = TemplateRegistry.getInstance();
registry.register(myCustomTemplate);
```

### 步骤3: 使用模板

```typescript
const config = registry.useTemplate('my-custom', {
  name: 'my-app',
  port: 8080,
  replicas: 5,
  namespace: 'production'
});
```

## 模板选项

所有模板都支持以下基础选项：

| 选项 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 是 | 应用名称 |
| `version` | string | 否 | 应用版本，默认 1.0.0 |
| `environment` | string | 否 | 部署环境 |
| `port` | number | 否 | 应用端口 |

### Express 模板额外选项

| 选项 | 类型 | 描述 |
|------|------|------|
| `healthPath` | string | 健康检查路径 |
| `database` | string | 数据库类型 (postgres/mongodb) |

### Kubernetes 模板额外选项

| 选项 | 类型 | 描述 |
|------|------|------|
| `namespace` | string | K8s 命名空间 |
| `replicas` | number | 副本数 |
| `domain` | string | 域名 |
| `tlsEnabled` | boolean | 启用 TLS |
| `registry` | string | 镜像仓库 |

## 最佳实践

### 1. 选择合适的模板

- **初学者** - 使用标记为 🟢 的模板
- **生产环境** - 使用 Kubernetes 模板
- **快速原型** - 使用 Docker 模板

### 2. 自定义配置

生成配置后，根据实际需求调整：

```bash
# 1. 使用模板生成基础配置
ldesign-deployer template:use express-k8s --name my-api > deploy.config.json

# 2. 编辑配置文件
vim deploy.config.json

# 3. 验证配置
ldesign-deployer doctor

# 4. 部署
ldesign-deployer deploy
```

### 3. 版本控制

将生成的配置文件纳入版本控制：

```bash
git add deploy.config.json
git commit -m "Add deployment configuration"
```

## 扩展计划

未来将添加更多模板：

- [ ] **NestJS** - NestJS 框架模板
- [ ] **React** - React SPA 模板
- [ ] **Angular** - Angular 应用模板
- [ ] **Django** - Python Django 模板
- [ ] **FastAPI** - Python FastAPI 模板
- [ ] **Laravel** - PHP Laravel 模板
- [ ] **Spring Boot** - Java Spring Boot 模板
- [ ] **Microservices** - 微服务架构模板

## 示例项目

查看 `examples/` 目录获取更多示例：

- `examples/template-basic.ts` - 基础使用
- `examples/template-custom.ts` - 自定义模板
- `examples/template-advanced.ts` - 高级用法

## 常见问题

### Q: 如何查看模板生成的配置？

A: 使用 `--output` 选项或查看生成的 JSON 文件：

```bash
ldesign-deployer template:use express-basic --name my-app --output config.json
cat config.json
```

### Q: 可以修改生成的配置吗？

A: 可以，模板生成的是标准的部署配置文件，可以手动编辑。

### Q: 如何贡献新模板？

A: 创建 Pull Request，在 `src/templates/marketplace/` 目录下添加新模板文件。

## 相关文档

- [部署配置文档](../../README.md#配置示例)
- [CLI 命令文档](../../README.md#cli-命令)
- [API 文档](../../docs/api.md)

