/**
 * Jenkins Pipeline 生成器
 */

import { writeFile } from '../utils/file-system.js'
import { logger } from '../utils/logger.js'
import type { DeployConfig } from '../types/index.js'

export class JenkinsPipeline {
  /**
   * 生成 Jenkins Pipeline
   */
  async generate(config: DeployConfig, outputPath = 'Jenkinsfile'): Promise<void> {
    logger.info('Generating Jenkins pipeline...')

    const pipeline = this.generatePipeline(config)
    await writeFile(outputPath, pipeline)

    logger.success(`Jenkins pipeline generated: ${outputPath}`)
  }

  /**
   * 生成 Pipeline 内容
   */
  private generatePipeline(config: DeployConfig): string {
    return `pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = '${config.docker?.registry || 'docker.io'}'
        IMAGE_NAME = '${config.docker?.image || config.name}'
        IMAGE_TAG = "\${GIT_COMMIT.substring(0, 7)}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Docker Build') {
            steps {
                script {
                    docker.build("\${DOCKER_REGISTRY}/\${IMAGE_NAME}:\${IMAGE_TAG}")
                }
            }
        }

        stage('Docker Push') {
            steps {
                script {
                    docker.withRegistry("https://\${DOCKER_REGISTRY}", 'docker-credentials') {
                        docker.image("\${DOCKER_REGISTRY}/\${IMAGE_NAME}:\${IMAGE_TAG}").push()
                        docker.image("\${DOCKER_REGISTRY}/\${IMAGE_NAME}:\${IMAGE_TAG}").push('latest')
                    }
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                echo 'Deploying to staging...'
                // Add deployment commands
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                echo 'Deploying to production...'
                // Add deployment commands
            }
        }

        stage('Health Check') {
            steps {
                sh 'curl -f https://\${APP_URL}/health || exit 1'
            }
        }
    }

    post {
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed!'
        }
    }
}
`
  }
}




