/**
 * Kubernetes 清单生成器
 */

import { toYaml } from '../utils/template-engine.js'
import { logger } from '../utils/logger.js'
import type {
  K8sDeploymentSpec,
  K8sServiceSpec,
  K8sIngressSpec,
  K8sContainer,
  DeployConfig,
} from '../types/index.js'

export class ManifestGenerator {
  /**
   * 生成 Deployment 清单
   */
  generateDeployment(config: DeployConfig): string {
    const name = config.name
    const namespace = config.kubernetes?.namespace || 'default'
    const replicas = config.kubernetes?.deployment?.replicas || 3
    const image = `${config.docker?.image || name}:${config.version}`

    const labels = {
      app: name,
      version: config.version,
      environment: config.environment,
    }

    const container: K8sContainer = {
      name,
      image,
      imagePullPolicy: 'IfNotPresent',
      ports: config.healthCheck?.port ? [{
        name: 'http',
        containerPort: config.healthCheck.port,
        protocol: 'TCP',
      }] : undefined,
      env: this.generateEnvVars(config),
      resources: config.kubernetes?.deployment?.resources,
      livenessProbe: config.kubernetes?.deployment?.livenessProbe,
      readinessProbe: config.kubernetes?.deployment?.readinessProbe,
      startupProbe: config.kubernetes?.deployment?.startupProbe,
    }

    const spec: K8sDeploymentSpec = {
      replicas,
      selector: {
        matchLabels: { app: name },
      },
      template: {
        metadata: {
          labels,
        },
        spec: {
          containers: [container],
        },
      },
      strategy: config.kubernetes?.deployment?.strategy,
    }

    const deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name,
        namespace,
        labels,
      },
      spec,
    }

    return this.toYamlString(deployment)
  }

  /**
   * 生成 Service 清单
   */
  generateService(config: DeployConfig): string {
    const name = config.name
    const namespace = config.kubernetes?.namespace || 'default'
    const port = config.healthCheck?.port || 3000

    const labels = {
      app: name,
    }

    const spec: K8sServiceSpec = {
      type: config.kubernetes?.service?.type || 'ClusterIP',
      selector: { app: name },
      ports: [{
        name: 'http',
        protocol: 'TCP',
        port: config.kubernetes?.service?.port || 80,
        targetPort: config.kubernetes?.service?.targetPort || port,
      }],
    }

    const service = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name,
        namespace,
        labels,
      },
      spec,
    }

    return this.toYamlString(service)
  }

  /**
   * 生成 Ingress 清单
   */
  generateIngress(config: DeployConfig): string | null {
    if (!config.kubernetes?.ingress?.enabled) {
      return null
    }

    const name = config.name
    const namespace = config.kubernetes.namespace || 'default'
    const host = config.kubernetes.ingress.host || `${name}.example.com`
    const path = config.kubernetes.ingress.path || '/'

    const spec: K8sIngressSpec = {
      ingressClassName: config.kubernetes.ingress.className || 'nginx',
      rules: [{
        host,
        http: {
          paths: [{
            path,
            pathType: 'Prefix',
            backend: {
              service: {
                name,
                port: {
                  number: config.kubernetes.service?.port || 80,
                },
              },
            },
          }],
        },
      }],
    }

    // TLS 配置
    if (config.kubernetes.ingress.tls?.enabled) {
      spec.tls = [{
        hosts: [host],
        secretName: config.kubernetes.ingress.tls.secretName || `${name}-tls`,
      }]
    }

    const ingress = {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name,
        namespace,
        annotations: config.kubernetes.ingress.annotations || {},
      },
      spec,
    }

    return this.toYamlString(ingress)
  }

  /**
   * 生成 ConfigMap 清单
   */
  generateConfigMap(name: string, data: Record<string, string>, namespace = 'default'): string {
    const configMap = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name,
        namespace,
      },
      data,
    }

    return this.toYamlString(configMap)
  }

  /**
   * 生成 Secret 清单
   */
  generateSecret(name: string, data: Record<string, string>, namespace = 'default'): string {
    // Base64 编码 secret 数据
    const encodedData: Record<string, string> = {}
    for (const [key, value] of Object.entries(data)) {
      encodedData[key] = Buffer.from(value).toString('base64')
    }

    const secret = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name,
        namespace,
      },
      type: 'Opaque',
      data: encodedData,
    }

    return this.toYamlString(secret)
  }

  /**
   * 生成完整的 K8s 清单
   */
  generateAll(config: DeployConfig): string {
    const manifests: string[] = []

    // Deployment
    manifests.push('---')
    manifests.push(this.generateDeployment(config))

    // Service
    manifests.push('---')
    manifests.push(this.generateService(config))

    // Ingress
    if (config.kubernetes?.ingress?.enabled) {
      const ingress = this.generateIngress(config)
      if (ingress) {
        manifests.push('---')
        manifests.push(ingress)
      }
    }

    // ConfigMaps
    if (config.kubernetes?.configMaps) {
      for (const [name, data] of Object.entries(config.kubernetes.configMaps)) {
        manifests.push('---')
        manifests.push(this.generateConfigMap(name, data, config.kubernetes.namespace))
      }
    }

    // Secrets
    if (config.kubernetes?.secrets) {
      for (const [name, data] of Object.entries(config.kubernetes.secrets)) {
        manifests.push('---')
        manifests.push(this.generateSecret(name, data, config.kubernetes.namespace))
      }
    }

    return manifests.join('\n')
  }

  /**
   * 生成环境变量
   */
  private generateEnvVars(config: DeployConfig): any[] | undefined {
    if (!config.env || config.env.length === 0) {
      return undefined
    }

    return config.env.map(envVar => ({
      name: envVar.name,
      value: envVar.value,
    }))
  }

  /**
   * 转换为 YAML 字符串
   */
  private toYamlString(obj: any): string {
    return toYaml(obj, 0)
  }
}




