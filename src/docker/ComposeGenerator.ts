/**
 * Docker Compose 配置生成器
 */

import { toYaml } from '../utils/template-engine.js'
import { logger } from '../utils/logger.js'
import type { ComposeConfig, ComposeService } from '../types/index.js'

export interface ComposeGeneratorOptions {
  version?: string
  projectName?: string
}

export class ComposeGenerator {
  private version: string

  constructor(options: ComposeGeneratorOptions = {}) {
    this.version = options.version || '3.8'
  }

  /**
   * 生成 docker-compose.yml
   */
  generate(config: Partial<ComposeConfig>): string {
    logger.debug('Generating docker-compose.yml')

    const compose: ComposeConfig = {
      version: this.version,
      services: config.services || {},
      networks: config.networks,
      volumes: config.volumes,
    }

    // 移除 undefined 值
    const cleaned = this.cleanConfig(compose)

    return this.toYamlString(cleaned)
  }

  /**
   * 添加服务
   */
  addService(name: string, service: ComposeService): void {
    logger.debug(`Adding service: ${name}`)
  }

  /**
   * 生成简单的 Node.js 服务配置
   */
  generateNodeService(options: {
    name: string
    image?: string
    build?: boolean
    port?: number
    env?: Record<string, string>
  }): ComposeService {
    const service: ComposeService = {
      container_name: options.name,
      ports: options.port ? [`${options.port}:${options.port}`] : undefined,
      environment: options.env,
      restart: 'unless-stopped',
    }

    if (options.build) {
      service.build = {
        context: '.',
        dockerfile: 'Dockerfile',
      }
    } else {
      service.image = options.image || `${options.name}:latest`
    }

    return service
  }

  /**
   * 生成数据库服务配置
   */
  generateDatabaseService(options: {
    type: 'postgres' | 'mysql' | 'mongodb' | 'redis'
    name?: string
    port?: number
    env?: Record<string, string>
    volume?: string
  }): ComposeService {
    const defaults = this.getDatabaseDefaults(options.type)
    const name = options.name || options.type

    const service: ComposeService = {
      image: defaults.image,
      container_name: name,
      ports: options.port ? [`${options.port}:${defaults.port}`] : undefined,
      environment: { ...defaults.env, ...options.env },
      volumes: options.volume ? [`${options.volume}:${defaults.dataDir}`] : undefined,
      restart: 'unless-stopped',
    }

    return service
  }

  /**
   * 生成完整的应用栈
   */
  generateFullStack(options: {
    appName: string
    appPort?: number
    database?: 'postgres' | 'mysql' | 'mongodb'
    redis?: boolean
    nginx?: boolean
  }): string {
    const services: Record<string, ComposeService> = {}

    // 应用服务
    services.app = this.generateNodeService({
      name: options.appName,
      build: true,
      port: options.appPort || 3000,
    })

    // 数据库
    if (options.database) {
      services[options.database] = this.generateDatabaseService({
        type: options.database,
      })

      // 应用依赖数据库
      services.app.depends_on = [options.database]
    }

    // Redis
    if (options.redis) {
      services.redis = this.generateDatabaseService({
        type: 'redis',
      })

      if (!services.app.depends_on) {
        services.app.depends_on = []
      }
      services.app.depends_on.push('redis')
    }

    // Nginx
    if (options.nginx) {
      services.nginx = {
        image: 'nginx:alpine',
        container_name: 'nginx',
        ports: ['80:80'],
        volumes: ['./nginx.conf:/etc/nginx/nginx.conf:ro'],
        depends_on: ['app'],
        restart: 'unless-stopped',
      }
    }

    return this.generate({
      services,
      networks: {
        default: {
          driver: 'bridge',
        },
      },
    })
  }

  /**
   * 获取数据库默认配置
   */
  private getDatabaseDefaults(type: string): {
    image: string
    port: number
    dataDir: string
    env: Record<string, string>
  } {
    switch (type) {
      case 'postgres':
        return {
          image: 'postgres:15-alpine',
          port: 5432,
          dataDir: '/var/lib/postgresql/data',
          env: {
            POSTGRES_USER: 'postgres',
            POSTGRES_PASSWORD: 'postgres',
            POSTGRES_DB: 'app',
          },
        }
      case 'mysql':
        return {
          image: 'mysql:8-alpine',
          port: 3306,
          dataDir: '/var/lib/mysql',
          env: {
            MYSQL_ROOT_PASSWORD: 'root',
            MYSQL_DATABASE: 'app',
          },
        }
      case 'mongodb':
        return {
          image: 'mongo:7',
          port: 27017,
          dataDir: '/data/db',
          env: {
            MONGO_INITDB_ROOT_USERNAME: 'root',
            MONGO_INITDB_ROOT_PASSWORD: 'root',
          },
        }
      case 'redis':
        return {
          image: 'redis:7-alpine',
          port: 6379,
          dataDir: '/data',
          env: {},
        }
      default:
        throw new Error(`Unsupported database type: ${type}`)
    }
  }

  /**
   * 清理配置对象（移除 undefined）
   */
  private cleanConfig(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanConfig(item)).filter(item => item !== undefined)
    }

    if (obj && typeof obj === 'object') {
      const cleaned: any = {}
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.cleanConfig(value)
        }
      }
      return cleaned
    }

    return obj
  }

  /**
   * 转换为 YAML 字符串
   */
  private toYamlString(config: ComposeConfig): string {
    let yaml = `version: '${config.version}'\n\n`

    if (config.services && Object.keys(config.services).length > 0) {
      yaml += 'services:\n'
      for (const [name, service] of Object.entries(config.services)) {
        yaml += `  ${name}:\n`
        yaml += this.serviceToYaml(service, 4)
      }
    }

    if (config.networks && Object.keys(config.networks).length > 0) {
      yaml += '\nnetworks:\n'
      yaml += toYaml(config.networks, 1)
    }

    if (config.volumes && Object.keys(config.volumes).length > 0) {
      yaml += '\nvolumes:\n'
      yaml += toYaml(config.volumes, 1)
    }

    return yaml
  }

  /**
   * 服务配置转 YAML
   */
  private serviceToYaml(service: ComposeService, indent: number): string {
    const spaces = ' '.repeat(indent)
    let yaml = ''

    if (service.image) {
      yaml += `${spaces}image: ${service.image}\n`
    }

    if (service.build) {
      yaml += `${spaces}build:\n`
      if (typeof service.build === 'string') {
        yaml += `${spaces}  context: ${service.build}\n`
      } else {
        yaml += `${spaces}  context: ${service.build.context}\n`
        if (service.build.dockerfile) {
          yaml += `${spaces}  dockerfile: ${service.build.dockerfile}\n`
        }
        if (service.build.args) {
          yaml += `${spaces}  args:\n`
          for (const [key, value] of Object.entries(service.build.args)) {
            yaml += `${spaces}    ${key}: ${value}\n`
          }
        }
      }
    }

    if (service.container_name) {
      yaml += `${spaces}container_name: ${service.container_name}\n`
    }

    if (service.ports && service.ports.length > 0) {
      yaml += `${spaces}ports:\n`
      for (const port of service.ports) {
        yaml += `${spaces}  - "${port}"\n`
      }
    }

    if (service.environment) {
      yaml += `${spaces}environment:\n`
      const env = Array.isArray(service.environment) ? service.environment : service.environment

      if (Array.isArray(env)) {
        for (const e of env) {
          yaml += `${spaces}  - ${e}\n`
        }
      } else {
        for (const [key, value] of Object.entries(env)) {
          yaml += `${spaces}  ${key}: ${value}\n`
        }
      }
    }

    if (service.volumes && service.volumes.length > 0) {
      yaml += `${spaces}volumes:\n`
      for (const volume of service.volumes) {
        yaml += `${spaces}  - ${volume}\n`
      }
    }

    if (service.depends_on && service.depends_on.length > 0) {
      yaml += `${spaces}depends_on:\n`
      for (const dep of service.depends_on) {
        yaml += `${spaces}  - ${dep}\n`
      }
    }

    if (service.restart) {
      yaml += `${spaces}restart: ${service.restart}\n`
    }

    if (service.networks && service.networks.length > 0) {
      yaml += `${spaces}networks:\n`
      for (const network of service.networks) {
        yaml += `${spaces}  - ${network}\n`
      }
    }

    if (service.command) {
      const cmd = Array.isArray(service.command) ? service.command.join(' ') : service.command
      yaml += `${spaces}command: ${cmd}\n`
    }

    if (service.healthcheck) {
      yaml += `${spaces}healthcheck:\n`
      const test = Array.isArray(service.healthcheck.test)
        ? service.healthcheck.test.join(' ')
        : service.healthcheck.test
      yaml += `${spaces}  test: ${test}\n`

      if (service.healthcheck.interval) {
        yaml += `${spaces}  interval: ${service.healthcheck.interval}\n`
      }
      if (service.healthcheck.timeout) {
        yaml += `${spaces}  timeout: ${service.healthcheck.timeout}\n`
      }
      if (service.healthcheck.retries) {
        yaml += `${spaces}  retries: ${service.healthcheck.retries}\n`
      }
      if (service.healthcheck.start_period) {
        yaml += `${spaces}  start_period: ${service.healthcheck.start_period}\n`
      }
    }

    return yaml
  }
}




