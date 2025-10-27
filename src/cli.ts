/**
 * @ldesign/deployer CLI
 * @module cli
 * 
 * @description 部署工具的命令行界面，提供部署、回滚、配置管理等命令
 */

import { cac } from 'cac'
import { readFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Deployer } from './core/Deployer.js'
import { EnhancedDeployer } from './core/EnhancedDeployer.js'
import { ConfigManager } from './core/ConfigManager.js'
import { VersionManager } from './core/VersionManager.js'
import { RollbackManager } from './rollback/RollbackManager.js'
import { GracefulShutdown } from './utils/graceful-shutdown.js'
import { DockerfileGenerator } from './docker/DockerfileGenerator.js'
import { ComposeGenerator } from './docker/ComposeGenerator.js'
import { ManifestGenerator } from './kubernetes/ManifestGenerator.js'
import { HelmGenerator } from './kubernetes/HelmGenerator.js'
import { GitHubActions } from './cicd/GitHubActions.js'
import { GitLabCI } from './cicd/GitLabCI.js'
import { JenkinsPipeline } from './cicd/JenkinsPipeline.js'
import { logger } from './utils/logger.js'
import { writeFile } from './utils/file-system.js'
import type { Environment } from './types/index.js'

const cli = cac('ldesign-deployer')

// 从 package.json 读取版本号
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJsonPath = resolve(__dirname, '../package.json')

let version = '0.3.0' // 默认版本
try {
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
  version = packageJson.version
} catch {
  // 如果读取失败，使用默认版本
}

cli.version(version)

// 全局选项
cli.option('--debug', 'Enable debug mode')
cli.option('--silent', 'Silent mode')

/**
 * init 命令 - 初始化配置
 */
cli
  .command('init [name]', 'Initialize deployment configuration')
  .option('--interactive, -i', 'Use interactive mode')
  .option('--template <type>', 'Use template (node/spa/static/ssr/fullstack)')
  .action(async (name: string, options) => {
    try {
      // 交互式模式
      if (options.interactive) {
        const { interactiveInit } = await import('./cli/interactive.js')
        await interactiveInit()
        return
      }

      // 使用模板
      if (options.template) {
        const { createTemplateConfig } = await import('./templates/index.js')
        const projectName = name || 'my-app'

        const config = createTemplateConfig(options.template, {
          name: projectName,
          projectType: options.template === 'spa' ? 'spa' :
            options.template === 'static' ? 'static' :
              options.template === 'ssr' ? 'ssr' : 'node',
        })

        const configManager = new ConfigManager()
        await configManager.saveConfig(config)
        logger.success('✅ 配置已创建 (基于模板: ' + options.template + ')')
        return
      }

      // 传统模式
      const projectName = name || 'my-app'
      await ConfigManager.initConfig(projectName)
      logger.success('✅ 配置初始化成功')
      logger.info('💡 提示: 使用 --interactive 或 -i 启用交互式向导')
    } catch (error: any) {
      logger.error('初始化配置失败:', error.message)
      process.exit(1)
    }
  })

/**
 * deploy 命令 - 执行部署
 */
cli
  .command('deploy', 'Deploy application')
  .option('--env <environment>', 'Target environment', { default: 'development' })
  .option('--config <file>', 'Config file path')
  .option('--dry-run', 'Dry run mode')
  .option('--skip-health-check', 'Skip health check')
  .option('--skip-hooks', 'Skip pre/post hooks')
  .option('--skip-pre-check', 'Skip pre-deployment checks')
  .option('--timeout <seconds>', 'Deployment timeout in seconds')
  .option('--retry', 'Enable retry on failure')
  .option('--enhanced', 'Use enhanced deployer with all features', { default: true })
  .action(async (options) => {
    try {
      if (options.debug) {
        logger.setLevel('debug')
      }

      // 使用增强版或基础版
      const deployer = options.enhanced
        ? new EnhancedDeployer()
        : new Deployer()

      // 如果是增强版，监听进度
      if (deployer instanceof EnhancedDeployer) {
        deployer.onProgress((event) => {
          logger.info(`[${event.progress}%] ${event.message}`)
        })
      }

      const deployOptions: any = {
        environment: options.env as Environment,
        configFile: options.config,
        dryRun: options.dryRun,
        skipHealthCheck: options.skipHealthCheck,
        skipHooks: options.skipHooks,
      }

      // 增强选项
      if (deployer instanceof EnhancedDeployer) {
        deployOptions.skipPreCheck = options.skipPreCheck
        deployOptions.deploymentTimeout = options.timeout ? parseInt(options.timeout) * 1000 : undefined
        deployOptions.retryOnFailure = options.retry
        deployOptions.enableAudit = true
        deployOptions.enableProgress = true
      }

      const result = await deployer.deploy(deployOptions)

      if (!result.success) {
        logger.error('Deployment failed')
        process.exit(1)
      }
    } catch (error: any) {
      logger.error('Deployment error:', error.message)
      process.exit(1)
    }
  })

/**
 * rollback 命令 - 回滚
 */
cli
  .command('rollback [version]', 'Rollback to a previous version')
  .option('--revision <number>', 'K8s revision number')
  .action(async (version: string, options) => {
    try {
      const rollbackManager = new RollbackManager()
      const result = await rollbackManager.rollback({
        version,
        revision: options.revision,
      })

      if (!result.success) {
        logger.error('Rollback failed')
        process.exit(1)
      }
    } catch (error: any) {
      logger.error('Rollback error:', error.message)
      process.exit(1)
    }
  })

/**
 * docker 命令组
 */
cli
  .command('docker:dockerfile', 'Generate Dockerfile')
  .option('--type <type>', 'Project type (node/static/spa)', { default: 'node' })
  .option('--multi-stage', 'Use multi-stage build')
  .action(async (options) => {
    try {
      const generator = new DockerfileGenerator()
      const dockerfile = generator.generate({
        projectType: options.type,
        multiStage: options.multiStage,
        optimize: true,
      })

      await writeFile('Dockerfile', dockerfile)
      logger.success('Dockerfile generated')
    } catch (error: any) {
      logger.error('Failed to generate Dockerfile:', error.message)
      process.exit(1)
    }
  })

cli
  .command('docker:compose', 'Generate docker-compose.yml')
  .option('--db <database>', 'Include database (postgres/mysql/mongodb/redis)')
  .option('--nginx', 'Include nginx')
  .action(async (options) => {
    try {
      const generator = new ComposeGenerator()
      const compose = generator.generateFullStack({
        appName: 'app',
        database: options.db,
        redis: options.db === 'redis',
        nginx: options.nginx,
      })

      await writeFile('docker-compose.yml', compose)
      logger.success('docker-compose.yml generated')
    } catch (error: any) {
      logger.error('Failed to generate docker-compose.yml:', error.message)
      process.exit(1)
    }
  })

/**
 * k8s 命令组
 */
cli
  .command('k8s:manifests', 'Generate Kubernetes manifests')
  .option('--config <file>', 'Config file path')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager({ configFile: options.config })
      const config = await configManager.loadConfig()

      const generator = new ManifestGenerator()
      const manifests = generator.generateAll(config)

      await writeFile('k8s-manifests.yml', manifests)
      logger.success('Kubernetes manifests generated')
    } catch (error: any) {
      logger.error('Failed to generate manifests:', error.message)
      process.exit(1)
    }
  })

cli
  .command('k8s:helm', 'Generate Helm chart')
  .option('--config <file>', 'Config file path')
  .option('--output <dir>', 'Output directory', { default: './helm' })
  .action(async (options) => {
    try {
      const configManager = new ConfigManager({ configFile: options.config })
      const config = await configManager.loadConfig()

      const generator = new HelmGenerator()
      await generator.generateChart(config, options.output)
    } catch (error: any) {
      logger.error('Failed to generate Helm chart:', error.message)
      process.exit(1)
    }
  })

/**
 * cicd 命令组
 */
cli
  .command('cicd:github', 'Generate GitHub Actions workflow')
  .option('--config <file>', 'Config file path')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager({ configFile: options.config })
      const config = await configManager.loadConfig()

      const generator = new GitHubActions()
      await generator.generate(config)
    } catch (error: any) {
      logger.error('Failed to generate GitHub Actions workflow:', error.message)
      process.exit(1)
    }
  })

cli
  .command('cicd:gitlab', 'Generate GitLab CI pipeline')
  .option('--config <file>', 'Config file path')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager({ configFile: options.config })
      const config = await configManager.loadConfig()

      const generator = new GitLabCI()
      await generator.generate(config)
    } catch (error: any) {
      logger.error('Failed to generate GitLab CI pipeline:', error.message)
      process.exit(1)
    }
  })

cli
  .command('cicd:jenkins', 'Generate Jenkins pipeline')
  .option('--config <file>', 'Config file path')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager({ configFile: options.config })
      const config = await configManager.loadConfig()

      const generator = new JenkinsPipeline()
      await generator.generate(config)
    } catch (error: any) {
      logger.error('Failed to generate Jenkins pipeline:', error.message)
      process.exit(1)
    }
  })

/**
 * version 命令组
 */
cli
  .command('version:bump <type>', 'Bump version (major/minor/patch)')
  .action(async (type: 'major' | 'minor' | 'patch') => {
    try {
      const versionManager = new VersionManager()
      const newVersion = await versionManager.bumpVersion(type)
      logger.success(`Version bumped to: ${newVersion}`)
    } catch (error: any) {
      logger.error('Failed to bump version:', error.message)
      process.exit(1)
    }
  })

cli
  .command('version:tag', 'Create Git tag for current version')
  .option('--push', 'Push tag to remote')
  .action(async (options) => {
    try {
      const versionManager = new VersionManager()
      const version = await versionManager.getCurrentVersion()

      await versionManager.createTag(version)

      if (options.push) {
        await versionManager.pushTag(version)
      }
    } catch (error: any) {
      logger.error('Failed to create tag:', error.message)
      process.exit(1)
    }
  })

/**
 * lock 命令组 - 锁管理
 */
cli
  .command('lock:status', 'Check deployment lock status')
  .action(async () => {
    try {
      const { DeploymentLock } = await import('./utils/lock.js')
      const isLocked = await DeploymentLock.isLocked()

      if (isLocked) {
        const lockInfo = await DeploymentLock.getLockInfo()
        logger.warn('🔒 Deployment is locked')
        if (lockInfo) {
          logger.info(`  ID: ${lockInfo.id}`)
          logger.info(`  PID: ${lockInfo.pid}`)
          logger.info(`  Operation: ${lockInfo.operation}`)
          logger.info(`  User: ${lockInfo.user}`)
          logger.info(`  Started: ${new Date(lockInfo.timestamp).toLocaleString()}`)
        }
      } else {
        logger.success('🔓 No deployment lock found')
      }
    } catch (error: any) {
      logger.error('Failed to check lock status:', error.message)
      process.exit(1)
    }
  })

cli
  .command('lock:release', 'Force release deployment lock')
  .action(async () => {
    try {
      const { DeploymentLock } = await import('./utils/lock.js')
      await DeploymentLock.forceRelease()
      logger.success('🔓 Lock released successfully')
    } catch (error: any) {
      logger.error('Failed to release lock:', error.message)
      process.exit(1)
    }
  })

/**
 * audit 命令组 - 审计日志
 */
cli
  .command('audit:stats', 'Show audit log statistics')
  .action(async () => {
    try {
      const { AuditLogger } = await import('./utils/audit-log.js')
      const auditLogger = new AuditLogger()
      const stats = await auditLogger.getStats()

      logger.info('\n📊 Audit Statistics:')
      logger.info('='.repeat(60))
      logger.info(`Total entries: ${stats.total}`)

      logger.info('\nBy action:')
      for (const [action, count] of Object.entries(stats.byAction)) {
        logger.info(`  ${action}: ${count}`)
      }

      logger.info('\nBy result:')
      for (const [result, count] of Object.entries(stats.byResult)) {
        logger.info(`  ${result}: ${count}`)
      }

      logger.info('\nBy environment:')
      for (const [env, count] of Object.entries(stats.byEnvironment)) {
        logger.info(`  ${env}: ${count}`)
      }
    } catch (error: any) {
      logger.error('Failed to get audit stats:', error.message)
      process.exit(1)
    }
  })

cli
  .command('audit:query', 'Query audit logs')
  .option('--action <action>', 'Filter by action')
  .option('--environment <env>', 'Filter by environment')
  .option('--days <days>', 'Last N days', { default: '7' })
  .action(async (options) => {
    try {
      const { AuditLogger } = await import('./utils/audit-log.js')
      const auditLogger = new AuditLogger()

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(options.days))

      const logs = await auditLogger.query({
        action: options.action,
        environment: options.environment,
        startDate,
      })

      logger.info(`\n📜 Found ${logs.length} audit log entries:`)
      logger.info('='.repeat(80))

      logs.slice(0, 20).forEach((log) => {
        const icon = log.result === 'success' ? '✅' : '❌'
        logger.info(
          `${icon} ${log.timestamp} | ${log.action} | ${log.resource} | ${log.environment} | ${log.duration}ms`
        )
      })

      if (logs.length > 20) {
        logger.info(`\n... and ${logs.length - 20} more entries`)
      }
    } catch (error: any) {
      logger.error('Failed to query audit logs:', error.message)
      process.exit(1)
    }
  })

/**
 * history 命令 - 查看部署历史
 */
cli
  .command('history [count]', 'Show deployment history')
  .action(async (count: string) => {
    try {
      const rollbackManager = new RollbackManager()
      const history = await rollbackManager.getVersionHistory().getRecent(
        count ? parseInt(count) : 10
      )

      if (history.length === 0) {
        logger.info('No deployment history found')
        return
      }

      logger.info('\n📜 Deployment History:')
      logger.info('='.repeat(80))

      for (const record of history) {
        const statusEmoji = record.status === 'success' ? '✓' : '✗'
        logger.info(
          `${statusEmoji} ${record.version} | ${record.environment} | ${record.timestamp} | ${record.status}`
        )
      }
    } catch (error: any) {
      logger.error('Failed to get history:', error.message)
      process.exit(1)
    }
  })

// 帮助信息
cli.help()

/**
 * status 命令 - 查看部署状态
 */
cli
  .command('status', 'Show deployment status')
  .action(async () => {
    try {
      const { DeploymentLock } = await import('./utils/lock.js')

      logger.info('\n📊 Deployment Status:')
      logger.info('='.repeat(60))

      const isLocked = await DeploymentLock.isLocked()
      logger.info(`Lock status: ${isLocked ? '🔒 Locked' : '🔓 Unlocked'}`)

      if (isLocked) {
        const lockInfo = await DeploymentLock.getLockInfo()
        if (lockInfo) {
          logger.info(`Current deployment: ${lockInfo.operation}`)
          logger.info(`Started: ${new Date(lockInfo.timestamp).toLocaleString()}`)
        }
      }

      logger.info('='.repeat(60) + '\n')
    } catch (error: any) {
      logger.error('Failed to get status:', error.message)
      process.exit(1)
    }
  })

/**
 * doctor 命令 - 健康诊断
 */
cli
  .command('doctor', 'Check system dependencies and configuration')
  .action(async () => {
    try {
      const { PreDeploymentChecker } = await import('./core/PreDeploymentChecker.js')
      const configManager = new ConfigManager()

      logger.info('🏥 Running system diagnostics...\n')

      try {
        const config = await configManager.loadConfig()
        const checker = new PreDeploymentChecker()
        const results = await checker.checkAll(config)

        logger.info('✅ All checks passed!\n')
        results.forEach(result => {
          logger.info(`  ✓ ${result.name}: ${result.message}`)
        })
      } catch (error: any) {
        logger.error('❌ Some checks failed')
        logger.error(error.message)
        process.exit(1)
      }
    } catch (error: any) {
      logger.error('Doctor check failed:', error.message)
      process.exit(1)
    }
  })

/**
 * templates 命令 - 列出可用模板
 */
cli
  .command('templates', 'List available configuration templates')
  .option('--type <type>', 'Filter by project type')
  .option('--platform <platform>', 'Filter by platform')
  .option('--tag <tag>', 'Filter by tag')
  .action(async (options) => {
    try {
      const { TemplateRegistry, initializeMarketplace } = await import('./templates/index.js')

      // 初始化模板市场
      initializeMarketplace()

      const registry = TemplateRegistry.getInstance()
      let templates = registry.getAllTemplates()

      // 应用过滤器
      if (options.type) {
        templates = templates.filter(t => t.projectType === options.type)
      }
      if (options.platform) {
        templates = templates.filter(t => t.platform === options.platform)
      }
      if (options.tag) {
        templates = templates.filter(t => t.tags.includes(options.tag))
      }

      if (templates.length === 0) {
        logger.info('No templates found matching your criteria')
        return
      }

      logger.info(`📚 Available Templates (${templates.length}):\n`)

      templates.forEach((template, index) => {
        const difficultyEmoji = template.difficulty === 'beginner' ? '🟢' : template.difficulty === 'intermediate' ? '🟡' : '🔴'
        logger.info(`${index + 1}. ${template.name} ${difficultyEmoji}`)
        logger.info(`   ID: ${template.id}`)
        logger.info(`   Type: ${template.projectType} | Platform: ${template.platform}`)
        logger.info(`   Tags: ${template.tags.join(', ')}`)
        logger.info(`   Description: ${template.description}`)
        logger.info(`   Usage: ldesign-deployer init --template=${template.id}\n`)
      })
    } catch (error: any) {
      logger.error('Failed to list templates:', error.message)
      process.exit(1)
    }
  })

/**
 * template:use 命令 - 使用模板创建配置
 */
cli
  .command('template:use <id>', 'Use a template to create configuration')
  .option('--name <name>', 'Application name', { default: 'my-app' })
  .option('--version <version>', 'Application version', { default: '1.0.0' })
  .option('--port <port>', 'Application port')
  .option('--output <file>', 'Output file', { default: 'deploy.config.json' })
  .action(async (id: string, options) => {
    try {
      const { TemplateRegistry, initializeMarketplace } = await import('./templates/index.js')
      const { writeFile } = await import('./utils/file-system.js')

      // 初始化模板市场
      initializeMarketplace()

      const registry = TemplateRegistry.getInstance()

      logger.info(`Using template: ${id}`)

      const config = registry.useTemplate(id, {
        name: options.name,
        version: options.version,
        port: options.port ? parseInt(options.port) : undefined,
      })

      await writeFile(options.output, JSON.stringify(config, null, 2))
      logger.success(`✅ Configuration created: ${options.output}`)
      logger.info(`📝 Application: ${config.name}`)
      logger.info(`🚀 Platform: ${config.platform}`)
    } catch (error: any) {
      logger.error('Failed to use template:', error.message)
      process.exit(1)
    }
  })

/**
 * preview 命令组 - 配置预览
 */
cli
  .command('preview:diff <file1> <file2>', 'Compare two deployment configurations')
  .option('--verbose', 'Show verbose output', { default: true })
  .action(async (file1: string, file2: string, options) => {
    try {
      const { ConfigDiffer } = await import('./preview/index.js')
      const { readFile } = await import('./utils/file-system.js')

      // 读取配置文件
      const config1 = JSON.parse(await readFile(file1))
      const config2 = JSON.parse(await readFile(file2))

      // 对比配置
      const differ = new ConfigDiffer()
      const report = differ.compare(config1, config2)

      // 输出报告
      console.log(differ.formatReport(report, { verbose: options.verbose }))

      // 如果有差异，退出码为 1
      if (report.hasDifferences) {
        process.exit(1)
      }
    } catch (error: any) {
      logger.error('Failed to compare configurations:', error.message)
      process.exit(1)
    }
  })

cli
  .command('preview:analyze <file1> <file2>', 'Analyze configuration change impact')
  .action(async (file1: string, file2: string) => {
    try {
      const { ConfigDiffer, ChangeAnalyzer } = await import('./preview/index.js')
      const { readFile } = await import('./utils/file-system.js')

      // 读取配置文件
      const oldConfig = JSON.parse(await readFile(file1))
      const newConfig = JSON.parse(await readFile(file2))

      // 对比和分析
      const differ = new ConfigDiffer()
      const diffReport = differ.compare(oldConfig, newConfig)

      const analyzer = new ChangeAnalyzer()
      const analysis = analyzer.analyze(diffReport, oldConfig, newConfig)

      // 输出分析报告
      console.log(analyzer.formatReport(analysis))

      // 根据风险评分设置退出码
      if (analysis.overallRiskScore >= 70) {
        logger.warn('⚠️  高风险变更，请谨慎操作')
        process.exit(2)
      } else if (analysis.overallRiskScore >= 40) {
        logger.info('ℹ️  中等风险变更，建议仔细检查')
      }
    } catch (error: any) {
      logger.error('Failed to analyze configuration:', error.message)
      process.exit(1)
    }
  })

/**
 * cache 命令组 - 缓存管理
 */
cli
  .command('cache:clear', 'Clear all caches')
  .action(async () => {
    try {
      const { clearAllCaches, getCacheStats } = await import('./utils/cache.js')
      const statsBefore = getCacheStats()

      clearAllCaches()

      logger.success('✅ All caches cleared')
      logger.info(`  Config cache: ${statsBefore.config.keys} entries`)
      logger.info(`  Build cache: ${statsBefore.build.keys} entries`)
      logger.info(`  Health check cache: ${statsBefore.healthCheck.keys} entries`)
    } catch (error: any) {
      logger.error('Failed to clear cache:', error.message)
      process.exit(1)
    }
  })

cli
  .command('cache:stats', 'Show cache statistics')
  .action(async () => {
    try {
      const { getCacheStats } = await import('./utils/cache.js')
      const stats = getCacheStats()

      logger.info('📊 Cache Statistics:\n')
      logger.info(`Config Cache:`)
      logger.info(`  Size: ${stats.config.size} bytes`)
      logger.info(`  Entries: ${stats.config.keys}\n`)

      logger.info(`Build Cache:`)
      logger.info(`  Size: ${stats.build.size} bytes`)
      logger.info(`  Entries: ${stats.build.keys}\n`)

      logger.info(`Health Check Cache:`)
      logger.info(`  Size: ${stats.healthCheck.size} bytes`)
      logger.info(`  Entries: ${stats.healthCheck.keys}`)
    } catch (error: any) {
      logger.error('Failed to get cache stats:', error.message)
      process.exit(1)
    }
  })

/**
 * 运行 CLI
 */
export async function run(): Promise<void> {
  try {
    // 初始化优雅退出
    GracefulShutdown.init()

    cli.parse(process.argv, { run: true })
  } catch (error: any) {
    logger.error('CLI error:', error.message)
    process.exit(1)
  }
}

// 如果直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
  run()
}


