/**
 * 增强版报告生成器
 * @module reports/EnhancedReportGenerator
 * 
 * @description 生成详细的部署报告，支持多种格式
 */

import { logger } from '../utils/logger.js'
import { writeFile } from '../utils/file-system.js'
import type { DeployResult } from '../types/index.js'

/**
 * 报告格式
 */
export type ReportFormat = 'json' | 'markdown' | 'html' | 'text'

/**
 * 报告配置
 */
export interface ReportConfig {
  /** 输出格式 */
  format: ReportFormat
  /** 输出文件路径 */
  outputPath?: string
  /** 是否包含详细信息 */
  includeDetails?: boolean
  /** 是否包含统计信息 */
  includeStats?: boolean
  /** 是否包含时间线 */
  includeTimeline?: boolean
}

/**
 * 部署报告数据
 */
export interface DeploymentReportData {
  /** 部署结果 */
  result: DeployResult
  /** 开始时间 */
  startTime: Date
  /** 结束时间 */
  endTime: Date
  /** 耗时（毫秒） */
  duration: number
  /** 步骤详情 */
  steps?: Array<{
    name: string
    status: 'success' | 'failed' | 'skipped'
    duration: number
    message?: string
  }>
  /** 资源使用情况 */
  resources?: {
    cpu: { avg: number; max: number }
    memory: { avg: number; max: number }
  }
  /** 错误信息 */
  errors?: string[]
  /** 警告信息 */
  warnings?: string[]
}

/**
 * 增强版报告生成器
 * 
 * @example
 * ```typescript
 * const generator = new EnhancedReportGenerator()
 * 
 * const report = await generator.generate({
 *   result: deployResult,
 *   startTime: new Date(),
 *   endTime: new Date(),
 *   duration: 45000
 * }, {
 *   format: 'html',
 *   outputPath: './reports/deployment-report.html',
 *   includeDetails: true,
 *   includeStats: true
 * })
 * ```
 */
export class EnhancedReportGenerator {
  /**
   * 生成报告
   */
  async generate(data: DeploymentReportData, config: ReportConfig): Promise<string> {
    logger.info(`Generating ${config.format.toUpperCase()} report...`)

    let content: string

    switch (config.format) {
      case 'json':
        content = this.generateJSON(data, config)
        break
      case 'markdown':
        content = this.generateMarkdown(data, config)
        break
      case 'html':
        content = this.generateHTML(data, config)
        break
      case 'text':
        content = this.generateText(data, config)
        break
      default:
        throw new Error(`Unsupported format: ${config.format}`)
    }

    // 保存到文件
    if (config.outputPath) {
      await writeFile(config.outputPath, content)
      logger.success(`Report saved to: ${config.outputPath}`)
    }

    return content
  }

  /**
   * 生成 JSON 格式报告
   */
  private generateJSON(data: DeploymentReportData, config: ReportConfig): string {
    const report: any = {
      summary: {
        success: data.result.success,
        version: data.result.version,
        environment: data.result.environment,
        platform: data.result.platform,
        duration: data.duration,
        startTime: data.startTime.toISOString(),
        endTime: data.endTime.toISOString(),
      },
    }

    if (config.includeDetails && data.steps) {
      report.steps = data.steps
    }

    if (config.includeStats && data.resources) {
      report.resources = data.resources
    }

    if (data.errors && data.errors.length > 0) {
      report.errors = data.errors
    }

    if (data.warnings && data.warnings.length > 0) {
      report.warnings = data.warnings
    }

    return JSON.stringify(report, null, 2)
  }

  /**
   * 生成 Markdown 格式报告
   */
  private generateMarkdown(data: DeploymentReportData, config: ReportConfig): string {
    const icon = data.result.success ? '✅' : '❌'
    const status = data.result.success ? '成功' : '失败'
    
    let md = `# 部署报告 ${icon}\n\n`
    md += `## 概要\n\n`
    md += `- **状态**: ${status}\n`
    md += `- **版本**: ${data.result.version || 'N/A'}\n`
    md += `- **环境**: ${data.result.environment}\n`
    md += `- **平台**: ${data.result.platform}\n`
    md += `- **耗时**: ${(data.duration / 1000).toFixed(2)} 秒\n`
    md += `- **开始时间**: ${data.startTime.toLocaleString('zh-CN')}\n`
    md += `- **结束时间**: ${data.endTime.toLocaleString('zh-CN')}\n\n`

    if (config.includeDetails && data.steps && data.steps.length > 0) {
      md += `## 部署步骤\n\n`
      md += `| 步骤 | 状态 | 耗时 | 说明 |\n`
      md += `|------|------|------|------|\n`
      data.steps.forEach(step => {
        const stepIcon = step.status === 'success' ? '✅' : step.status === 'failed' ? '❌' : '⊝'
        md += `| ${step.name} | ${stepIcon} | ${(step.duration / 1000).toFixed(2)}s | ${step.message || '-'} |\n`
      })
      md += `\n`
    }

    if (config.includeStats && data.resources) {
      md += `## 资源使用\n\n`
      md += `### CPU\n`
      md += `- 平均: ${data.resources.cpu.avg.toFixed(2)}%\n`
      md += `- 峰值: ${data.resources.cpu.max.toFixed(2)}%\n\n`
      md += `### 内存\n`
      md += `- 平均: ${data.resources.memory.avg.toFixed(2)}%\n`
      md += `- 峰值: ${data.resources.memory.max.toFixed(2)}%\n\n`
    }

    if (data.errors && data.errors.length > 0) {
      md += `## ❌ 错误\n\n`
      data.errors.forEach(error => {
        md += `- ${error}\n`
      })
      md += `\n`
    }

    if (data.warnings && data.warnings.length > 0) {
      md += `## ⚠️ 警告\n\n`
      data.warnings.forEach(warning => {
        md += `- ${warning}\n`
      })
      md += `\n`
    }

    md += `---\n\n`
    md += `*报告生成时间: ${new Date().toLocaleString('zh-CN')}*\n`

    return md
  }

  /**
   * 生成 HTML 格式报告
   */
  private generateHTML(data: DeploymentReportData, config: ReportConfig): string {
    const icon = data.result.success ? '✅' : '❌'
    const status = data.result.success ? '成功' : '失败'
    const statusColor = data.result.success ? '#4CAF50' : '#F44336'

    let html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>部署报告 - ${data.result.version || 'N/A'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #eee; }
    .header h1 { font-size: 32px; color: ${statusColor}; margin-bottom: 10px; }
    .header .status { font-size: 20px; color: #666; }
    .section { margin: 30px 0; }
    .section h2 { font-size: 24px; color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-top: 15px; }
    .info-item { padding: 15px; background: #f9f9f9; border-radius: 4px; border-left: 3px solid ${statusColor}; }
    .info-item label { display: block; font-size: 12px; color: #666; margin-bottom: 5px; }
    .info-item value { display: block; font-size: 16px; font-weight: 500; color: #333; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    table th, table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    table th { background: #f9f9f9; font-weight: 600; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: 500; }
    .badge.success { background: #E8F5E9; color: #2E7D32; }
    .badge.failed { background: #FFEBEE; color: #C62828; }
    .badge.skipped { background: #E0E0E0; color: #616161; }
    .error-list, .warning-list { list-style: none; }
    .error-list li, .warning-list li { padding: 10px; margin: 5px 0; border-radius: 4px; }
    .error-list li { background: #FFEBEE; color: #C62828; border-left: 3px solid #C62828; }
    .warning-list li { background: #FFF3E0; color: #E65100; border-left: 3px solid #E65100; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${icon} 部署${status}</h1>
      <div class="status">版本 ${data.result.version || 'N/A'} - ${data.result.environment}</div>
    </div>

    <div class="section">
      <h2>📊 概要信息</h2>
      <div class="info-grid">
        <div class="info-item">
          <label>环境</label>
          <value>${data.result.environment}</value>
        </div>
        <div class="info-item">
          <label>平台</label>
          <value>${data.result.platform}</value>
        </div>
        <div class="info-item">
          <label>耗时</label>
          <value>${(data.duration / 1000).toFixed(2)} 秒</value>
        </div>
        <div class="info-item">
          <label>开始时间</label>
          <value>${data.startTime.toLocaleString('zh-CN')}</value>
        </div>
        <div class="info-item">
          <label>结束时间</label>
          <value>${data.endTime.toLocaleString('zh-CN')}</value>
        </div>
      </div>
    </div>
`

    if (config.includeDetails && data.steps && data.steps.length > 0) {
      html += `
    <div class="section">
      <h2>🔄 部署步骤</h2>
      <table>
        <thead>
          <tr>
            <th>步骤</th>
            <th>状态</th>
            <th>耗时</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
`
      data.steps.forEach(step => {
        html += `
          <tr>
            <td>${step.name}</td>
            <td><span class="badge ${step.status}">${step.status}</span></td>
            <td>${(step.duration / 1000).toFixed(2)}s</td>
            <td>${step.message || '-'}</td>
          </tr>
`
      })
      html += `
        </tbody>
      </table>
    </div>
`
    }

    if (config.includeStats && data.resources) {
      html += `
    <div class="section">
      <h2>💻 资源使用</h2>
      <div class="info-grid">
        <div class="info-item">
          <label>CPU 平均</label>
          <value>${data.resources.cpu.avg.toFixed(2)}%</value>
        </div>
        <div class="info-item">
          <label>CPU 峰值</label>
          <value>${data.resources.cpu.max.toFixed(2)}%</value>
        </div>
        <div class="info-item">
          <label>内存平均</label>
          <value>${data.resources.memory.avg.toFixed(2)}%</value>
        </div>
        <div class="info-item">
          <label>内存峰值</label>
          <value>${data.resources.memory.max.toFixed(2)}%</value>
        </div>
      </div>
    </div>
`
    }

    if (data.errors && data.errors.length > 0) {
      html += `
    <div class="section">
      <h2>❌ 错误</h2>
      <ul class="error-list">
`
      data.errors.forEach(error => {
        html += `        <li>${error}</li>\n`
      })
      html += `
      </ul>
    </div>
`
    }

    if (data.warnings && data.warnings.length > 0) {
      html += `
    <div class="section">
      <h2>⚠️ 警告</h2>
      <ul class="warning-list">
`
      data.warnings.forEach(warning => {
        html += `        <li>${warning}</li>\n`
      })
      html += `
      </ul>
    </div>
`
    }

    html += `
    <div class="footer">
      <p>报告生成时间: ${new Date().toLocaleString('zh-CN')}</p>
      <p>由 LDesign Deployer 生成</p>
    </div>
  </div>
</body>
</html>
`

    return html
  }

  /**
   * 生成纯文本格式报告
   */
  private generateText(data: DeploymentReportData, config: ReportConfig): string {
    const icon = data.result.success ? '✓' : '✗'
    const status = data.result.success ? '成功' : '失败'
    
    let text = `
═══════════════════════════════════════════════════
                  部署报告 [${icon}]
═══════════════════════════════════════════════════

状态: ${status}
版本: ${data.result.version || 'N/A'}
环境: ${data.result.environment}
平台: ${data.result.platform}
耗时: ${(data.duration / 1000).toFixed(2)} 秒
开始: ${data.startTime.toLocaleString('zh-CN')}
结束: ${data.endTime.toLocaleString('zh-CN')}

`

    if (config.includeDetails && data.steps && data.steps.length > 0) {
      text += `───────────────────────────────────────────────────\n`
      text += `部署步骤:\n`
      text += `───────────────────────────────────────────────────\n\n`
      data.steps.forEach((step, index) => {
        const stepIcon = step.status === 'success' ? '✓' : step.status === 'failed' ? '✗' : '-'
        text += `${index + 1}. [${stepIcon}] ${step.name} (${(step.duration / 1000).toFixed(2)}s)\n`
        if (step.message) {
          text += `   ${step.message}\n`
        }
      })
      text += `\n`
    }

    if (config.includeStats && data.resources) {
      text += `───────────────────────────────────────────────────\n`
      text += `资源使用:\n`
      text += `───────────────────────────────────────────────────\n\n`
      text += `CPU:    平均 ${data.resources.cpu.avg.toFixed(2)}%  |  峰值 ${data.resources.cpu.max.toFixed(2)}%\n`
      text += `内存:   平均 ${data.resources.memory.avg.toFixed(2)}%  |  峰值 ${data.resources.memory.max.toFixed(2)}%\n\n`
    }

    if (data.errors && data.errors.length > 0) {
      text += `───────────────────────────────────────────────────\n`
      text += `错误:\n`
      text += `───────────────────────────────────────────────────\n\n`
      data.errors.forEach(error => {
        text += `✗ ${error}\n`
      })
      text += `\n`
    }

    if (data.warnings && data.warnings.length > 0) {
      text += `───────────────────────────────────────────────────\n`
      text += `警告:\n`
      text += `───────────────────────────────────────────────────\n\n`
      data.warnings.forEach(warning => {
        text += `⚠ ${warning}\n`
      })
      text += `\n`
    }

    text += `═══════════════════════════════════════════════════\n`
    text += `报告生成: ${new Date().toLocaleString('zh-CN')}\n`
    text += `由 LDesign Deployer 生成\n`
    text += `═══════════════════════════════════════════════════\n`

    return text
  }
}
