/**
 * GitLab CI Pipeline 生成器
 */

import { writeFile } from '../utils/file-system.js'
import { logger } from '../utils/logger.js'
import type { DeployConfig } from '../types/index.js'

export class GitLabCI {
  /**
   * 生成 GitLab CI Pipeline
   */
  async generate(config: DeployConfig, outputPath = '.gitlab-ci.yml'): Promise<void> {
    logger.info('Generating GitLab CI pipeline...')

    const pipeline = this.generatePipeline(config)
    await writeFile(outputPath, pipeline)

    logger.success(`GitLab CI pipeline generated: ${outputPath}`)
  }

  /**
   * 生成 Pipeline 内容
   */
  private generatePipeline(config: DeployConfig): string {
    return `stages:
  - test
  - build
  - deploy

variables:
  DOCKER_REGISTRY: ${config.docker?.registry || 'docker.io'}
  IMAGE_NAME: ${config.docker?.image || config.name}
  IMAGE_TAG: \${CI_COMMIT_SHORT_SHA}

# Test stage
test:
  stage: test
  image: node:20-alpine
  script:
    - npm ci
    - npm test
  only:
    - merge_requests
    - main
    - develop

# Build stage
build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $DOCKER_REGISTRY
  script:
    - docker build -t $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG .
    - docker push $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG
    - docker tag $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG $DOCKER_REGISTRY/$IMAGE_NAME:latest
    - docker push $DOCKER_REGISTRY/$IMAGE_NAME:latest
  only:
    - main
    - develop

# Deploy to staging
deploy:staging:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    - echo "Deploying to staging..."
    # Add your deployment commands
  environment:
    name: staging
    url: https://staging.example.com
  only:
    - develop

# Deploy to production
deploy:production:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    - echo "Deploying to production..."
    # Add your deployment commands
  environment:
    name: production
    url: https://production.example.com
  only:
    - main
  when: manual
`
  }
}




