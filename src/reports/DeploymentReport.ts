/**
 * 部署报告生成器
 * 生成 HTML 和 Markdown 格式的部署摘要
 */

import type { DeployResult, DeployConfig } from '../types/index.js'
import { writeFile } from '../utils/file-system.js'
import { logger } from '../utils/logger.js'

export interface ReportOptions {
  format?: 'markdown' | 'html' | 'both'
  outputDir?: string
  includeConfig?: boolean
  includeMetrics?: boolean
}

export interface DeploymentMetrics {
  totalDuration: number
  phases: Array<{
    name: string
    duration: number
    percentage: number
  }>
  resourceUsage?: {
    cpu?: string
    memory?: string
  }
}

export class DeploymentReport {
  /**
   * 生成部署报告
   */
  async generate(
    result: DeployResult,
    config: DeployConfig,
    metrics?: DeploymentMetrics,
    options: ReportOptions = {}
  ): Promise<void> {
    const {
      format = 'both',
      outputDir = '.',
      includeConfig = true,
      includeMetrics = true,
    } = options

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    if (format === 'markdown' || format === 'both') {
      const markdown = this.generateMarkdown(result, config, metrics, includeConfig, includeMetrics)
      const filename = `${outputDir}/deployment-report-${timestamp}.md`
      await writeFile(filename, markdown)
      logger.success(`📄 Markdown 报告已生成: ${filename}`)
    }

    if (format === 'html' || format === 'both') {
      const html = this.generateHTML(result, config, metrics, includeConfig, includeMetrics)
      const filename = `${outputDir}/deployment-report-${timestamp}.html`
      await writeFile(filename, html)
      logger.success(`📄 HTML 报告已生成: ${filename}`)
    }
  }

  /**
   * 生成 Markdown 报告
   */
  private generateMarkdown(
    result: DeployResult,
    config: DeployConfig,
    metrics?: DeploymentMetrics,
    includeConfig = true,
    includeMetrics = true
  ): string {
    const lines: string[] = []

    // 标题
    lines.push(`# 部署报告`)
    lines.push('')
    lines.push(`**应用名称**: ${config.name}`)
    lines.push(`**版本**: ${config.version || result.version}`)
    lines.push(`**环境**: ${config.environment}`)
    lines.push(`**平台**: ${config.platform}`)
    lines.push(`**状态**: ${result.success ? '✅ 成功' : '❌ 失败'}`)
    lines.push(`**时间**: ${result.timestamp}`)
    lines.push('')

    // 部署信息
    lines.push(`## 📋 部署信息`)
    lines.push('')
    lines.push(`- **部署 ID**: ${result.deploymentId || 'N/A'}`)
    lines.push(`- **消息**: ${result.message}`)
    lines.push('')

    // 性能指标
    if (includeMetrics && metrics) {
      lines.push(`## 📊 性能指标`)
      lines.push('')
      lines.push(`- **总耗时**: ${(metrics.totalDuration / 1000).toFixed(2)}s`)
      lines.push('')

      if (metrics.phases && metrics.phases.length > 0) {
        lines.push(`### 阶段耗时`)
        lines.push('')
        lines.push(`| 阶段 | 耗时 | 占比 |`)
        lines.push(`|------|------|------|`)
        metrics.phases.forEach((phase) => {
          lines.push(`| ${phase.name} | ${(phase.duration / 1000).toFixed(2)}s | ${phase.percentage}% |`)
        })
        lines.push('')
      }

      if (metrics.resourceUsage) {
        lines.push(`### 资源使用`)
        lines.push('')
        if (metrics.resourceUsage.cpu) {
          lines.push(`- **CPU**: ${metrics.resourceUsage.cpu}`)
        }
        if (metrics.resourceUsage.memory) {
          lines.push(`- **内存**: ${metrics.resourceUsage.memory}`)
        }
        lines.push('')
      }
    }

    // 配置信息
    if (includeConfig) {
      lines.push(`## ⚙️ 配置信息`)
      lines.push('')

      if (config.docker) {
        lines.push(`### Docker`)
        lines.push('')
        lines.push(`- **镜像**: ${config.docker.image}:${config.docker.tag || 'latest'}`)
        if (config.docker.registry) {
          lines.push(`- **Registry**: ${config.docker.registry}`)
        }
        if (config.docker.multiStage) {
          lines.push(`- **多阶段构建**: 是`)
        }
        lines.push('')
      }

      if (config.kubernetes) {
        lines.push(`### Kubernetes`)
        lines.push('')
        lines.push(`- **命名空间**: ${config.kubernetes.namespace || 'default'}`)
        if (config.kubernetes.deployment?.replicas) {
          lines.push(`- **副本数**: ${config.kubernetes.deployment.replicas}`)
        }
        if (config.kubernetes.service) {
          lines.push(`- **服务类型**: ${config.kubernetes.service.type || 'ClusterIP'}`)
          lines.push(`- **端口**: ${config.kubernetes.service.port}:${config.kubernetes.service.targetPort}`)
        }
        lines.push('')
      }

      if (config.healthCheck?.enabled) {
        lines.push(`### 健康检查`)
        lines.push('')
        lines.push(`- **路径**: ${config.healthCheck.path || '/'}`)
        lines.push(`- **端口**: ${config.healthCheck.port}`)
        lines.push(`- **间隔**: ${config.healthCheck.interval}s`)
        lines.push(`- **超时**: ${config.healthCheck.timeout}s`)
        lines.push(`- **重试**: ${config.healthCheck.retries}`)
        lines.push('')
      }
    }

    // 页脚
    lines.push(`---`)
    lines.push('')
    lines.push(`*报告生成时间: ${new Date().toLocaleString('zh-CN')}*`)
    lines.push(`*生成工具: @ldesign/deployer*`)

    return lines.join('\n')
  }

  /**
   * 生成 HTML 报告
   */
  private generateHTML(
    result: DeployResult,
    config: DeployConfig,
    metrics?: DeploymentMetrics,
    includeConfig = true,
    includeMetrics = true
  ): string {
    const statusClass = result.success ? 'success' : 'failure'
    const statusIcon = result.success ? '✅' : '❌'
    const statusText = result.success ? '成功' : '失败'

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>部署报告 - ${config.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f7fa;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 {
      font-size: 32px;
      margin-bottom: 10px;
    }
    .status {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: bold;
      margin-top: 10px;
    }
    .status.success {
      background: #52c41a;
      color: white;
    }
    .status.failure {
      background: #f5222d;
      color: white;
    }
    .content {
      padding: 40px;
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      color: #667eea;
      font-size: 24px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e8e8e8;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    .info-card {
      background: #f5f7fa;
      padding: 20px;
      border-radius: 4px;
    }
    .info-card strong {
      display: block;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .info-card span {
      font-size: 18px;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e8e8e8;
    }
    th {
      background: #fafafa;
      font-weight: 600;
      color: #666;
    }
    .footer {
      background: #fafafa;
      padding: 20px 40px;
      text-align: center;
      color: #999;
      font-size: 14px;
      border-top: 1px solid #e8e8e8;
    }
    .metric-bar {
      height: 20px;
      background: #e8e8e8;
      border-radius: 10px;
      overflow: hidden;
      margin: 10px 0;
    }
    .metric-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s ease;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${statusIcon} 部署报告</h1>
      <div class="status ${statusClass}">${statusText}</div>
    </div>

    <div class="content">
      <div class="section">
        <h2>📋 基本信息</h2>
        <div class="info-grid">
          <div class="info-card">
            <strong>应用名称</strong>
            <span>${config.name}</span>
          </div>
          <div class="info-card">
            <strong>版本</strong>
            <span>${config.version || result.version || 'N/A'}</span>
          </div>
          <div class="info-card">
            <strong>环境</strong>
            <span>${config.environment}</span>
          </div>
          <div class="info-card">
            <strong>平台</strong>
            <span>${config.platform}</span>
          </div>
          <div class="info-card">
            <strong>部署 ID</strong>
            <span>${result.deploymentId || 'N/A'}</span>
          </div>
          <div class="info-card">
            <strong>时间</strong>
            <span>${new Date(result.timestamp).toLocaleString('zh-CN')}</span>
          </div>
        </div>
        <p><strong>消息:</strong> ${result.message}</p>
      </div>

      ${includeMetrics && metrics ? `
      <div class="section">
        <h2>📊 性能指标</h2>
        <div class="info-card">
          <strong>总耗时</strong>
          <span>${(metrics.totalDuration / 1000).toFixed(2)} 秒</span>
        </div>
        ${metrics.phases && metrics.phases.length > 0 ? `
        <h3 style="margin-top: 20px; margin-bottom: 10px;">阶段耗时</h3>
        <table>
          <thead>
            <tr>
              <th>阶段</th>
              <th>耗时</th>
              <th>占比</th>
              <th>可视化</th>
            </tr>
          </thead>
          <tbody>
            ${metrics.phases.map(phase => `
            <tr>
              <td>${phase.name}</td>
              <td>${(phase.duration / 1000).toFixed(2)}s</td>
              <td>${phase.percentage}%</td>
              <td>
                <div class="metric-bar">
                  <div class="metric-bar-fill" style="width: ${phase.percentage}%"></div>
                </div>
              </td>
            </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}
      </div>
      ` : ''}

      ${includeConfig ? `
      <div class="section">
        <h2>⚙️ 配置信息</h2>
        ${config.docker ? `
        <h3>Docker</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>镜像:</strong> ${config.docker.image}:${config.docker.tag || 'latest'}</li>
          ${config.docker.registry ? `<li><strong>Registry:</strong> ${config.docker.registry}</li>` : ''}
          ${config.docker.multiStage ? `<li><strong>多阶段构建:</strong> 是</li>` : ''}
        </ul>
        ` : ''}

        ${config.kubernetes ? `
        <h3 style="margin-top: 20px;">Kubernetes</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>命名空间:</strong> ${config.kubernetes.namespace || 'default'}</li>
          ${config.kubernetes.deployment?.replicas ? `<li><strong>副本数:</strong> ${config.kubernetes.deployment.replicas}</li>` : ''}
          ${config.kubernetes.service ? `
            <li><strong>服务类型:</strong> ${config.kubernetes.service.type || 'ClusterIP'}</li>
            <li><strong>端口:</strong> ${config.kubernetes.service.port}:${config.kubernetes.service.targetPort}</li>
          ` : ''}
        </ul>
        ` : ''}

        ${config.healthCheck?.enabled ? `
        <h3 style="margin-top: 20px;">健康检查</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>路径:</strong> ${config.healthCheck.path || '/'}</li>
          <li><strong>端口:</strong> ${config.healthCheck.port}</li>
          <li><strong>间隔:</strong> ${config.healthCheck.interval}s</li>
          <li><strong>超时:</strong> ${config.healthCheck.timeout}s</li>
          <li><strong>重试:</strong> ${config.healthCheck.retries}</li>
        </ul>
        ` : ''}
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <p>报告生成时间: ${new Date().toLocaleString('zh-CN')}</p>
      <p>生成工具: @ldesign/deployer</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }
}

/**
 * 快速生成报告
 */
export async function generateReport(
  result: DeployResult,
  config: DeployConfig,
  metrics?: DeploymentMetrics,
  options?: ReportOptions
): Promise<void> {
  const report = new DeploymentReport()
  await report.generate(result, config, metrics, options)
}

