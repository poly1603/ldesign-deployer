/**
 * Kubernetes 部署管理器
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from '../utils/logger.js'
import { writeFile } from '../utils/file-system.js'
import type { K8sDeployOptions } from '../types/index.js'

const execAsync = promisify(exec)

export class DeploymentManager {
  /**
   * 应用清单
   */
  async apply(manifestContent: string, options: K8sDeployOptions): Promise<void> {
    logger.info('Applying Kubernetes manifests...')

    try {
      // 写入临时文件
      const tempFile = '/tmp/k8s-manifest.yaml'
      await writeFile(tempFile, manifestContent)

      // 构建 kubectl 命令
      const args: string[] = ['apply', '-f', tempFile]

      if (options.namespace) {
        args.push('-n', options.namespace)
      }

      if (options.context) {
        args.push('--context', options.context)
      }

      if (options.dryRun) {
        args.push('--dry-run=client')
      }

      const command = `kubectl ${args.join(' ')}`
      logger.debug(`Executing: ${command}`)

      const { stdout, stderr } = await execAsync(command)

      if (stdout) {
        logger.info(stdout)
      }

      if (stderr) {
        logger.warn(stderr)
      }

      logger.success('Manifests applied successfully')

      // 等待就绪
      if (options.wait && !options.dryRun) {
        await this.waitForReady(options)
      }
    } catch (error: any) {
      logger.error('Failed to apply manifests:', error.message)
      throw error
    }
  }

  /**
   * 删除资源
   */
  async delete(resourceType: string, name: string, options: K8sDeployOptions): Promise<void> {
    logger.info(`Deleting ${resourceType}/${name}...`)

    try {
      const args: string[] = ['delete', resourceType, name]

      if (options.namespace) {
        args.push('-n', options.namespace)
      }

      if (options.context) {
        args.push('--context', options.context)
      }

      const command = `kubectl ${args.join(' ')}`
      await execAsync(command)

      logger.success(`${resourceType}/${name} deleted`)
    } catch (error: any) {
      logger.error('Failed to delete resource:', error.message)
      throw error
    }
  }

  /**
   * 获取部署状态
   */
  async getStatus(name: string, options: K8sDeployOptions): Promise<any> {
    try {
      const args: string[] = ['get', 'deployment', name, '-o', 'json']

      if (options.namespace) {
        args.push('-n', options.namespace)
      }

      if (options.context) {
        args.push('--context', options.context)
      }

      const { stdout } = await execAsync(`kubectl ${args.join(' ')}`)
      return JSON.parse(stdout)
    } catch (error: any) {
      logger.error('Failed to get deployment status:', error.message)
      return null
    }
  }

  /**
   * 等待部署就绪
   */
  async waitForReady(options: K8sDeployOptions): Promise<void> {
    logger.info('Waiting for deployment to be ready...')

    try {
      const args: string[] = ['wait', '--for=condition=available', 'deployment', '--all']

      if (options.namespace) {
        args.push('-n', options.namespace)
      }

      if (options.timeout) {
        args.push(`--timeout=${options.timeout}s`)
      }

      await execAsync(`kubectl ${args.join(' ')}`)
      logger.success('Deployment is ready')
    } catch (error: any) {
      logger.error('Deployment did not become ready:', error.message)
      throw error
    }
  }

  /**
   * 扩缩容
   */
  async scale(name: string, replicas: number, options: K8sDeployOptions): Promise<void> {
    logger.info(`Scaling ${name} to ${replicas} replicas...`)

    try {
      const args: string[] = ['scale', 'deployment', name, `--replicas=${replicas}`]

      if (options.namespace) {
        args.push('-n', options.namespace)
      }

      await execAsync(`kubectl ${args.join(' ')}`)
      logger.success(`Scaled to ${replicas} replicas`)
    } catch (error: any) {
      logger.error('Failed to scale deployment:', error.message)
      throw error
    }
  }

  /**
   * 重启部署
   */
  async restart(name: string, options: K8sDeployOptions): Promise<void> {
    logger.info(`Restarting deployment ${name}...`)

    try {
      const args: string[] = ['rollout', 'restart', 'deployment', name]

      if (options.namespace) {
        args.push('-n', options.namespace)
      }

      await execAsync(`kubectl ${args.join(' ')}`)
      logger.success('Deployment restarted')
    } catch (error: any) {
      logger.error('Failed to restart deployment:', error.message)
      throw error
    }
  }

  /**
   * 查看 Pod 日志
   */
  async getLogs(name: string, options: K8sDeployOptions & { tail?: number }): Promise<string> {
    try {
      const args: string[] = ['logs', `deployment/${name}`]

      if (options.namespace) {
        args.push('-n', options.namespace)
      }

      if (options.tail) {
        args.push(`--tail=${options.tail}`)
      }

      const { stdout } = await execAsync(`kubectl ${args.join(' ')}`)
      return stdout
    } catch (error: any) {
      logger.error('Failed to get logs:', error.message)
      return ''
    }
  }

  /**
   * 检查 kubectl 是否可用
   */
  async checkKubectl(): Promise<boolean> {
    try {
      await execAsync('kubectl version --client')
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取当前上下文
   */
  async getCurrentContext(): Promise<string> {
    try {
      const { stdout } = await execAsync('kubectl config current-context')
      return stdout.trim()
    } catch {
      return ''
    }
  }
}




