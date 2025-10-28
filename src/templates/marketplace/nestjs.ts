/**
 * NestJS 模板
 * @module templates/marketplace/nestjs
 */

import type { ConfigTemplate } from '../TemplateRegistry.js';

/**
 * NestJS 基础 Docker 模板
 */
const nestjsBasicTemplate: ConfigTemplate = {
  metadata: {
    id: 'nestjs-basic',
    name: 'NestJS 基础模板',
    description: 'NestJS 应用的 Docker 部署配置',
    projectType: 'node',
    platform: 'docker',
    tags: ['nestjs', 'node', 'typescript', 'backend'],
    author: 'LDesign Team',
    version: '1.0.0',
    difficulty: 'beginner',
  },
  generate: (options) => ({
    name: options.name,
    version: options.version || '1.0.0',
    environment: (options.environment as any) || 'production',
    platform: 'docker',
    projectType: 'node',
    docker: {
      image: options.name,
      tag: options.version || 'latest',
      registry: 'docker.io',
      multiStage: true,
      buildArgs: {
        NODE_VERSION: '20-alpine',
      },
    },
    healthCheck: {
      enabled: true,
      path: '/health',
      port: options.port || 3000,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
  }),
};

/**
 * NestJS Kubernetes 模板
 */
const nestjsK8sTemplate: ConfigTemplate = {
  metadata: {
    id: 'nestjs-k8s',
    name: 'NestJS Kubernetes 模板',
    description: 'NestJS 应用的 Kubernetes 部署配置',
    projectType: 'node',
    platform: 'kubernetes',
    tags: ['nestjs', 'node', 'typescript', 'backend', 'kubernetes'],
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
      tag: options.version || 'latest',
      registry: options.registry || 'docker.io',
      multiStage: true,
    },
    kubernetes: {
      namespace: options.namespace || 'default',
      deployment: {
        replicas: options.replicas || 3,
        resources: {
          requests: { cpu: '200m', memory: '256Mi' },
          limits: { cpu: '1000m', memory: '512Mi' },
        },
      },
      service: {
        type: 'ClusterIP',
        port: 80,
        targetPort: options.port || 3000,
      },
      ingress: {
        enabled: !!options.domain,
        host: options.domain,
        tls: options.tls ? {
          enabled: true,
          secretName: `${options.name}-tls`,
        } : undefined,
      },
    },
    healthCheck: {
      enabled: true,
      path: '/health',
      port: options.port || 3000,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
  }),
};

/**
 * NestJS 微服务模板
 */
const nestjsMicroserviceTemplate: ConfigTemplate = {
  metadata: {
    id: 'nestjs-microservice',
    name: 'NestJS 微服务模板',
    description: 'NestJS 微服务架构部署配置（包含 Redis/RabbitMQ）',
    projectType: 'node',
    platform: 'docker-compose',
    tags: ['nestjs', 'microservice', 'redis', 'rabbitmq', 'postgres'],
    author: 'LDesign Team',
    version: '1.0.0',
    difficulty: 'advanced',
  },
  generate: (options) => ({
    name: options.name,
    version: options.version || '1.0.0',
    environment: (options.environment as any) || 'production',
    platform: 'docker-compose',
    projectType: 'node',
    docker: {
      image: options.name,
      tag: options.version || 'latest',
      multiStage: true,
      compose: {
        services: {
          app: {
            image: `${options.name}:${options.version || 'latest'}`,
            build: {
              context: '.',
              dockerfile: 'Dockerfile',
            },
            ports: [`${options.port || 3000}:3000`],
            environment: {
              NODE_ENV: 'production',
              REDIS_HOST: 'redis',
              REDIS_PORT: '6379',
              RABBITMQ_HOST: 'rabbitmq',
              POSTGRES_HOST: 'postgres',
            },
            depends_on: ['redis', 'rabbitmq', 'postgres'],
            restart: 'unless-stopped',
          },
          redis: {
            image: 'redis:7-alpine',
            ports: ['6379:6379'],
            restart: 'unless-stopped',
          },
          rabbitmq: {
            image: 'rabbitmq:3-management-alpine',
            ports: ['5672:5672', '15672:15672'],
            environment: {
              RABBITMQ_DEFAULT_USER: 'admin',
              RABBITMQ_DEFAULT_PASS: 'admin123',
            },
            restart: 'unless-stopped',
          },
          postgres: {
            image: 'postgres:16-alpine',
            ports: ['5432:5432'],
            environment: {
              POSTGRES_USER: 'app',
              POSTGRES_PASSWORD: 'password',
              POSTGRES_DB: options.name,
            },
            volumes: ['postgres-data:/var/lib/postgresql/data'],
            restart: 'unless-stopped',
          },
        },
        volumes: {
          'postgres-data': {},
        },
      },
    },
    healthCheck: {
      enabled: true,
      path: '/health',
      port: options.port || 3000,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
  }),
};

export const nestjsTemplates = [
  nestjsBasicTemplate,
  nestjsK8sTemplate,
  nestjsMicroserviceTemplate,
];
