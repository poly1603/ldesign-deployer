import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'LDesign Deployer',
  description: '企业级部署工具 - 让应用发布变得简单可靠',
  lang: 'zh-CN',
  
  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: '指南', link: '/guide/introduction' },
      { text: 'API', link: '/api/core' },
      { text: '示例', link: '/examples/basic-deployment' },
      { 
        text: '生态',
        items: [
          { text: '模板市场', link: '/templates/overview' },
          { text: '插件', link: '/plugins/overview' }
        ]
      },
      { 
        text: 'v0.4.0',
        items: [
          { text: '更新日志', link: '/changelog' },
          { text: '贡献指南', link: '/contributing' }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '介绍', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装', link: '/guide/installation' }
          ]
        },
        {
          text: '核心概念',
          items: [
            { text: '配置文件', link: '/guide/configuration' },
            { text: '部署策略', link: '/guide/strategies' },
            { text: '环境管理', link: '/guide/environments' },
            { text: '版本管理', link: '/guide/versioning' }
          ]
        },
        {
          text: '部署平台',
          items: [
            { text: 'Docker', link: '/guide/docker' },
            { text: 'Kubernetes', link: '/guide/kubernetes' },
            { text: 'Docker Compose', link: '/guide/docker-compose' }
          ]
        },
        {
          text: '高级功能',
          items: [
            { text: '蓝绿部署', link: '/guide/blue-green' },
            { text: '金丝雀发布', link: '/guide/canary' },
            { text: '回滚机制', link: '/guide/rollback' },
            { text: '健康检查', link: '/guide/health-check' },
            { text: '通知系统', link: '/guide/notifications' },
            { text: '监控集成', link: '/guide/monitoring' }
          ]
        },
        {
          text: 'CI/CD',
          items: [
            { text: 'GitHub Actions', link: '/guide/github-actions' },
            { text: 'GitLab CI', link: '/guide/gitlab-ci' },
            { text: 'Jenkins', link: '/guide/jenkins' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '核心 API', link: '/api/core' },
            { text: '部署器', link: '/api/deployer' },
            { text: '策略', link: '/api/strategies' },
            { text: '回滚', link: '/api/rollback' },
            { text: '通知', link: '/api/notifications' },
            { text: '模板', link: '/api/templates' },
            { text: '工具函数', link: '/api/utils' }
          ]
        }
      ],
      '/examples/': [
        {
          text: '基础示例',
          items: [
            { text: '基础部署', link: '/examples/basic-deployment' },
            { text: 'Docker 部署', link: '/examples/docker' },
            { text: 'Kubernetes 部署', link: '/examples/kubernetes' }
          ]
        },
        {
          text: '高级示例',
          items: [
            { text: '蓝绿部署', link: '/examples/blue-green' },
            { text: '金丝雀发布', link: '/examples/canary' },
            { text: '多渠道通知', link: '/examples/notifications' },
            { text: '完整流程', link: '/examples/complete-workflow' }
          ]
        },
        {
          text: '实战案例',
          items: [
            { text: 'Node.js 应用', link: '/examples/nodejs-app' },
            { text: 'React 应用', link: '/examples/react-app' },
            { text: '微服务', link: '/examples/microservices' }
          ]
        }
      ],
      '/templates/': [
        {
          text: '模板系统',
          items: [
            { text: '概览', link: '/templates/overview' },
            { text: '使用模板', link: '/templates/usage' },
            { text: '自定义模板', link: '/templates/custom' }
          ]
        },
        {
          text: '预置模板',
          items: [
            { text: 'Express', link: '/templates/express' },
            { text: 'NestJS', link: '/templates/nestjs' },
            { text: 'Next.js', link: '/templates/nextjs' },
            { text: 'React', link: '/templates/react' },
            { text: 'Vue', link: '/templates/vue' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ldesign/deployer' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 LDesign Team'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/ldesign/deployer/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    },

    lastUpdated: {
      text: '最后更新',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    }
  },

  markdown: {
    lineNumbers: true
  }
})
