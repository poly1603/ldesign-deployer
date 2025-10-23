/**
 * GitHub Actions 工作流生成器
 */

import { writeFile, ensureDir } from '../utils/file-system.js'
import { logger } from '../utils/logger.js'
import { join } from 'path'
import type { DeployConfig } from '../types/index.js'

export class GitHubActions {
  /**
   * 生成 GitHub Actions 工作流
   */
  async generate(config: DeployConfig, outputDir = '.github/workflows'): Promise<void> {
    logger.info('Generating GitHub Actions workflow...')

    await ensureDir(outputDir)

    const workflow = this.generateWorkflow(config)
    const filePath = join(outputDir, 'deploy.yml')

    await writeFile(filePath, workflow)
    logger.success(`GitHub Actions workflow generated: ${filePath}`)
  }

  /**
   * 生成工作流内容
   */
  private generateWorkflow(config: DeployConfig): string {
    return `name: Deploy

on:
  push:
    branches:
      - main
      - develop
  workflow_dispatch:

env:
  REGISTRY: ${config.docker?.registry || 'docker.io'}
  IMAGE_NAME: ${config.docker?.image || config.name}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build application
        run: npm run build

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ secrets.DOCKER_USERNAME }}
          password: \${{ secrets.DOCKER_PASSWORD }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment: staging

    steps:
      - name: Deploy to Staging
        run: |
          echo "Deploying to staging environment..."
          # Add your deployment commands here

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - name: Deploy to Production
        run: |
          echo "Deploying to production environment..."
          # Add your deployment commands here

      - name: Health Check
        run: |
          echo "Performing health check..."
          curl -f https://\${APP_URL}/health || exit 1
`
  }

  /**
   * 生成简化的工作流
   */
  generateSimpleWorkflow(config: DeployConfig): string {
    return `name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy
        run: |
          npm install -g @ldesign/deployer
          ldesign-deployer deploy --env production
        env:
          DEPLOY_TOKEN: \${{ secrets.DEPLOY_TOKEN }}
`
  }
}




