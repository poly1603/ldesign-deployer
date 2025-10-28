/**
 * React 模板
 * @module templates/marketplace/react
 */

import type { ConfigTemplate } from '../TemplateRegistry.js';

/**
 * React SPA 基础模板
 */
const reactSpaTemplate: ConfigTemplate = {
  metadata: {
    id: 'react-spa',
    name: 'React SPA 模板',
    description: 'React 单页应用的静态部署配置',
    projectType: 'spa',
    platform: 'docker',
    tags: ['react', 'spa', 'frontend', 'nginx'],
    author: 'LDesign Team',
    version: '1.0.0',
    difficulty: 'beginner',
  },
  generate: (options) => ({
    name: options.name,
    version: options.version || '1.0.0',
    environment: (options.environment as any) || 'production',
    platform: 'docker',
    projectType: 'spa',
    docker: {
      image: options.name,
      tag: options.version || 'latest',
      registry: 'docker.io',
      multiStage: true,
      buildArgs: {
        NODE_VERSION: '20-alpine',
        NGINX_VERSION: 'alpine',
      },
    },
    healthCheck: {
      enabled: true,
      path: '/',
      port: 80,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
  }),
};

/**
 * React Kubernetes 模板
 */
const reactK8sTemplate: ConfigTemplate = {
  metadata: {
    id: 'react-k8s',
    name: 'React Kubernetes 模板',
    description: 'React 应用的 Kubernetes 部署配置',
    projectType: 'spa',
    platform: 'kubernetes',
    tags: ['react', 'spa', 'frontend', 'kubernetes', 'nginx'],
    author: 'LDesign Team',
    version: '1.0.0',
    difficulty: 'intermediate',
  },
  generate: (options) => ({
    name: options.name,
    version: options.version || '1.0.0',
    environment: (options.environment as any) || 'production',
    platform: 'kubernetes',
    projectType: 'spa',
    docker: {
      image: options.name,
      tag: options.version || 'latest',
      registry: options.registry || 'docker.io',
      multiStage: true,
    },
    kubernetes: {
      namespace: options.namespace || 'default',
      deployment: {
        replicas: options.replicas || 2,
        resources: {
          requests: { cpu: '50m', memory: '64Mi' },
          limits: { cpu: '200m', memory: '128Mi' },
        },
      },
      service: {
        type: 'ClusterIP',
        port: 80,
        targetPort: 80,
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
      path: '/',
      port: 80,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
  }),
};

/**
 * React + Vite 模板
 */
const reactViteTemplate: ConfigTemplate = {
  metadata: {
    id: 'react-vite',
    name: 'React + Vite 模板',
    description: 'React + Vite 应用的部署配置',
    projectType: 'spa',
    platform: 'docker',
    tags: ['react', 'vite', 'spa', 'frontend'],
    author: 'LDesign Team',
    version: '1.0.0',
    difficulty: 'beginner',
  },
  generate: (options) => ({
    name: options.name,
    version: options.version || '1.0.0',
    environment: (options.environment as any) || 'production',
    platform: 'docker',
    projectType: 'spa',
    docker: {
      image: options.name,
      tag: options.version || 'latest',
      registry: 'docker.io',
      multiStage: true,
      buildArgs: {
        NODE_VERSION: '20-alpine',
        BUILD_COMMAND: 'pnpm build',
      },
    },
    healthCheck: {
      enabled: true,
      path: '/',
      port: 80,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
  }),
};

export const reactTemplates = [
  reactSpaTemplate,
  reactK8sTemplate,
  reactViteTemplate,
];
