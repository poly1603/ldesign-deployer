/**
 * Dockerfile 生成器
 * @module docker/DockerfileGenerator
 * 
 * @description 根据项目类型和配置生成优化的 Dockerfile
 */

import { renderTemplate } from '../utils/template-engine.js'
import { logger } from '../utils/logger.js'
import type { DockerfileOptions } from '../types/index.js'
import {
  DEFAULT_NODE_VERSION,
  DEFAULT_WORK_DIR,
  DEFAULT_NGINX_ROOT,
  DEFAULT_PORT,
  DEFAULT_HTTP_PORT,
  DEFAULT_INSTALL_COMMAND,
  DEFAULT_BUILD_COMMAND,
  DEFAULT_START_COMMAND,
} from '../constants/index.js'

/**
 * Dockerfile 生成器类
 * 
 * @description 支持多种项目类型的 Dockerfile 生成，包括 Node.js、静态网站、SPA 等
 * 
 * @example
 * ```typescript
 * const generator = new DockerfileGenerator();
 * const dockerfile = generator.generate({
 *   projectType: 'node',
 *   multiStage: true,
 *   optimize: true
 * });
 * ```
 */
export class DockerfileGenerator {
  /**
   * 生成 Dockerfile
   * 
   * @param options - Dockerfile 生成选项
   * @returns 生成的 Dockerfile 内容
   * @throws {Error} 当项目类型不支持时抛出
   * 
   * @example
   * ```typescript
   * const dockerfile = generator.generate({
   *   projectType: 'node',
   *   nodeVersion: '20',
   *   port: 3000,
   *   multiStage: true
   * });
   * ```
   */
  generate(options: DockerfileOptions): string {
    logger.debug('Generating Dockerfile with options:', options)

    switch (options.projectType) {
      case 'node':
        return this.generateNodeDockerfile(options)
      case 'static':
      case 'spa':
        return this.generateStaticDockerfile(options)
      case 'custom':
        return this.generateCustomDockerfile(options)
      default:
        throw new Error(`Unsupported project type: ${options.projectType}`)
    }
  }

  /**
   * 生成 Node.js Dockerfile
   * 
   * @private
   * @param options - 生成选项
   * @returns Dockerfile 内容
   */
  private generateNodeDockerfile(options: DockerfileOptions): string {
    const nodeVersion = options.nodeVersion || DEFAULT_NODE_VERSION
    const workDir = options.workDir || DEFAULT_WORK_DIR
    const port = options.port || DEFAULT_PORT
    const installCommand = options.installCommand || DEFAULT_INSTALL_COMMAND
    const buildCommand = options.buildCommand || DEFAULT_BUILD_COMMAND
    const startCommand = options.startCommand || DEFAULT_START_COMMAND

    if (options.multiStage) {
      return this.generateMultiStageNodeDockerfile({
        nodeVersion,
        workDir,
        port,
        installCommand,
        buildCommand,
        startCommand,
      })
    }

    const template = `
# Node.js Application Dockerfile
FROM node:{{nodeVersion}}-alpine

# Set working directory
WORKDIR {{workDir}}

# Copy package files
COPY package*.json ./

# Install dependencies
RUN {{installCommand}}

# Copy application files
COPY . .

{{#if buildCommand}}
# Build application
RUN {{buildCommand}}
{{/if}}

# Expose port
EXPOSE {{port}}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:{{port}}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD [{{startCommand}}]
`.trim()

    return renderTemplate(template, {
      nodeVersion,
      workDir,
      port,
      installCommand,
      buildCommand: options.buildCommand,
      startCommand: this.formatCommand(startCommand),
    })
  }

  /**
   * 生成多阶段 Node.js Dockerfile
   */
  private generateMultiStageNodeDockerfile(options: {
    nodeVersion: string
    workDir: string
    port: number
    installCommand: string
    buildCommand: string
    startCommand: string
  }): string {
    const template = `
# Multi-stage Node.js Application Dockerfile

# Stage 1: Build
FROM node:{{nodeVersion}}-alpine AS builder

WORKDIR {{workDir}}

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN {{installCommand}}

# Copy source files
COPY . .

# Build application
RUN {{buildCommand}}

# Stage 2: Production
FROM node:{{nodeVersion}}-alpine

WORKDIR {{workDir}}

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder {{workDir}}/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs {{workDir}}

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE {{port}}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:{{port}}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD [{{startCommand}}]
`.trim()

    return renderTemplate(template, {
      ...options,
      startCommand: this.formatCommand(options.startCommand),
    })
  }

  /**
   * 生成静态网站 Dockerfile
   * 
   * @private
   * @param options - 生成选项
   * @returns Dockerfile 内容
   */
  private generateStaticDockerfile(options: DockerfileOptions): string {
    const workDir = options.workDir || DEFAULT_NGINX_ROOT
    const port = options.port || DEFAULT_HTTP_PORT

    if (options.buildCommand) {
      // 需要构建的静态网站（如 React, Vue）
      return this.generateSPADockerfile(options)
    }

    const template = `
# Static Website Dockerfile
FROM nginx:alpine

# Copy static files
COPY . {{workDir}}

# Copy nginx configuration (if exists)
COPY nginx.conf /etc/nginx/nginx.conf 2>/dev/null || true

# Expose port
EXPOSE {{port}}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget --quiet --tries=1 --spider http://localhost:{{port}}/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
`.trim()

    return renderTemplate(template, { workDir, port })
  }

  /**
   * 生成 SPA Dockerfile（需要构建）
   * 
   * @private
   * @param options - 生成选项
   * @returns Dockerfile 内容
   */
  private generateSPADockerfile(options: DockerfileOptions): string {
    const nodeVersion = options.nodeVersion || DEFAULT_NODE_VERSION
    const workDir = DEFAULT_WORK_DIR
    const nginxRoot = DEFAULT_NGINX_ROOT
    const port = options.port || DEFAULT_HTTP_PORT
    const installCommand = options.installCommand || DEFAULT_INSTALL_COMMAND
    const buildCommand = options.buildCommand || DEFAULT_BUILD_COMMAND

    const template = `
# SPA Application Dockerfile (Multi-stage)

# Stage 1: Build
FROM node:{{nodeVersion}}-alpine AS builder

WORKDIR {{workDir}}

# Copy package files
COPY package*.json ./

# Install dependencies
RUN {{installCommand}}

# Copy source files
COPY . .

# Build application
RUN {{buildCommand}}

# Stage 2: Production
FROM nginx:alpine

# Copy built files
COPY --from=builder {{workDir}}/dist {{nginxRoot}}

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf 2>/dev/null || \\
  echo 'server { listen {{port}}; location / { root {{nginxRoot}}; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE {{port}}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget --quiet --tries=1 --spider http://localhost:{{port}} || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
`.trim()

    return renderTemplate(template, {
      nodeVersion,
      workDir,
      nginxRoot,
      port,
      installCommand,
      buildCommand,
    })
  }

  /**
   * 生成自定义 Dockerfile
   */
  private generateCustomDockerfile(options: DockerfileOptions): string {
    const baseImage = options.baseImage || 'alpine:latest'
    const workDir = options.workDir || '/app'
    const port = options.port || 8080

    const template = `
# Custom Dockerfile
FROM {{baseImage}}

WORKDIR {{workDir}}

# Copy application files
COPY . .

{{#if port}}
# Expose port
EXPOSE {{port}}
{{/if}}

# Add your custom commands here
# RUN <your-build-commands>

# Start application
CMD ["sh", "-c", "echo 'Add your start command here'"]
`.trim()

    return renderTemplate(template, { baseImage, workDir, port: port || null })
  }

  /**
   * 生成 .dockerignore 文件
   * 
   * @returns .dockerignore 文件内容
   * 
   * @example
   * ```typescript
   * const generator = new DockerfileGenerator();
   * const dockerignore = generator.generateDockerignore();
   * await fs.writeFile('.dockerignore', dockerignore);
   * ```
   */
  generateDockerignore(): string {
    return `
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Build outputs
dist/
build/
.next/
out/

# Testing
coverage/
.nyc_output/
*.test.js
*.spec.js

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Git
.git/
.gitignore
.gitattributes

# CI/CD
.github/
.gitlab-ci.yml
.travis.yml

# Documentation
*.md
docs/

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log
`.trim()
  }

  /**
   * 格式化命令为 JSON 数组格式
   * 
   * @private
   * @param command - 命令字符串
   * @returns JSON 格式的命令数组字符串
   * 
   * @example
   * ```typescript
   * formatCommand('npm start'); // '["npm", "start"]'
   * formatCommand('node index.js'); // '["node", "index.js"]'
   * ```
   */
  private formatCommand(command: string): string {
    // 如果已经是数组格式，直接返回
    if (command.startsWith('[')) {
      return command
    }

    // 解析命令为数组
    const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || []
    const formatted = parts.map(part => {
      // 移除引号
      if (part.startsWith('"') && part.endsWith('"')) {
        part = part.slice(1, -1)
      }
      return `"${part}"`
    })

    return `[${formatted.join(', ')}]`
  }
}




