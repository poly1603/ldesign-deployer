/**
 * Vue.js 应用模板
 * @module templates/marketplace/vue
 */

import type { ConfigTemplate } from '../TemplateRegistry.js';
import {
  DEFAULT_NODE_VERSION,
  DEFAULT_HTTP_PORT,
  DEFAULT_NGINX_ROOT,
  DEFAULT_REGISTRY,
  DEFAULT_IMAGE_TAG,
  DEFAULT_ENVIRONMENT,
} from '../../constants/index.js';

/**
 * Vue SPA 基础模板
 */
export const vueSpaTemplate: ConfigTemplate = {
  metadata: {
    id: 'vue-spa',
    name: 'Vue.js SPA',
    description: 'Vue.js 单页应用的 Nginx 部署配置',
    projectType: 'spa',
    platform: 'docker',
    tags: ['vue', 'spa', 'frontend', 'nginx'],
    author: 'LDesign Team',
    version: '1.0.0',
    difficulty: 'beginner',
  },
  generate: (options) => ({
    name: options.name,
    version: options.version || '1.0.0',
    environment: (options.environment as any) || DEFAULT_ENVIRONMENT,
    platform: 'docker',
    projectType: 'spa',
    docker: {
      image: options.name,
      tag: DEFAULT_IMAGE_TAG,
      registry: DEFAULT_REGISTRY,
      multiStage: true,
      buildArgs: {
        NODE_VERSION: DEFAULT_NODE_VERSION,
        VUE_APP_API_URL: options.apiUrl || '',
      },
    },
    healthCheck: {
      enabled: true,
      path: '/',
      port: DEFAULT_HTTP_PORT,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
  }),
};

/**
 * Vue + Kubernetes 模板
 */
export const vueK8sTemplate: ConfigTemplate = {
  metadata: {
    id: 'vue-k8s',
    name: 'Vue.js + Kubernetes',
    description: 'Vue.js SPA 的 Kubernetes 部署配置（Nginx 服务）',
    projectType: 'spa',
    platform: 'kubernetes',
    tags: ['vue', 'spa', 'kubernetes', 'nginx', 'production'],
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
      tag: options.version || DEFAULT_IMAGE_TAG,
      registry: options.registry || DEFAULT_REGISTRY,
      multiStage: true,
    },
    kubernetes: {
      namespace: options.namespace || 'default',
      deployment: {
        replicas: options.replicas || 2,
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
      },
      service: {
        type: 'ClusterIP',
        port: 80,
        targetPort: DEFAULT_HTTP_PORT,
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
      path: '/',
      port: DEFAULT_HTTP_PORT,
      interval: 30,
      timeout: 5,
      retries: 3,
    },
  }),
};

/**
 * 所有 Vue 模板
 */
export const vueTemplates = [
  vueSpaTemplate,
  vueK8sTemplate,
];

