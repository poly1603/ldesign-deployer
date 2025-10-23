/**
 * 配置模板库
 * 提供多种场景的预设配置模板
 */

import type { DeployConfig, ProjectType, Platform, Environment } from '../types/index.js'

/**
 * 模板选项
 */
export interface TemplateOptions {
  name: string
  projectType: ProjectType
  platform?: Platform
  environment?: Environment
  port?: number
  nodeVersion?: string
  includeDatabase?: boolean
  includeRedis?: boolean
  includeNginx?: boolean
}

/**
 * Node.js 应用模板
 */
export function createNodeTemplate(options: TemplateOptions): DeployConfig {
  const {
    name,
    platform = 'docker',
    environment = 'development',
    port = 3000,
    nodeVersion = '20',
  } = options

  return {
    name,
    version: '1.0.0',
    environment,
    platform,
    projectType: 'node',
    docker: {
      image: name,
      tag: 'latest',
      registry: 'docker.io',
      multiStage: true,
      buildArgs: {
        NODE_VERSION: nodeVersion,
        PORT: port.toString(),
      },
    },
    kubernetes: platform === 'kubernetes' ? {
      namespace: 'default',
      deployment: {
        replicas: environment === 'production' ? 3 : 1,
        resources: {
          requests: {
            cpu: '100m',
            memory: '128Mi',
          },
          limits: {
            cpu: '500m',
            memory: '512Mi',
          },
        },
        livenessProbe: {
          httpGet: {
            path: '/health',
            port,
          },
          initialDelaySeconds: 30,
          periodSeconds: 10,
        },
        readinessProbe: {
          httpGet: {
            path: '/health',
            port,
          },
          initialDelaySeconds: 5,
          periodSeconds: 5,
        },
      },
      service: {
        type: 'ClusterIP',
        port: 80,
        targetPort: port,
      },
      ingress: {
        enabled: true,
        host: `${name}.example.com`,
        path: '/',
        tls: {
          enabled: true,
          secretName: `${name}-tls`,
        },
      },
    } : undefined,
    healthCheck: {
      enabled: true,
      path: '/health',
      port,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
    hooks: {
      preDeploy: [
        'npm run test',
        'npm run lint',
      ],
      postDeploy: [
        'echo "Deployment completed successfully"',
      ],
    },
  }
}

/**
 * SPA (Single Page Application) 模板
 */
export function createSPATemplate(options: TemplateOptions): DeployConfig {
  const {
    name,
    platform = 'docker',
    environment = 'development',
    port = 80,
  } = options

  return {
    name,
    version: '1.0.0',
    environment,
    platform,
    projectType: 'spa',
    docker: {
      image: name,
      tag: 'latest',
      registry: 'docker.io',
      multiStage: true,
    },
    kubernetes: platform === 'kubernetes' ? {
      namespace: 'default',
      deployment: {
        replicas: environment === 'production' ? 3 : 1,
        resources: {
          requests: {
            cpu: '50m',
            memory: '64Mi',
          },
          limits: {
            cpu: '200m',
            memory: '256Mi',
          },
        },
        readinessProbe: {
          httpGet: {
            path: '/',
            port,
          },
          initialDelaySeconds: 5,
          periodSeconds: 5,
        },
      },
      service: {
        type: 'ClusterIP',
        port: 80,
        targetPort: port,
      },
      ingress: {
        enabled: true,
        host: `${name}.example.com`,
        path: '/',
        tls: {
          enabled: true,
          secretName: `${name}-tls`,
        },
        annotations: {
          'nginx.ingress.kubernetes.io/rewrite-target': '/',
        },
      },
    } : undefined,
    healthCheck: {
      enabled: true,
      path: '/',
      port,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
    hooks: {
      preDeploy: [
        'npm run build',
        'npm run test',
      ],
    },
  }
}

/**
 * 静态网站模板
 */
export function createStaticTemplate(options: TemplateOptions): DeployConfig {
  const {
    name,
    platform = 'docker',
    environment = 'development',
    port = 80,
  } = options

  return {
    name,
    version: '1.0.0',
    environment,
    platform,
    projectType: 'static',
    docker: {
      image: name,
      tag: 'latest',
      registry: 'docker.io',
    },
    kubernetes: platform === 'kubernetes' ? {
      namespace: 'default',
      deployment: {
        replicas: environment === 'production' ? 2 : 1,
        resources: {
          requests: {
            cpu: '25m',
            memory: '32Mi',
          },
          limits: {
            cpu: '100m',
            memory: '128Mi',
          },
        },
      },
      service: {
        type: 'ClusterIP',
        port: 80,
        targetPort: port,
      },
      ingress: {
        enabled: true,
        host: `${name}.example.com`,
        path: '/',
      },
    } : undefined,
    healthCheck: {
      enabled: true,
      path: '/',
      port,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
  }
}

/**
 * SSR (Server-Side Rendering) 应用模板
 */
export function createSSRTemplate(options: TemplateOptions): DeployConfig {
  const {
    name,
    platform = 'docker',
    environment = 'development',
    port = 3000,
    nodeVersion = '20',
  } = options

  return {
    name,
    version: '1.0.0',
    environment,
    platform,
    projectType: 'ssr',
    docker: {
      image: name,
      tag: 'latest',
      registry: 'docker.io',
      multiStage: true,
      buildArgs: {
        NODE_VERSION: nodeVersion,
        PORT: port.toString(),
      },
    },
    kubernetes: platform === 'kubernetes' ? {
      namespace: 'default',
      deployment: {
        replicas: environment === 'production' ? 3 : 1,
        resources: {
          requests: {
            cpu: '200m',
            memory: '256Mi',
          },
          limits: {
            cpu: '1',
            memory: '1Gi',
          },
        },
        livenessProbe: {
          httpGet: {
            path: '/health',
            port,
          },
          initialDelaySeconds: 30,
          periodSeconds: 10,
        },
        readinessProbe: {
          httpGet: {
            path: '/health',
            port,
          },
          initialDelaySeconds: 5,
          periodSeconds: 5,
        },
      },
      service: {
        type: 'ClusterIP',
        port: 80,
        targetPort: port,
      },
      ingress: {
        enabled: true,
        host: `${name}.example.com`,
        path: '/',
        tls: {
          enabled: true,
          secretName: `${name}-tls`,
        },
      },
    } : undefined,
    healthCheck: {
      enabled: true,
      path: '/health',
      port,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
    hooks: {
      preDeploy: [
        'npm run build',
        'npm run test',
      ],
      postDeploy: [
        'echo "Deployment completed successfully"',
      ],
    },
  }
}

/**
 * Docker Compose 全栈模板
 */
export function createFullStackTemplate(options: TemplateOptions): DeployConfig {
  const {
    name,
    environment = 'development',
    port = 3000,
    nodeVersion = '20',
    includeDatabase = true,
    includeRedis = true,
    includeNginx = true,
  } = options

  const config: DeployConfig = {
    name,
    version: '1.0.0',
    environment,
    platform: 'docker-compose',
    projectType: 'node',
    docker: {
      image: name,
      tag: 'latest',
      multiStage: true,
      buildArgs: {
        NODE_VERSION: nodeVersion,
        PORT: port.toString(),
      },
      compose: {
        services: {
          app: {
            image: `${name}:latest`,
            build: {
              context: '.',
              dockerfile: 'Dockerfile',
            },
            ports: [`${port}:${port}`],
            environment: {
              NODE_ENV: environment,
              PORT: port.toString(),
            },
            depends_on: [],
            restart: 'unless-stopped',
            networks: ['app-network'],
          },
        },
        networks: {
          'app-network': {
            driver: 'bridge',
          },
        },
        volumes: {},
      },
    },
    healthCheck: {
      enabled: true,
      path: '/health',
      port,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
  }

  // 添加数据库服务
  if (includeDatabase && config.docker?.compose) {
    config.docker.compose.services!.postgres = {
      image: 'postgres:15-alpine',
      environment: {
        POSTGRES_DB: name,
        POSTGRES_USER: 'postgres',
        POSTGRES_PASSWORD: 'postgres',
      },
      volumes: ['postgres-data:/var/lib/postgresql/data'],
      ports: ['5432:5432'],
      networks: ['app-network'],
      restart: 'unless-stopped',
    }

    config.docker.compose.volumes!['postgres-data'] = {}
    config.docker.compose.services!.app.depends_on!.push('postgres')
    config.docker.compose.services!.app.environment!.DATABASE_URL =
      'postgresql://postgres:postgres@postgres:5432/' + name
  }

  // 添加 Redis 服务
  if (includeRedis && config.docker?.compose) {
    config.docker.compose.services!.redis = {
      image: 'redis:7-alpine',
      ports: ['6379:6379'],
      volumes: ['redis-data:/data'],
      networks: ['app-network'],
      restart: 'unless-stopped',
    }

    config.docker.compose.volumes!['redis-data'] = {}
    config.docker.compose.services!.app.depends_on!.push('redis')
    config.docker.compose.services!.app.environment!.REDIS_URL = 'redis://redis:6379'
  }

  // 添加 Nginx 服务
  if (includeNginx && config.docker?.compose) {
    config.docker.compose.services!.nginx = {
      image: 'nginx:alpine',
      ports: ['80:80', '443:443'],
      volumes: [
        './nginx.conf:/etc/nginx/nginx.conf:ro',
        './certs:/etc/nginx/certs:ro',
      ],
      depends_on: ['app'],
      networks: ['app-network'],
      restart: 'unless-stopped',
    }
  }

  return config
}

/**
 * 获取可用的模板列表
 */
export function getAvailableTemplates(): Array<{
  id: string
  name: string
  description: string
  projectType: ProjectType
}> {
  return [
    {
      id: 'node',
      name: 'Node.js Application',
      description: 'Node.js 后端应用，支持 Express/Koa/Nest.js 等框架',
      projectType: 'node',
    },
    {
      id: 'spa',
      name: 'Single Page Application',
      description: '单页应用，支持 React/Vue/Angular 等框架',
      projectType: 'spa',
    },
    {
      id: 'static',
      name: 'Static Website',
      description: '静态网站，HTML/CSS/JS 文件',
      projectType: 'static',
    },
    {
      id: 'ssr',
      name: 'Server-Side Rendering',
      description: 'SSR 应用，支持 Next.js/Nuxt.js 等框架',
      projectType: 'ssr',
    },
    {
      id: 'fullstack',
      name: 'Full Stack (Docker Compose)',
      description: '全栈应用，包含应用、数据库、缓存、反向代理',
      projectType: 'node',
    },
  ]
}

/**
 * 根据模板 ID 创建配置
 */
export function createTemplateConfig(
  templateId: string,
  options: TemplateOptions
): DeployConfig {
  switch (templateId) {
    case 'node':
      return createNodeTemplate(options)
    case 'spa':
      return createSPATemplate(options)
    case 'static':
      return createStaticTemplate(options)
    case 'ssr':
      return createSSRTemplate(options)
    case 'fullstack':
      return createFullStackTemplate(options)
    default:
      throw new Error(`Unknown template: ${templateId}`)
  }
}

