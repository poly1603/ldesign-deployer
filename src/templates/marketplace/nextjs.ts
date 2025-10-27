/**
 * Next.js 应用模板
 * @module templates/marketplace/nextjs
 */

import type { ConfigTemplate } from '../TemplateRegistry.js';
import {
  DEFAULT_NODE_VERSION,
  DEFAULT_PORT,
  DEFAULT_REGISTRY,
  DEFAULT_IMAGE_TAG,
  DEFAULT_ENVIRONMENT,
  DEFAULT_REPLICAS,
  DEFAULT_CPU_REQUEST,
  DEFAULT_CPU_LIMIT,
  DEFAULT_MEMORY_REQUEST,
  DEFAULT_MEMORY_LIMIT,
} from '../../constants/index.js';

/**
 * Next.js 基础模板
 */
export const nextjsBasicTemplate: ConfigTemplate = {
  metadata: {
    id: 'nextjs-basic',
    name: 'Next.js 应用',
    description: 'Next.js SSR 应用的基础部署配置',
    projectType: 'ssr',
    platform: 'docker',
    tags: ['nextjs', 'react', 'ssr', 'frontend'],
    author: 'LDesign Team',
    version: '1.0.0',
    difficulty: 'beginner',
  },
  generate: (options) => ({
    name: options.name,
    version: options.version || '1.0.0',
    environment: (options.environment as any) || DEFAULT_ENVIRONMENT,
    platform: 'docker',
    projectType: 'ssr',
    docker: {
      image: options.name,
      tag: DEFAULT_IMAGE_TAG,
      registry: DEFAULT_REGISTRY,
      multiStage: true,
      buildArgs: {
        NODE_VERSION: DEFAULT_NODE_VERSION,
        NEXT_PUBLIC_API_URL: options.apiUrl || '',
      },
    },
    healthCheck: {
      enabled: true,
      path: '/api/health',
      port: options.port || DEFAULT_PORT,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
  }),
};

/**
 * Next.js + Kubernetes 模板
 */
export const nextjsK8sTemplate: ConfigTemplate = {
  metadata: {
    id: 'nextjs-k8s',
    name: 'Next.js + Kubernetes',
    description: 'Next.js 应用的生产级 Kubernetes 部署配置',
    projectType: 'ssr',
    platform: 'kubernetes',
    tags: ['nextjs', 'react', 'kubernetes', 'ssr', 'production'],
    author: 'LDesign Team',
    version: '1.0.0',
    difficulty: 'intermediate',
  },
  generate: (options) => ({
    name: options.name,
    version: options.version || '1.0.0',
    environment: (options.environment as any) || 'production',
    platform: 'kubernetes',
    projectType: 'ssr',
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
            memory: options.memoryRequest || '256Mi', // Next.js needs more memory
          },
          limits: {
            cpu: options.cpuLimit || DEFAULT_CPU_LIMIT,
            memory: options.memoryLimit || '1Gi',
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
      path: '/api/health',
      port: options.port || DEFAULT_PORT,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
    env: [
      {
        name: 'NODE_ENV',
        value: 'production',
      },
      ...(options.apiUrl ? [{
        name: 'NEXT_PUBLIC_API_URL',
        value: options.apiUrl,
      }] : []),
    ],
  }),
};

/**
 * 所有 Next.js 模板
 */
export const nextjsTemplates = [
  nextjsBasicTemplate,
  nextjsK8sTemplate,
];

