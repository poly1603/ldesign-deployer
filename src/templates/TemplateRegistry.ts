/**
 * 模板注册表
 * @module templates/TemplateRegistry
 * 
 * @description 管理和提供预定义的部署配置模板
 */

import type { DeployConfig } from '../types/index.js';

/**
 * 模板元数据接口
 */
export interface TemplateMetadata {
  /** 模板唯一标识 */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 项目类型 */
  projectType: 'node' | 'static' | 'spa' | 'ssr' | 'fullstack';
  /** 部署平台 */
  platform: 'docker' | 'kubernetes' | 'docker-compose';
  /** 技术栈标签 */
  tags: string[];
  /** 作者 */
  author?: string;
  /** 版本 */
  version?: string;
  /** 难度级别 */
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * 配置模板接口
 */
export interface ConfigTemplate {
  /** 模板元数据 */
  metadata: TemplateMetadata;
  /** 配置生成函数 */
  generate: (options: TemplateOptions) => DeployConfig;
}

/**
 * 模板选项接口
 */
export interface TemplateOptions {
  /** 应用名称 */
  name: string;
  /** 版本号 */
  version?: string;
  /** 环境 */
  environment?: string;
  /** 端口 */
  port?: number;
  /** 其他自定义选项 */
  [key: string]: any;
}

/**
 * 模板注册表类
 * 
 * @description 管理所有可用的配置模板
 * 
 * @example
 * ```typescript
 * const registry = TemplateRegistry.getInstance();
 * 
 * // 获取所有模板
 * const templates = registry.getAllTemplates();
 * 
 * // 按标签搜索
 * const reactTemplates = registry.searchByTag('react');
 * 
 * // 使用模板
 * const config = registry.useTemplate('express-basic', {
 *   name: 'my-app',
 *   port: 3000
 * });
 * ```
 */
export class TemplateRegistry {
  private static instance: TemplateRegistry;
  private templates: Map<string, ConfigTemplate> = new Map();

  private constructor() {
    // 单例模式，私有构造函数
  }

  /**
   * 获取注册表单例
   * 
   * @returns 注册表实例
   */
  static getInstance(): TemplateRegistry {
    if (!TemplateRegistry.instance) {
      TemplateRegistry.instance = new TemplateRegistry();
    }
    return TemplateRegistry.instance;
  }

  /**
   * 注册模板
   * 
   * @param template - 配置模板
   * @returns 注册表实例（支持链式调用）
   * 
   * @example
   * ```typescript
   * registry.register({
   *   metadata: { id: 'my-template', ... },
   *   generate: (options) => ({ ... })
   * });
   * ```
   */
  register(template: ConfigTemplate): this {
    this.templates.set(template.metadata.id, template);
    return this;
  }

  /**
   * 获取模板
   * 
   * @param id - 模板ID
   * @returns 配置模板或 undefined
   */
  getTemplate(id: string): ConfigTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * 使用模板生成配置
   * 
   * @param id - 模板ID
   * @param options - 模板选项
   * @returns 生成的部署配置
   * @throws {Error} 当模板不存在时抛出
   * 
   * @example
   * ```typescript
   * const config = registry.useTemplate('express-basic', {
   *   name: 'my-app',
   *   version: '1.0.0'
   * });
   * ```
   */
  useTemplate(id: string, options: TemplateOptions): DeployConfig {
    const template = this.getTemplate(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }
    return template.generate(options);
  }

  /**
   * 获取所有模板
   * 
   * @returns 所有模板的元数据数组
   */
  getAllTemplates(): TemplateMetadata[] {
    return Array.from(this.templates.values()).map(t => t.metadata);
  }

  /**
   * 按项目类型搜索模板
   * 
   * @param projectType - 项目类型
   * @returns 匹配的模板元数据数组
   */
  searchByProjectType(projectType: string): TemplateMetadata[] {
    return this.getAllTemplates().filter(t => t.projectType === projectType);
  }

  /**
   * 按平台搜索模板
   * 
   * @param platform - 部署平台
   * @returns 匹配的模板元数据数组
   */
  searchByPlatform(platform: string): TemplateMetadata[] {
    return this.getAllTemplates().filter(t => t.platform === platform);
  }

  /**
   * 按标签搜索模板
   * 
   * @param tag - 标签
   * @returns 匹配的模板元数据数组
   */
  searchByTag(tag: string): TemplateMetadata[] {
    return this.getAllTemplates().filter(t => t.tags.includes(tag));
  }

  /**
   * 按难度搜索模板
   * 
   * @param difficulty - 难度级别
   * @returns 匹配的模板元数据数组
   */
  searchByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): TemplateMetadata[] {
    return this.getAllTemplates().filter(t => t.difficulty === difficulty);
  }

  /**
   * 搜索模板
   * 
   * @param query - 搜索关键词
   * @returns 匹配的模板元数据数组
   */
  search(query: string): TemplateMetadata[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTemplates().filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 获取模板数量
   * 
   * @returns 模板数量
   */
  count(): number {
    return this.templates.size;
  }

  /**
   * 清空所有模板
   */
  clear(): void {
    this.templates.clear();
  }
}

