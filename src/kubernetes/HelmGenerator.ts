/**
 * Helm Chart 生成器
 */

import { toYaml } from '../utils/template-engine.js'
import { ensureDir, writeFile } from '../utils/file-system.js'
import { logger } from '../utils/logger.js'
import type { HelmChartConfig, DeployConfig } from '../types/index.js'
import { join } from 'path'

export class HelmGenerator {
  /**
   * 生成 Helm Chart
   */
  async generateChart(config: DeployConfig, outputDir: string): Promise<void> {
    logger.info('Generating Helm Chart...')

    const chartName = config.name
    const chartDir = join(outputDir, chartName)

    // 创建目录结构
    await ensureDir(chartDir)
    await ensureDir(join(chartDir, 'templates'))

    // 生成 Chart.yaml
    await this.generateChartYaml(chartName, config.version, chartDir)

    // 生成 values.yaml
    await this.generateValuesYaml(config, chartDir)

    // 生成模板文件
    await this.generateTemplates(config, chartDir)

    logger.success(`Helm Chart generated: ${chartDir}`)
  }

  /**
   * 生成 Chart.yaml
   */
  private async generateChartYaml(name: string, version: string, chartDir: string): Promise<void> {
    const chart: HelmChartConfig = {
      apiVersion: 'v2',
      name,
      version,
      description: `Helm chart for ${name}`,
      type: 'application',
    }

    const content = toYaml(chart, 0)
    await writeFile(join(chartDir, 'Chart.yaml'), content)
  }

  /**
   * 生成 values.yaml
   */
  private async generateValuesYaml(config: DeployConfig, chartDir: string): Promise<void> {
    const values = {
      replicaCount: config.kubernetes?.deployment?.replicas || 3,
      image: {
        repository: config.docker?.image || config.name,
        tag: config.version,
        pullPolicy: 'IfNotPresent',
      },
      service: {
        type: config.kubernetes?.service?.type || 'ClusterIP',
        port: config.kubernetes?.service?.port || 80,
      },
      ingress: {
        enabled: config.kubernetes?.ingress?.enabled || false,
        host: config.kubernetes?.ingress?.host || `${config.name}.example.com`,
      },
      resources: config.kubernetes?.deployment?.resources || {},
    }

    const content = toYaml(values, 0)
    await writeFile(join(chartDir, 'values.yaml'), content)
  }

  /**
   * 生成模板文件
   */
  private async generateTemplates(config: DeployConfig, chartDir: string): Promise<void> {
    const templatesDir = join(chartDir, 'templates')

    // deployment.yaml
    await writeFile(join(templatesDir, 'deployment.yaml'), this.getDeploymentTemplate())

    // service.yaml
    await writeFile(join(templatesDir, 'service.yaml'), this.getServiceTemplate())

    // ingress.yaml
    if (config.kubernetes?.ingress?.enabled) {
      await writeFile(join(templatesDir, 'ingress.yaml'), this.getIngressTemplate())
    }
  }

  /**
   * Deployment 模板
   */
  private getDeploymentTemplate(): string {
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "chart.fullname" . }}
  labels:
    {{- include "chart.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "chart.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "chart.selectorLabels" . | nindent 8 }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        ports:
        - name: http
          containerPort: {{ .Values.service.port }}
          protocol: TCP
        resources:
          {{- toYaml .Values.resources | nindent 12 }}`
  }

  /**
   * Service 模板
   */
  private getServiceTemplate(): string {
    return `apiVersion: v1
kind: Service
metadata:
  name: {{ include "chart.fullname" . }}
  labels:
    {{- include "chart.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
  - port: {{ .Values.service.port }}
    targetPort: http
    protocol: TCP
    name: http
  selector:
    {{- include "chart.selectorLabels" . | nindent 4 }}`
  }

  /**
   * Ingress 模板
   */
  private getIngressTemplate(): string {
    return `{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "chart.fullname" . }}
  labels:
    {{- include "chart.labels" . | nindent 4 }}
spec:
  rules:
  - host: {{ .Values.ingress.host }}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: {{ include "chart.fullname" . }}
            port:
              number: {{ .Values.service.port }}
{{- end }}`
  }
}




