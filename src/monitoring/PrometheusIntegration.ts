/**
 * Prometheus 监控集成
 */

import { writeFile, ensureDir } from '../utils/file-system.js'
import { logger } from '../utils/logger.js'
import { join } from 'path'

export class PrometheusIntegration {
  /**
   * 生成 Prometheus 配置
   */
  async generateConfig(appName: string, outputDir = './monitoring'): Promise<void> {
    logger.info('Generating Prometheus configuration...')

    await ensureDir(outputDir)

    // prometheus.yml
    const prometheusConfig = this.getPrometheusConfig(appName)
    await writeFile(join(outputDir, 'prometheus.yml'), prometheusConfig)

    // alerting rules
    const alertRules = this.getAlertRules(appName)
    await writeFile(join(outputDir, 'alert-rules.yml'), alertRules)

    logger.success('Prometheus configuration generated')
  }

  /**
   * Prometheus 配置
   */
  private getPrometheusConfig(appName: string): string {
    return `global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - "alert-rules.yml"

scrape_configs:
  - job_name: '${appName}'
    static_configs:
      - targets: ['${appName}:3000']
        labels:
          app: ${appName}
          environment: production

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
`
  }

  /**
   * 告警规则
   */
  private getAlertRules(appName: string): string {
    return `groups:
  - name: ${appName}_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5% for 5 minutes"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "95th percentile latency is above 1 second"

      - alert: ServiceDown
        expr: up{job="${appName}"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "Service {{ $labels.instance }} is down"
`
  }

  /**
   * 生成 Grafana Dashboard JSON
   */
  generateGrafanaDashboard(appName: string): string {
    return JSON.stringify({
      dashboard: {
        title: `${appName} Dashboard`,
        panels: [
          {
            title: 'Request Rate',
            targets: [{
              expr: `rate(http_requests_total{app="${appName}"}[5m])`,
            }],
          },
          {
            title: 'Error Rate',
            targets: [{
              expr: `rate(http_requests_total{app="${appName}",status=~"5.."}[5m])`,
            }],
          },
          {
            title: 'Response Time (p95)',
            targets: [{
              expr: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{app="${appName}"}[5m]))`,
            }],
          },
        ],
      },
    }, null, 2)
  }
}




