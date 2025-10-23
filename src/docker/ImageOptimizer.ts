/**
 * Docker 镜像优化器
 */

import { logger } from '../utils/logger.js'
import type { OptimizationSuggestion, ImageInfo } from '../types/index.js'

export class ImageOptimizer {
  /**
   * 分析镜像并提供优化建议
   */
  async analyze(imageInfo: ImageInfo): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = []

    // 检查镜像大小
    suggestions.push(...this.analyzeSizeOptimizations(imageInfo))

    // 检查标签
    suggestions.push(...this.analyzeTagOptimizations(imageInfo))

    logger.info(`Found ${suggestions.length} optimization suggestions`)
    return suggestions
  }

  /**
   * 分析镜像大小优化
   */
  private analyzeSizeOptimizations(imageInfo: ImageInfo): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    const sizeMB = imageInfo.size / (1024 * 1024)

    // 大镜像警告
    if (sizeMB > 1000) {
      suggestions.push({
        type: 'size',
        severity: 'high',
        message: `Image size is very large: ${sizeMB.toFixed(2)}MB`,
        suggestion: 'Consider using multi-stage builds and alpine base images to reduce size',
      })
    } else if (sizeMB > 500) {
      suggestions.push({
        type: 'size',
        severity: 'medium',
        message: `Image size is large: ${sizeMB.toFixed(2)}MB`,
        suggestion: 'Consider optimizing dependencies and removing unnecessary files',
      })
    }

    return suggestions
  }

  /**
   * 分析标签优化
   */
  private analyzeTagOptimizations(imageInfo: ImageInfo): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []

    // 检查是否使用 latest 标签
    if (imageInfo.tags.some(tag => tag.endsWith(':latest'))) {
      suggestions.push({
        type: 'cache',
        severity: 'medium',
        message: 'Using :latest tag',
        suggestion: 'Use specific version tags for better reproducibility and caching',
      })
    }

    return suggestions
  }

  /**
   * 提供 Dockerfile 优化建议
   */
  provideDockerfileSuggestions(dockerfile: string): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    const lines = dockerfile.split('\n')

    // 检查基础镜像
    const fromLine = lines.find(line => line.trim().startsWith('FROM'))
    if (fromLine) {
      if (!fromLine.includes('alpine') && !fromLine.includes('slim')) {
        suggestions.push({
          type: 'size',
          severity: 'medium',
          message: 'Not using lightweight base image',
          suggestion: 'Consider using alpine or slim variants (e.g., node:20-alpine)',
        })
      }
    }

    // 检查是否有多阶段构建
    const fromCount = lines.filter(line => line.trim().startsWith('FROM')).length
    if (fromCount === 1) {
      suggestions.push({
        type: 'size',
        severity: 'low',
        message: 'Single-stage build detected',
        suggestion: 'Consider using multi-stage builds to reduce final image size',
      })
    }

    // 检查是否有 .dockerignore
    suggestions.push({
      type: 'cache',
      severity: 'medium',
      message: 'Ensure .dockerignore is properly configured',
      suggestion: 'Add node_modules, .git, and other unnecessary files to .dockerignore',
    })

    // 检查是否按照最佳实践排序
    const copyIndex = lines.findIndex(line => line.includes('COPY'))
    const runIndex = lines.findIndex(line => line.trim().startsWith('RUN'))

    if (copyIndex < runIndex && copyIndex !== -1 && runIndex !== -1) {
      const isCopyingPackageJson = lines[copyIndex].includes('package')
      if (!isCopyingPackageJson) {
        suggestions.push({
          type: 'cache',
          severity: 'medium',
          message: 'Copy all files before installing dependencies',
          suggestion: 'Copy package.json first, install dependencies, then copy remaining files for better caching',
        })
      }
    }

    // 检查是否合并 RUN 命令
    const runCount = lines.filter(line => line.trim().startsWith('RUN')).length
    if (runCount > 5) {
      suggestions.push({
        type: 'layers',
        severity: 'low',
        message: `Found ${runCount} RUN commands`,
        suggestion: 'Consider combining related RUN commands with && to reduce layers',
      })
    }

    // 检查安全性
    if (!lines.some(line => line.includes('USER') && !line.includes('root'))) {
      suggestions.push({
        type: 'security',
        severity: 'high',
        message: 'Running as root user',
        suggestion: 'Create and switch to a non-root user for better security',
      })
    }

    // 检查健康检查
    if (!lines.some(line => line.trim().startsWith('HEALTHCHECK'))) {
      suggestions.push({
        type: 'security',
        severity: 'low',
        message: 'No HEALTHCHECK defined',
        suggestion: 'Add HEALTHCHECK instruction to monitor container health',
      })
    }

    return suggestions
  }

  /**
   * 生成优化报告
   */
  generateOptimizationReport(suggestions: OptimizationSuggestion[]): string {
    if (suggestions.length === 0) {
      return '✓ No optimization suggestions. Image is well-optimized!'
    }

    let report = '\n📊 Docker Image Optimization Report\n'
    report += '='.repeat(50) + '\n\n'

    const bySeverity = {
      high: suggestions.filter(s => s.severity === 'high'),
      medium: suggestions.filter(s => s.severity === 'medium'),
      low: suggestions.filter(s => s.severity === 'low'),
    }

    for (const [severity, items] of Object.entries(bySeverity)) {
      if (items.length === 0) continue

      const emoji = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢'
      report += `${emoji} ${severity.toUpperCase()} Priority (${items.length})\n`
      report += '-'.repeat(50) + '\n\n'

      for (const item of items) {
        report += `  ${item.message}\n`
        report += `  💡 ${item.suggestion}\n\n`
      }
    }

    return report
  }

  /**
   * 自动优化 Dockerfile
   */
  autoOptimizeDockerfile(dockerfile: string): string {
    let optimized = dockerfile

    // 添加 .dockerignore 提示注释
    if (!dockerfile.includes('# Optimization:')) {
      optimized = '# Optimization: Ensure .dockerignore is configured\n' + optimized
    }

    // 其他自动优化可以在这里添加

    return optimized
  }
}




