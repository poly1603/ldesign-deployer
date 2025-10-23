/**
 * 交互式 CLI 向导
 * 使用 inquirer 简化配置流程
 */

import inquirer from 'inquirer'
import type { ProjectType, Platform, Environment } from '../types/index.js'
import { getAvailableTemplates, createTemplateConfig, type TemplateOptions } from '../templates/index.js'
import { ConfigManager } from '../core/ConfigManager.js'
import { logger } from '../utils/logger.js'

/**
 * 交互式初始化
 */
export async function interactiveInit(): Promise<void> {
  logger.info('🚀 欢迎使用 LDesign Deployer 交互式配置向导\n')

  try {
    // 1. 基础信息
    const basic = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: '项目名称:',
        default: 'my-app',
        validate: (input: string) => {
          if (input.length === 0) return '项目名称不能为空'
          if (!/^[a-z0-9-]+$/.test(input)) return '只能包含小写字母、数字和连字符'
          return true
        },
      },
      {
        type: 'input',
        name: 'version',
        message: '初始版本:',
        default: '1.0.0',
        validate: (input: string) => {
          if (!/^\d+\.\d+\.\d+$/.test(input)) return '请输入有效的语义化版本，例如: 1.0.0'
          return true
        },
      },
    ])

    // 2. 选择模板
    const templates = getAvailableTemplates()
    const templateChoice = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: '选择项目模板:',
        choices: templates.map(t => ({
          name: `${t.name} - ${t.description}`,
          value: t.id,
        })),
        default: 'node',
      },
    ])

    // 3. 部署平台
    const platform = await inquirer.prompt([
      {
        type: 'list',
        name: 'platform',
        message: '选择部署平台:',
        choices: [
          { name: 'Docker (单容器)', value: 'docker' },
          { name: 'Docker Compose (多容器编排)', value: 'docker-compose' },
          { name: 'Kubernetes (容器编排)', value: 'kubernetes' },
        ],
        default: 'docker',
      },
    ])

    // 4. 环境
    const env = await inquirer.prompt([
      {
        type: 'list',
        name: 'environment',
        message: '默认部署环境:',
        choices: [
          { name: 'Development (开发)', value: 'development' },
          { name: 'Test (测试)', value: 'test' },
          { name: 'Staging (预发布)', value: 'staging' },
          { name: 'Production (生产)', value: 'production' },
        ],
        default: 'development',
      },
    ])

    // 5. 项目特定配置
    const projectSpecific = await inquirer.prompt([
      {
        type: 'number',
        name: 'port',
        message: '应用端口:',
        default: templateChoice.template === 'spa' || templateChoice.template === 'static' ? 80 : 3000,
        validate: (input: number) => {
          if (input < 1 || input > 65535) return '端口号必须在 1-65535 之间'
          return true
        },
      },
    ])

    // 6. Node.js 版本 (仅对 Node 项目)
    let nodeVersion = '20'
    if (['node', 'ssr', 'fullstack'].includes(templateChoice.template)) {
      const nodeConfig = await inquirer.prompt([
        {
          type: 'list',
          name: 'nodeVersion',
          message: 'Node.js 版本:',
          choices: ['20', '18', '16', '14'],
          default: '20',
        },
      ])
      nodeVersion = nodeConfig.nodeVersion
    }

    // 7. 全栈模板额外配置
    let includeDatabase = false
    let includeRedis = false
    let includeNginx = false

    if (templateChoice.template === 'fullstack') {
      const fullstack = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'includeDatabase',
          message: '包含 PostgreSQL 数据库?',
          default: true,
        },
        {
          type: 'confirm',
          name: 'includeRedis',
          message: '包含 Redis 缓存?',
          default: true,
        },
        {
          type: 'confirm',
          name: 'includeNginx',
          message: '包含 Nginx 反向代理?',
          default: true,
        },
      ])
      includeDatabase = fullstack.includeDatabase
      includeRedis = fullstack.includeRedis
      includeNginx = fullstack.includeNginx
    }

    // 8. Kubernetes 配置 (可选)
    let k8sReplicas = 1
    if (platform.platform === 'kubernetes') {
      const k8sConfig = await inquirer.prompt([
        {
          type: 'number',
          name: 'replicas',
          message: 'Pod 副本数:',
          default: env.environment === 'production' ? 3 : 1,
          validate: (input: number) => {
            if (input < 1 || input > 100) return '副本数必须在 1-100 之间'
            return true
          },
        },
      ])
      k8sReplicas = k8sConfig.replicas
    }

    // 9. 健康检查
    const healthCheck = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enabled',
        message: '启用健康检查?',
        default: true,
      },
      {
        type: 'input',
        name: 'path',
        message: '健康检查路径:',
        default: templateChoice.template === 'node' || templateChoice.template === 'ssr' ? '/health' : '/',
        when: (answers: any) => answers.enabled,
      },
    ])

    // 10. Docker Registry
    const registry = await inquirer.prompt([
      {
        type: 'input',
        name: 'registry',
        message: 'Docker Registry (留空使用 Docker Hub):',
        default: '',
      },
    ])

    // 生成配置
    logger.info('\n📝 正在生成配置...\n')

    const templateOptions: TemplateOptions = {
      name: basic.name,
      projectType: templates.find(t => t.id === templateChoice.template)!.projectType,
      platform: platform.platform as Platform,
      environment: env.environment as Environment,
      port: projectSpecific.port,
      nodeVersion,
      includeDatabase,
      includeRedis,
      includeNginx,
    }

    const config = createTemplateConfig(templateChoice.template, templateOptions)

    // 应用版本
    config.version = basic.version

    // 应用 Registry
    if (registry.registry && config.docker) {
      config.docker.registry = registry.registry
    }

    // 应用健康检查
    if (config.healthCheck) {
      config.healthCheck.enabled = healthCheck.enabled
      if (healthCheck.enabled && healthCheck.path) {
        config.healthCheck.path = healthCheck.path
      }
    }

    // 应用 K8s 副本数
    if (platform.platform === 'kubernetes' && config.kubernetes?.deployment) {
      config.kubernetes.deployment.replicas = k8sReplicas
    }

    // 保存配置
    const configManager = new ConfigManager()
    await configManager.saveConfig(config)

    // 显示摘要
    logger.info('✅ 配置已创建!\n')
    logger.info('📋 配置摘要:')
    logger.info(`  名称: ${config.name}`)
    logger.info(`  版本: ${config.version}`)
    logger.info(`  类型: ${config.projectType}`)
    logger.info(`  平台: ${config.platform}`)
    logger.info(`  环境: ${config.environment}`)
    logger.info(`  端口: ${projectSpecific.port}`)

    if (config.docker) {
      logger.info(`  镜像: ${config.docker.registry || 'docker.io'}/${config.docker.image}:${config.docker.tag}`)
    }

    if (platform.platform === 'kubernetes' && config.kubernetes?.deployment) {
      logger.info(`  副本数: ${config.kubernetes.deployment.replicas}`)
    }

    logger.info('\n🚀 下一步:')
    logger.info('  1. 查看配置: cat deploy.config.json')
    logger.info('  2. 部署应用: ldesign-deployer deploy')
    logger.info('  3. 查看帮助: ldesign-deployer --help')

  } catch (error: any) {
    if (error.isTtyError) {
      logger.error('无法在当前环境中显示交互式提示')
    } else {
      logger.error('初始化失败:', error.message)
    }
    throw error
  }
}

/**
 * 交互式选择环境
 */
export async function interactiveSelectEnvironment(): Promise<Environment> {
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'environment',
      message: '选择部署环境:',
      choices: [
        { name: '🔧 Development (开发)', value: 'development' },
        { name: '🧪 Test (测试)', value: 'test' },
        { name: '🎭 Staging (预发布)', value: 'staging' },
        { name: '🚀 Production (生产)', value: 'production' },
      ],
    },
  ])

  return answer.environment
}

/**
 * 交互式确认部署
 */
export async function interactiveConfirmDeploy(
  name: string,
  version: string,
  environment: Environment
): Promise<boolean> {
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `确认部署 ${name} v${version} 到 ${environment} 环境?`,
      default: true,
    },
  ])

  return answer.confirm
}

/**
 * 交互式选择回滚版本
 */
export async function interactiveSelectRollbackVersion(
  versions: Array<{ version: string; timestamp: string; status: string }>
): Promise<string> {
  if (versions.length === 0) {
    throw new Error('没有可用的历史版本')
  }

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'version',
      message: '选择要回滚的版本:',
      choices: versions.map(v => ({
        name: `${v.version} - ${v.timestamp} [${v.status}]`,
        value: v.version,
      })),
    },
  ])

  return answer.version
}

/**
 * 交互式编辑配置
 */
export async function interactiveEditConfig(currentConfig: any): Promise<any> {
  logger.info('📝 编辑配置 (使用方向键导航, 空格选择, 回车确认)\n')

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '项目名称:',
      default: currentConfig.name,
    },
    {
      type: 'input',
      name: 'version',
      message: '版本:',
      default: currentConfig.version,
    },
    {
      type: 'list',
      name: 'environment',
      message: '环境:',
      choices: ['development', 'test', 'staging', 'production'],
      default: currentConfig.environment,
    },
    {
      type: 'list',
      name: 'platform',
      message: '平台:',
      choices: ['docker', 'docker-compose', 'kubernetes'],
      default: currentConfig.platform,
    },
  ])

  return { ...currentConfig, ...answers }
}

