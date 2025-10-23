/**
 * Kubernetes 相关类型定义
 */

/**
 * K8s 资源类型
 */
export type K8sResourceType = 'Deployment' | 'Service' | 'Ingress' | 'ConfigMap' | 'Secret' | 'HPA' | 'VPA'

/**
 * K8s 部署选项
 */
export interface K8sDeployOptions {
  namespace: string
  context?: string
  dryRun?: boolean
  wait?: boolean
  timeout?: number
}

/**
 * K8s Deployment 规范
 */
export interface K8sDeploymentSpec {
  replicas: number
  selector: {
    matchLabels: Record<string, string>
  }
  template: {
    metadata: {
      labels: Record<string, string>
      annotations?: Record<string, string>
    }
    spec: {
      containers: K8sContainer[]
      volumes?: K8sVolume[]
      imagePullSecrets?: { name: string }[]
    }
  }
  strategy?: {
    type: 'RollingUpdate' | 'Recreate'
    rollingUpdate?: {
      maxSurge: number | string
      maxUnavailable: number | string
    }
  }
}

/**
 * K8s 容器配置
 */
export interface K8sContainer {
  name: string
  image: string
  imagePullPolicy?: 'Always' | 'IfNotPresent' | 'Never'
  ports?: K8sPort[]
  env?: K8sEnvVar[]
  envFrom?: K8sEnvFrom[]
  volumeMounts?: K8sVolumeMount[]
  resources?: {
    requests?: Record<string, string>
    limits?: Record<string, string>
  }
  livenessProbe?: K8sProbe
  readinessProbe?: K8sProbe
  startupProbe?: K8sProbe
  command?: string[]
  args?: string[]
}

/**
 * K8s 端口配置
 */
export interface K8sPort {
  name?: string
  containerPort: number
  protocol?: 'TCP' | 'UDP'
}

/**
 * K8s 环境变量
 */
export interface K8sEnvVar {
  name: string
  value?: string
  valueFrom?: {
    configMapKeyRef?: {
      name: string
      key: string
    }
    secretKeyRef?: {
      name: string
      key: string
    }
    fieldRef?: {
      fieldPath: string
    }
  }
}

/**
 * K8s 环境变量来源
 */
export interface K8sEnvFrom {
  configMapRef?: {
    name: string
  }
  secretRef?: {
    name: string
  }
}

/**
 * K8s 卷挂载
 */
export interface K8sVolumeMount {
  name: string
  mountPath: string
  subPath?: string
  readOnly?: boolean
}

/**
 * K8s 卷
 */
export interface K8sVolume {
  name: string
  configMap?: {
    name: string
  }
  secret?: {
    secretName: string
  }
  persistentVolumeClaim?: {
    claimName: string
  }
  emptyDir?: {}
  hostPath?: {
    path: string
    type?: string
  }
}

/**
 * K8s 探针
 */
export interface K8sProbe {
  httpGet?: {
    path: string
    port: number | string
    scheme?: 'HTTP' | 'HTTPS'
    httpHeaders?: Array<{ name: string; value: string }>
  }
  exec?: {
    command: string[]
  }
  tcpSocket?: {
    port: number | string
  }
  initialDelaySeconds?: number
  periodSeconds?: number
  timeoutSeconds?: number
  successThreshold?: number
  failureThreshold?: number
}

/**
 * K8s Service 规范
 */
export interface K8sServiceSpec {
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName'
  selector: Record<string, string>
  ports: K8sServicePort[]
  clusterIP?: string
  externalIPs?: string[]
  sessionAffinity?: 'ClientIP' | 'None'
}

/**
 * K8s Service 端口
 */
export interface K8sServicePort {
  name?: string
  protocol?: 'TCP' | 'UDP'
  port: number
  targetPort: number | string
  nodePort?: number
}

/**
 * K8s Ingress 规范
 */
export interface K8sIngressSpec {
  ingressClassName?: string
  rules: K8sIngressRule[]
  tls?: K8sIngressTLS[]
}

/**
 * K8s Ingress 规则
 */
export interface K8sIngressRule {
  host?: string
  http: {
    paths: K8sIngressPath[]
  }
}

/**
 * K8s Ingress 路径
 */
export interface K8sIngressPath {
  path: string
  pathType: 'Prefix' | 'Exact' | 'ImplementationSpecific'
  backend: {
    service: {
      name: string
      port: {
        number: number
      }
    }
  }
}

/**
 * K8s Ingress TLS
 */
export interface K8sIngressTLS {
  hosts: string[]
  secretName: string
}

/**
 * Helm Chart 配置
 */
export interface HelmChartConfig {
  apiVersion: string
  name: string
  version: string
  description?: string
  type?: 'application' | 'library'
  keywords?: string[]
  home?: string
  sources?: string[]
  dependencies?: HelmDependency[]
  maintainers?: HelmMaintainer[]
}

/**
 * Helm 依赖
 */
export interface HelmDependency {
  name: string
  version: string
  repository?: string
  condition?: string
  tags?: string[]
}

/**
 * Helm 维护者
 */
export interface HelmMaintainer {
  name: string
  email?: string
  url?: string
}

/**
 * HPA 配置
 */
export interface HPAConfig {
  minReplicas: number
  maxReplicas: number
  metrics: HPAMetric[]
  behavior?: {
    scaleUp?: HPABehavior
    scaleDown?: HPABehavior
  }
}

/**
 * HPA 指标
 */
export interface HPAMetric {
  type: 'Resource' | 'Pods' | 'Object' | 'External'
  resource?: {
    name: string
    target: {
      type: 'Utilization' | 'AverageValue'
      averageUtilization?: number
      averageValue?: string
    }
  }
}

/**
 * HPA 行为
 */
export interface HPABehavior {
  stabilizationWindowSeconds?: number
  policies?: Array<{
    type: 'Percent' | 'Pods'
    value: number
    periodSeconds: number
  }>
}




