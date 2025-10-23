/**
 * 流程图生成器
 * 使用 Mermaid 语法生成部署流程图
 */

import type { DeployConfig, DeploymentHistory } from '../types/index.js'
import { writeFile } from '../utils/file-system.js'
import { logger } from '../utils/logger.js'

/**
 * 流程图生成器
 */
export class FlowchartGenerator {
  /**
   * 生成部署流程图
   */
  generateDeploymentFlow(config: DeployConfig): string {
    const lines: string[] = []

    lines.push('```mermaid')
    lines.push('graph TD')
    lines.push('    Start([开始部署]) --> Init[初始化配置]')
    lines.push('    Init --> Validate{验证配置}')
    lines.push('    Validate -->|失败| Error1[配置错误]')
    lines.push('    Validate -->|成功| PreCheck[前置检查]')
    lines.push('')

    // 根据平台添加不同的流程
    if (config.platform === 'docker') {
      lines.push('    PreCheck --> BuildImage[构建 Docker 镜像]')
      lines.push('    BuildImage --> PushImage[推送镜像]')
      lines.push('    PushImage --> RunContainer[运行容器]')
      lines.push('    RunContainer --> HealthCheck')
    } else if (config.platform === 'kubernetes') {
      lines.push('    PreCheck --> BuildImage[构建 Docker 镜像]')
      lines.push('    BuildImage --> PushImage[推送到 Registry]')
      lines.push('    PushImage --> ApplyManifests[应用 K8s 清单]')
      lines.push('    ApplyManifests --> WaitReady[等待 Pod 就绪]')
      lines.push('    WaitReady --> HealthCheck')
    } else {
      lines.push('    PreCheck --> Deploy[执行部署]')
      lines.push('    Deploy --> HealthCheck')
    }

    lines.push('')
    lines.push('    HealthCheck{健康检查}')
    lines.push('    HealthCheck -->|失败| Rollback[回滚]')
    lines.push('    HealthCheck -->|成功| PostHooks[执行后置脚本]')
    lines.push('    PostHooks --> Complete([部署完成])')
    lines.push('    Rollback --> Error2[部署失败]')
    lines.push('')

    // 样式
    lines.push('    style Start fill:#e1f5e1')
    lines.push('    style Complete fill:#e1f5e1')
    lines.push('    style Error1 fill:#ffe1e1')
    lines.push('    style Error2 fill:#ffe1e1')
    lines.push('    style HealthCheck fill:#fff4e1')
    lines.push('```')

    return lines.join('\n')
  }

  /**
   * 生成部署策略流程图
   */
  generateStrategyFlow(strategyType: string): string {
    const lines: string[] = []

    lines.push('```mermaid')
    lines.push('graph LR')

    switch (strategyType) {
      case 'BlueGreen':
        lines.push('    Blue[蓝色环境<br/>v1.0] --> LoadBalancer{负载均衡器}')
        lines.push('    Green[绿色环境<br/>v1.1<br/>待激活] -.-> LoadBalancer')
        lines.push('    LoadBalancer --> Users[用户流量]')
        lines.push('    Deploy[部署新版本] --> Green')
        lines.push('    Test[测试验证] --> Switch{切换流量}')
        lines.push('    Switch -->|切换| GreenActive[绿色环境<br/>v1.1<br/>激活]')
        lines.push('    GreenActive --> LoadBalancer')
        lines.push('    Blue -.-> BlueStandby[蓝色环境<br/>v1.0<br/>待命]')
        lines.push('')
        lines.push('    style Blue fill:#add8e6')
        lines.push('    style Green fill:#90ee90')
        lines.push('    style GreenActive fill:#32cd32')
        lines.push('    style BlueStandby fill:#b0c4de')
        break

      case 'Canary':
        lines.push('    Baseline[基线版本<br/>v1.0<br/>90%] --> LoadBalancer{负载均衡器}')
        lines.push('    Canary[金丝雀版本<br/>v1.1<br/>10%] --> LoadBalancer')
        lines.push('    LoadBalancer --> Users[用户流量]')
        lines.push('    Monitor[监控指标] --> Analysis{分析结果}')
        lines.push('    Analysis -->|成功| Increase[增加流量<br/>50%]')
        lines.push('    Analysis -->|失败| Rollback[回滚]')
        lines.push('    Increase --> Full[全量发布<br/>100%]')
        lines.push('')
        lines.push('    style Canary fill:#fff4e1')
        lines.push('    style Full fill:#90ee90')
        lines.push('    style Rollback fill:#ffe1e1')
        break

      case 'Rolling':
        lines.push('    Start[滚动更新开始] --> Pod1[Pod 1<br/>v1.0 → v1.1]')
        lines.push('    Pod1 --> Check1{健康检查}')
        lines.push('    Check1 -->|通过| Pod2[Pod 2<br/>v1.0 → v1.1]')
        lines.push('    Pod2 --> Check2{健康检查}')
        lines.push('    Check2 -->|通过| Pod3[Pod 3<br/>v1.0 → v1.1]')
        lines.push('    Pod3 --> Complete[全部更新完成]')
        lines.push('    Check1 -->|失败| Rollback[回滚]')
        lines.push('    Check2 -->|失败| Rollback')
        lines.push('')
        lines.push('    style Complete fill:#90ee90')
        lines.push('    style Rollback fill:#ffe1e1')
        break
    }

    lines.push('```')
    return lines.join('\n')
  }

  /**
   * 生成时间线
   */
  generateTimeline(history: DeploymentHistory[]): string {
    const lines: string[] = []

    lines.push('```mermaid')
    lines.push('gantt')
    lines.push('    title 部署历史时间线')
    lines.push('    dateFormat YYYY-MM-DD')
    lines.push('    section 部署记录')

    history.slice(0, 10).forEach((record, index) => {
      const date = new Date(record.timestamp).toISOString().split('T')[0]
      const status = record.status === 'success' ? '✓' : '✗'
      lines.push(`    ${status} ${record.version} (${record.environment}) :${date}, 1d`)
    })

    lines.push('```')
    return lines.join('\n')
  }

  /**
   * 生成架构图
   */
  generateArchitecture(config: DeployConfig): string {
    const lines: string[] = []

    lines.push('```mermaid')
    lines.push('graph TB')
    lines.push('    subgraph "外部"')
    lines.push('        Users[用户]')
    lines.push('        Internet[互联网]')
    lines.push('    end')
    lines.push('')

    if (config.platform === 'kubernetes') {
      lines.push('    subgraph "Kubernetes 集群"')
      lines.push('        Ingress[Ingress<br/>负载均衡]')
      lines.push('        Service[Service<br/>服务发现]')
      lines.push('        Pods[Pods<br/>应用实例]')
      lines.push('    end')
      lines.push('')
      lines.push('    Users --> Internet')
      lines.push('    Internet --> Ingress')
      lines.push('    Ingress --> Service')
      lines.push('    Service --> Pods')
    } else if (config.platform === 'docker-compose') {
      lines.push('    subgraph "Docker Compose"')
      lines.push('        Nginx[Nginx<br/>反向代理]')
      lines.push('        App[应用容器]')
      lines.push('        DB[(数据库)]')
      lines.push('        Redis[(Redis)]')
      lines.push('    end')
      lines.push('')
      lines.push('    Users --> Internet')
      lines.push('    Internet --> Nginx')
      lines.push('    Nginx --> App')
      lines.push('    App --> DB')
      lines.push('    App --> Redis')
    } else {
      lines.push('    subgraph "Docker"')
      lines.push('        Container[应用容器]')
      lines.push('    end')
      lines.push('')
      lines.push('    Users --> Internet')
      lines.push('    Internet --> Container')
    }

    lines.push('')
    lines.push('    style Users fill:#e1f5e1')
    lines.push('    style Internet fill:#e1e5f5')
    lines.push('```')

    return lines.join('\n')
  }

  /**
   * 保存流程图到文件
   */
  async saveFlowchart(content: string, filename: string): Promise<void> {
    await writeFile(filename, content)
    logger.success(`📊 流程图已生成: ${filename}`)
  }

  /**
   * 生成完整的可视化文档
   */
  async generateFullVisualization(
    config: DeployConfig,
    history: DeploymentHistory[],
    outputFile: string = 'deployment-visualization.md'
  ): Promise<void> {
    const lines: string[] = []

    lines.push('# 部署可视化文档')
    lines.push('')
    lines.push(`**项目**: ${config.name}`)
    lines.push(`**版本**: ${config.version}`)
    lines.push(`**环境**: ${config.environment}`)
    lines.push(`**平台**: ${config.platform}`)
    lines.push('')

    // 部署流程图
    lines.push('## 📊 部署流程')
    lines.push('')
    lines.push(this.generateDeploymentFlow(config))
    lines.push('')

    // 架构图
    lines.push('## 🏗️ 系统架构')
    lines.push('')
    lines.push(this.generateArchitecture(config))
    lines.push('')

    // 部署策略（如果有）
    if (config.kubernetes?.deployment?.strategy?.type) {
      lines.push('## 🎯 部署策略')
      lines.push('')
      lines.push(this.generateStrategyFlow(config.kubernetes.deployment.strategy.type))
      lines.push('')
    }

    // 时间线
    if (history.length > 0) {
      lines.push('## ⏱️ 部署历史时间线')
      lines.push('')
      lines.push(this.generateTimeline(history))
      lines.push('')
    }

    // 说明
    lines.push('---')
    lines.push('')
    lines.push('> 💡 **提示**: 可以使用支持 Mermaid 的 Markdown 查看器查看图表')
    lines.push('> ')
    lines.push('> 推荐工具:')
    lines.push('> - VS Code + Mermaid 插件')
    lines.push('> - GitHub/GitLab (原生支持)')
    lines.push('> - Mermaid Live Editor (https://mermaid.live)')

    await writeFile(outputFile, lines.join('\n'))
    logger.success(`📊 完整可视化文档已生成: ${outputFile}`)
  }
}

/**
 * 快速生成可视化
 */
export async function generateVisualization(
  config: DeployConfig,
  history: DeploymentHistory[] = [],
  outputFile?: string
): Promise<void> {
  const generator = new FlowchartGenerator()
  await generator.generateFullVisualization(config, history, outputFile)
}

