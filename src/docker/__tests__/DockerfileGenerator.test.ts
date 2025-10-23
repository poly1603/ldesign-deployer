/**
 * DockerfileGenerator 测试
 */

import { describe, it, expect } from 'vitest'
import { DockerfileGenerator } from '../DockerfileGenerator.js'

describe('DockerfileGenerator', () => {
  const generator = new DockerfileGenerator()

  describe('generate', () => {
    it('should generate Node.js Dockerfile', () => {
      const dockerfile = generator.generate({
        projectType: 'node',
        nodeVersion: '20',
        port: 3000,
      })
      
      expect(dockerfile).toContain('FROM node:20-alpine')
      expect(dockerfile).toContain('WORKDIR /app')
      expect(dockerfile).toContain('EXPOSE 3000')
      expect(dockerfile).toContain('HEALTHCHECK')
    })

    it('should generate multi-stage Node.js Dockerfile', () => {
      const dockerfile = generator.generate({
        projectType: 'node',
        nodeVersion: '20',
        port: 3000,
        multiStage: true,
      })
      
      expect(dockerfile).toContain('FROM node:20-alpine AS builder')
      expect(dockerfile).toContain('FROM node:20-alpine')
      expect(dockerfile).toContain('COPY --from=builder')
      expect(dockerfile).toContain('USER nodejs')
    })

    it('should generate static website Dockerfile', () => {
      const dockerfile = generator.generate({
        projectType: 'static',
        port: 80,
      })
      
      expect(dockerfile).toContain('FROM nginx:alpine')
      expect(dockerfile).toContain('EXPOSE 80')
    })

    it('should generate SPA Dockerfile with build', () => {
      const dockerfile = generator.generate({
        projectType: 'spa',
        nodeVersion: '20',
        buildCommand: 'npm run build',
      })
      
      expect(dockerfile).toContain('FROM node:20-alpine AS builder')
      expect(dockerfile).toContain('npm run build')
      expect(dockerfile).toContain('FROM nginx:alpine')
      expect(dockerfile).toContain('COPY --from=builder')
    })

    it('should generate custom Dockerfile', () => {
      const dockerfile = generator.generate({
        projectType: 'custom',
        baseImage: 'alpine:latest',
        port: 8080,
      })
      
      expect(dockerfile).toContain('FROM alpine:latest')
      expect(dockerfile).toContain('EXPOSE 8080')
    })

    it('should throw error for unsupported project type', () => {
      expect(() =>
        generator.generate({
          projectType: 'unknown' as any,
        })
      ).toThrow('Unsupported project type')
    })
  })

  describe('generateDockerignore', () => {
    it('should generate .dockerignore content', () => {
      const dockerignore = generator.generateDockerignore()
      
      expect(dockerignore).toContain('node_modules/')
      expect(dockerignore).toContain('*.log')
      expect(dockerignore).toContain('.git/')
      expect(dockerignore).toContain('.env')
      expect(dockerignore).toContain('coverage/')
    })
  })
})



