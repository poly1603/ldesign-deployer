/**
 * 模板引擎测试
 */

import { describe, it, expect } from 'vitest'
import { renderTemplate, toYaml, escapeYaml, indent, formatEnvVars, parseEnvVars } from '../template-engine.js'

describe('renderTemplate', () => {
  it('should replace simple variables', () => {
    const template = 'Hello {{name}}!'
    const result = renderTemplate(template, { name: 'World' })
    expect(result).toBe('Hello World!')
  })

  it('should handle nested variables', () => {
    const template = '{{user.name}} - {{user.email}}'
    const result = renderTemplate(template, {
      user: { name: 'John', email: 'john@example.com' },
    })
    expect(result).toBe('John - john@example.com')
  })

  it('should handle if conditions', () => {
    const template = '{{#if enabled}}Enabled{{/if}}'
    
    expect(renderTemplate(template, { enabled: true })).toBe('Enabled')
    expect(renderTemplate(template, { enabled: false })).toBe('')
  })

  it('should handle unless conditions', () => {
    const template = '{{#unless disabled}}Active{{/unless}}'
    
    expect(renderTemplate(template, { disabled: false })).toBe('Active')
    expect(renderTemplate(template, { disabled: true })).toBe('')
  })

  it('should handle each loops', () => {
    const template = '{{#each items}}{{this}},{{/each}}'
    const result = renderTemplate(template, { items: ['a', 'b', 'c'] })
    expect(result).toBe('a,b,c,')
  })

  it('should handle each with object properties', () => {
    const template = '{{#each users}}{{name}}:{{age}},{{/each}}'
    const result = renderTemplate(template, {
      users: [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ],
    })
    expect(result).toBe('John:30,Jane:25,')
  })

  it('should handle @index in loops', () => {
    const template = '{{#each items}}{{@index}}:{{this}},{{/each}}'
    const result = renderTemplate(template, { items: ['a', 'b', 'c'] })
    expect(result).toBe('0:a,1:b,2:c,')
  })

  it('should handle missing variables', () => {
    const template = 'Hello {{missing}}!'
    const result = renderTemplate(template, {})
    expect(result).toBe('Hello !')
  })

  it('should handle complex nested templates', () => {
    const template = `
{{#if hasUsers}}
Users:
{{#each users}}
  - {{name}} ({{email}})
{{/each}}
{{/if}}
`.trim()

    const result = renderTemplate(template, {
      hasUsers: true,
      users: [
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' },
      ],
    })

    expect(result).toContain('Users:')
    expect(result).toContain('John')
    expect(result).toContain('Jane')
  })
})

describe('toYaml', () => {
  it('should convert simple object to YAML', () => {
    const obj = { name: 'test', version: '1.0.0' }
    const yaml = toYaml(obj, 0)
    
    expect(yaml).toContain('name: test')
    expect(yaml).toContain('version: 1.0.0')
  })

  it('should handle nested objects', () => {
    const obj = {
      app: {
        name: 'test',
        port: 3000,
      },
    }
    const yaml = toYaml(obj, 0)
    
    expect(yaml).toContain('app:')
    expect(yaml).toContain('name: test')
    expect(yaml).toContain('port: 3000')
  })

  it('should handle arrays', () => {
    const obj = {
      ports: [80, 443, 8080],
    }
    const yaml = toYaml(obj, 0)
    
    expect(yaml).toContain('ports:')
    expect(yaml).toContain('- 80')
    expect(yaml).toContain('- 443')
    expect(yaml).toContain('- 8080')
  })

  it('should handle array of objects', () => {
    const obj = {
      users: [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ],
    }
    const yaml = toYaml(obj, 0)
    
    expect(yaml).toContain('users:')
    expect(yaml).toContain('name: John')
    expect(yaml).toContain('age: 30')
  })

  it('should handle indentation', () => {
    const obj = { root: { level1: { level2: 'value' } } }
    const yaml = toYaml(obj, 0)
    
    expect(yaml).toMatch(/root:\n  level1:\n    level2: value/)
  })
})

describe('escapeYaml', () => {
  it('should escape strings with special characters', () => {
    expect(escapeYaml('key: value')).toBe('"key: value"')
    expect(escapeYaml('# comment')).toBe('"# comment"')
    expect(escapeYaml('multi\nline')).toBe('"multi\\nline"')
  })

  it('should not escape simple strings', () => {
    expect(escapeYaml('simple')).toBe('simple')
    expect(escapeYaml('simple-value')).toBe('simple-value')
  })
})

describe('indent', () => {
  it('should indent single line', () => {
    const result = indent('hello', 2)
    expect(result).toBe('  hello')
  })

  it('should indent multiple lines', () => {
    const text = 'line1\nline2\nline3'
    const result = indent(text, 4)
    
    expect(result).toBe('    line1\n    line2\n    line3')
  })

  it('should preserve empty lines', () => {
    const text = 'line1\n\nline3'
    const result = indent(text, 2)
    
    expect(result).toBe('  line1\n\n  line3')
  })
})

describe('formatEnvVars', () => {
  it('should format environment variables', () => {
    const vars = {
      NODE_ENV: 'production',
      PORT: '3000',
      DB_HOST: 'localhost',
    }
    const result = formatEnvVars(vars)
    
    expect(result).toContain('NODE_ENV=production')
    expect(result).toContain('PORT=3000')
    expect(result).toContain('DB_HOST=localhost')
  })

  it('should handle empty object', () => {
    const result = formatEnvVars({})
    expect(result).toBe('')
  })
})

describe('parseEnvVars', () => {
  it('should parse environment variables', () => {
    const content = `
NODE_ENV=production
PORT=3000
DB_HOST=localhost
`.trim()
    
    const result = parseEnvVars(content)
    
    expect(result).toEqual({
      NODE_ENV: 'production',
      PORT: '3000',
      DB_HOST: 'localhost',
    })
  })

  it('should ignore comments', () => {
    const content = `
# This is a comment
NODE_ENV=production
# Another comment
PORT=3000
`.trim()
    
    const result = parseEnvVars(content)
    
    expect(result).toEqual({
      NODE_ENV: 'production',
      PORT: '3000',
    })
  })

  it('should ignore empty lines', () => {
    const content = `
NODE_ENV=production

PORT=3000
`.trim()
    
    const result = parseEnvVars(content)
    
    expect(result).toEqual({
      NODE_ENV: 'production',
      PORT: '3000',
    })
  })

  it('should handle values with = sign', () => {
    const content = 'CONNECTION_STRING=user=admin;pass=secret'
    const result = parseEnvVars(content)
    
    expect(result).toEqual({
      CONNECTION_STRING: 'user=admin;pass=secret',
    })
  })
})



