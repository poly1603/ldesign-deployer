/**
 * Express.js 应用模板
 * @module templates/marketplace/express
 */

import type { ConfigTemplate } from '../TemplateRegistry.js';
import type { DeployConfig } from '../../types/index.js';
import {
  DEFAULT_NODE_VERSION,
  DEFAULT_PORT,
  DEFAULT_REGISTRY,
  DEFAULT_IMAGE_TAG,
  DEFAULT_HEALTH_PATH,
  DEFAULT_ENVIRONMENT,
  DEFAULT_PLATFORM,
  DEFAULT_REPLICAS,
  DEFAULT_CPU_REQUEST,
  DEFAULT_CPU_LIMIT,
  DEFAULT_MEMORY_REQUEST,
  DEFAULT_MEMORY_LIMIT,
} from '../../constants/index.js';

/**
 * Express.js 基础模板
 */
export const expressBasicTemplate: ConfigTemplate = {
  metadata: {
    id: 'express-basic',
    name: 'Express.js 基础应用',
    description: 'Express.js 应用的基础部署配置，适合简单的 REST API 服务',
    projectType: 'node',
    platform: 'docker',
    tags: ['express', 'node', 'rest-api', 'backend'],
    author: 'LDesign Team',
    version: '1.0.0',
    difficulty: 'beginner',
  },
  generate: (options) => ({
    name: options.name,
    version: options.version || '1.0.0',
    environment: (options.environment as any) || DEFAULT_ENVIRONMENT,
    platform: DEFAULT_PLATFORM,
    projectType: 'node',
    docker: {
      image: options.name,
      tag: DEFAULT_IMAGE_TAG,
      registry: DEFAULT_REGISTRY,
      multiStage: true,
      buildArgs: {
        NODE_VERSION: DEFAULT_NODE_VERSION,
      },
    },
    healthCheck: {
      enabled: true,
      path: options.healthPath || DEFAULT_HEALTH_PATH,
      port: options.port || DEFAULT_PORT,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
  }),
};

/**
 * Express.js + Kubernetes 模板
 */
export const expressK8sTemplate: ConfigTemplate = {
  metadata: {
    id: 'express-k8s',
    name: 'Express.js + Kubernetes',
    description: 'Express.js 应用的 Kubernetes 部署配置，包含完整的 K8s 资源定义',
    projectType: 'node',
    platform: 'kubernetes',
    tags: ['express', 'node', 'kubernetes', 'k8s', 'production'],
    author: 'LDesign Team',
    version: '1.0.0',
    difficulty: 'intermediate',
  },
  generate: (options) => ({
    name: options.name,
    version: options.version || '1.0.0',
    environment: (options.environment as any) || 'production',
    platform: 'kubernetes',
    projectType: 'node',
    docker: {
      image: options.name,
      tag: options.version || DEFAULT_IMAGE_TAG,
      registry: options.registry || DEFAULT_REGISTRY,
      multiStage: true,
    },
    kubernetes: {
      namespace: options.namespace || 'default',
      deployment: {
        replicas: options.replicas || DEFAULT_REPLICAS,
        resources: {
          requests: {
            cpu: options.cpuRequest || DEFAULT_CPU_REQUEST,
            memory: options.memoryRequest || DEFAULT_MEMORY_REQUEST,
          },
          limits: {
            cpu: options.cpuLimit || DEFAULT_CPU_LIMIT,
            memory: options.memoryLimit || DEFAULT_MEMORY_LIMIT,
          },
        },
      },
      service: {
        type: 'ClusterIP',
        port: 80,
        targetPort: options.port || DEFAULT_PORT,
      },
      ingress: {
        enabled: !!options.domain,
        host: options.domain,
        tls: options.tlsEnabled ? {
          enabled: true,
          secretName: `${options.name}-tls`,
        } : undefined,
      },
    },
    healthCheck: {
      enabled: true,
      path: options.healthPath || DEFAULT_HEALTH_PATH,
      port: options.port || DEFAULT_PORT,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
  }),
};

/**
 * Express.js 全栈模板（带数据库）
 */
export const expressFullstackTemplate: ConfigTemplate = {
  metadata: {
    id: 'express-fullstack',
    name: 'Express.js 全栈应用',
    description: 'Express.js + PostgreSQL/MongoDB 的全栈部署配置',
    projectType: 'fullstack',
    platform: 'docker-compose',
    tags: ['express', 'node', 'fullstack', 'database', 'postgres', 'mongodb'],
    author: 'LDesign Team',
    version: '1.0.0',
    difficulty: 'intermediate',
  },
  generate: (options) => ({
    name: options.name,
    version: options.version || '1.0.0',
    environment: (options.environment as any) || DEFAULT_ENVIRONMENT,
    platform: 'docker-compose',
    projectType: 'node',
    docker: {
      image: options.name,
      tag: DEFAULT_IMAGE_TAG,
      registry: DEFAULT_REGISTRY,
      multiStage: true,
      compose: {
        services: {
          app: {
            image: `${options.name}:${DEFAULT_IMAGE_TAG}`,
            build: {
              context: '.',
              dockerfile: 'Dockerfile',
            },
            ports: [`${options.port || DEFAULT_PORT}:${options.port || DEFAULT_PORT}`],
            environment: {
              NODE_ENV: options.environment || 'production',
              DATABASE_URL: options.database === 'mongodb'
                ? 'mongodb://mongo:27017/app'
                : 'postgresql://postgres:postgres@postgres:5432/app',
            },
            depends_on: [options.database || 'postgres'],
            restart: 'unless-stopped',
          },
          ...(options.database === 'mongodb' ? {
            mongo: {
              image: 'mongo:latest',
              ports: ['27017:27017'],
              volumes: ['mongo-data:/data/db'],
              restart: 'unless-stopped',
            },
          } : {
            postgres: {
              image: 'postgres:15-alpine',
              ports: ['5432:5432'],
              environment: {
                POSTGRES_USER: 'postgres',
                POSTGRES_PASSWORD: 'postgres',
                POSTGRES_DB: 'app',
              },
              volumes: ['postgres-data:/var/lib/postgresql/data'],
              restart: 'unless-stopped',
            },
          }),
        },
        volumes: options.database === 'mongodb'
          ? { 'mongo-data': {} }
          : { 'postgres-data': {} },
      },
    },
    healthCheck: {
      enabled: true,
      path: DEFAULT_HEALTH_PATH,
      port: options.port || DEFAULT_PORT,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
  }),
};

/**
 * 所有 Express 模板
 */
export const expressTemplates = [
  expressBasicTemplate,
  expressK8sTemplate,
  expressFullstackTemplate,
];

