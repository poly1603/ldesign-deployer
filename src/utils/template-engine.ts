/**
 * 简单的模板引擎
 */

/**
 * 模板变量
 */
export type TemplateVariables = Record<string, any>

/**
 * 渲染模板
 * 支持 {{variable}} 和 {{#if condition}}...{{/if}} 语法
 */
export function renderTemplate(template: string, variables: TemplateVariables): string {
  let result = template

  // 处理条件语句 {{#if condition}}...{{/if}}
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, condition, content) => {
    return variables[condition] ? content : ''
  })

  // 处理否定条件 {{#unless condition}}...{{/unless}}
  result = result.replace(/\{\{#unless\s+(\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (_, condition, content) => {
    return !variables[condition] ? content : ''
  })

  // 处理循环 {{#each items}}...{{/each}}
  result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, arrayName, content) => {
    const array = variables[arrayName]
    if (!Array.isArray(array)) return ''

    return array.map((item, index) => {
      let itemContent = content
      // 支持 {{this}}, {{@index}}, {{@first}}, {{@last}}
      itemContent = itemContent.replace(/\{\{this\}\}/g, String(item))
      itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index))
      itemContent = itemContent.replace(/\{\{@first\}\}/g, String(index === 0))
      itemContent = itemContent.replace(/\{\{@last\}\}/g, String(index === array.length - 1))

      // 如果 item 是对象，支持访问其属性
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
          itemContent = itemContent.replace(regex, String(item[key]))
        })
      }

      return itemContent
    }).join('')
  })

  // 处理简单变量替换 {{variable}}
  result = result.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
    const value = getNestedValue(variables, path)
    return value !== undefined ? String(value) : ''
  })

  return result
}

/**
 * 获取嵌套对象的值
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.')
  let value = obj

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key]
    } else {
      return undefined
    }
  }

  return value
}

/**
 * 转义特殊字符（用于 YAML/JSON）
 */
export function escapeYaml(value: string): string {
  if (value.includes(':') || value.includes('#') || value.includes('\n')) {
    return `"${value.replace(/"/g, '\\"')}"`
  }
  return value
}

/**
 * 转义 JSON
 */
export function escapeJson(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

/**
 * 缩进文本
 */
export function indent(text: string, spaces: number): string {
  const indentation = ' '.repeat(spaces)
  return text
    .split('\n')
    .map(line => line ? indentation + line : line)
    .join('\n')
}

/**
 * 将对象转换为 YAML 格式
 */
export function toYaml(obj: any, level = 0): string {
  const indent = '  '.repeat(level)
  let result = ''

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) {
        result += `${indent}-\n${toYaml(item, level + 1)}`
      } else {
        result += `${indent}- ${item}\n`
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        result += `${indent}${key}:\n`
      } else if (Array.isArray(value)) {
        result += `${indent}${key}:\n${toYaml(value, level + 1)}`
      } else if (typeof value === 'object') {
        result += `${indent}${key}:\n${toYaml(value, level + 1)}`
      } else if (typeof value === 'string') {
        result += `${indent}${key}: ${escapeYaml(value)}\n`
      } else {
        result += `${indent}${key}: ${value}\n`
      }
    }
  }

  return result
}

/**
 * 格式化环境变量
 */
export function formatEnvVars(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
}

/**
 * 解析环境变量
 */
export function parseEnvVars(content: string): Record<string, string> {
  const result: Record<string, string> = {}

  content.split('\n').forEach(line => {
    line = line.trim()
    if (!line || line.startsWith('#')) return

    const index = line.indexOf('=')
    if (index > 0) {
      const key = line.substring(0, index).trim()
      const value = line.substring(index + 1).trim()
      result[key] = value
    }
  })

  return result
}




