/**
 * @ldesign/deployer CLI
 */

import { cac } from 'cac'
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

// 版本号
cli.version('0.2.0')

// 全局选项
cli.option('--debug', 'Enable debug mode')
cli.option('--silent', 'Silent mode')

/**
 * init 命令 - 初始化配置
 */
cli
  .command('init [name]', 'Initialize deployment configuration')
  .action(async (name: string) => {
    try {
      const projectName = name || 'my-app'
      await ConfigManager.initConfig(projectName)
      logger.success('Configuration initialized successfully')
    } catch (error: any) {
      logger.error('Failed to initialize configuration:', error.message)
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


