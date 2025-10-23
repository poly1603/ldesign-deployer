/**
 * Horizontal Pod Autoscaler 管理器
 */

import { toYaml } from '../utils/template-engine.js'
import { writeFile } from '../utils/file-system.js'
import { logger } from '../utils/logger.js'
import type { HPAConfig } from '../types/index.js'

export class HPAManager {
  /**
   * 生成 HPA 清单
   */
  generateManifest(name: string, config: HPAConfig, namespace = 'default'): string {
    const hpa = {
      apiVersion: 'autoscaling/v2',
      kind: 'HorizontalPodAutoscaler',
      metadata: {
        name: `${name}-hpa`,
        namespace,
      },
      spec: {
        scaleTargetRef: {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          name,
        },
        minReplicas: config.minReplicas,
        maxReplicas: config.maxReplicas,
        metrics: config.metrics.map(m => ({
          type: m.type,
          resource: m.resource ? {
            name: m.resource.name,
            target: m.resource.target,
          } : undefined,
        })),
        behavior: config.behavior,
      },
    }

    return toYaml(hpa, 0)
  }

  /**
   * 生成默认 CPU HPA
   */
  generateDefaultCPUHPA(name: string, min = 2, max = 10): string {
    const config: HPAConfig = {
      minReplicas: min,
      maxReplicas: max,
      metrics: [{
        type: 'Resource',
        resource: {
          name: 'cpu',
          target: {
            type: 'Utilization',
            averageUtilization: 70,
          },
        },
      }],
    }

    return this.generateManifest(name, config)
  }

  /**
   * 保存 HPA 到文件
   */
  async save(name: string, config: HPAConfig, outputPath: string): Promise<void> {
    const manifest = this.generateManifest(name, config)
    await writeFile(outputPath, manifest)
    logger.success(`HPA manifest saved: ${outputPath}`)
  }
}




