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
   * 获取 Pod 列表
   */
  async getPods(deploymentName: string, options: K8sDeployOptions): Promise<any[]> {
    try {
      const args: string[] = ['get', 'pods', '-l', `app=${deploymentName}`, '-o', 'json']

      if (options.namespace) {
        args.push('-n', options.namespace)
      }

      if (options.context) {
        args.push('--context', options.context)
      }

      const { stdout } = await execAsync(`kubectl ${args.join(' ')}`)
      const result = JSON.parse(stdout)
      return result.items || []
    } catch (error: any) {
      logger.error('Failed to get pods:', error.message)
      return []
    }
  }

  /**
   * 检查 Pod 健康状态
   */
  async checkPodHealth(deploymentName: string, options: K8sDeployOptions): Promise<boolean> {
    const pods = await this.getPods(deploymentName, options)
    
    if (pods.length === 0) {
      logger.warn('No pods found')
      return false
    }

    const healthyPods = pods.filter(pod => {
      const status = pod.status
      const phase = status.phase
      const conditions = status.conditions || []
      
      // 检查 Pod 是否 Running
      if (phase !== 'Running') {
        return false
      }

      // 检查所有容器是否 Ready
      const readyCondition = conditions.find((c: any) => c.type === 'Ready')
      if (!readyCondition || readyCondition.status !== 'True') {
        return false
      }

      return true
    })

    const healthRate = healthyPods.length / pods.length
    logger.info(`Pod health: ${healthyPods.length}/${pods.length} healthy (${(healthRate * 100).toFixed(0)}%)`)

    return healthRate >= 0.8 // 至少 80% Pod 健康
  }

  /**
   * 监控部署进度
   */
  async monitorRollout(deploymentName: string, options: K8sDeployOptions): Promise<boolean> {
    logger.info(`Monitoring rollout for ${deploymentName}...`)

    const maxAttempts = options.timeout ? Math.floor(options.timeout / 5) : 60 // 默认 5 分钟
    let attempts = 0

    while (attempts < maxAttempts) {
      const status = await this.getStatus(deploymentName, options)
      
      if (!status) {
        throw new Error('Failed to get deployment status')
      }

      const spec = status.spec
      const statusObj = status.status
      const desired = spec.replicas || 0
      const current = statusObj.replicas || 0
      const updated = statusObj.updatedReplicas || 0
      const available = statusObj.availableReplicas || 0
      const ready = statusObj.readyReplicas || 0

      logger.info(`Rollout status: ${updated}/${desired} updated, ${available}/${desired} available, ${ready}/${desired} ready`)

      // 检查是否全部就绪
      if (updated === desired && available === desired && ready === desired) {
        logger.success('Rollout completed successfully')
        return true
      }

      // 检查是否有失败的 Pod
      const healthy = await this.checkPodHealth(deploymentName, options)
      if (!healthy && attempts > 3) {
        throw new Error('Too many unhealthy pods detected')
      }

      attempts++
      await new Promise(resolve => setTimeout(resolve, 5000)) // 等待 5 秒
    }

    throw new Error('Rollout timeout')
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

  /**
   * 完整部署流程（包含健康检查和监控）
   */
  async deployWithMonitoring(
    manifestContent: string,
    deploymentName: string,
    options: K8sDeployOptions
  ): Promise<boolean> {
    logger.info('Starting deployment with monitoring...')

    // 1. 检查 kubectl
    const kubectlAvailable = await this.checkKubectl()
    if (!kubectlAvailable) {
      throw new Error('kubectl is not available')
    }

    // 2. 应用清单
    await this.apply(manifestContent, options)

    // 3. 监控滚动更新
    if (!options.dryRun) {
      await this.monitorRollout(deploymentName, options)

      // 4. 最终健康检查
      const healthy = await this.checkPodHealth(deploymentName, options)
      if (!healthy) {
        throw new Error('Final health check failed')
      }
    }

    logger.success('Deployment completed successfully with all health checks passed')
    return true
  }
}
