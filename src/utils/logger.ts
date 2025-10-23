/**
 * 日志工具
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LoggerOptions {
  level?: LogLevel
  prefix?: string
  colors?: boolean
  timestamp?: boolean
}

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

export class Logger {
  private level: LogLevel
  private prefix: string
  private colors: boolean
  private timestamp: boolean

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || 'info'
    this.prefix = options.prefix || ''
    this.colors = options.colors !== false
    this.timestamp = options.timestamp !== false
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level]
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    let output = ''

    // 时间戳
    if (this.timestamp) {
      const time = new Date().toISOString()
      output += this.colors ? `${COLORS.gray}[${time}]${COLORS.reset} ` : `[${time}] `
    }

    // 日志级别
    if (this.colors) {
      const levelColors: Record<LogLevel, string> = {
        debug: COLORS.cyan,
        info: COLORS.blue,
        warn: COLORS.yellow,
        error: COLORS.red,
      }
      output += `${levelColors[level]}[${level.toUpperCase()}]${COLORS.reset} `
    } else {
      output += `[${level.toUpperCase()}] `
    }

    // 前缀
    if (this.prefix) {
      output += this.colors ? `${COLORS.magenta}[${this.prefix}]${COLORS.reset} ` : `[${this.prefix}] `
    }

    // 消息
    output += message

    // 额外参数
    if (args.length > 0) {
      output += ' ' + args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
    }

    return output
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, ...args))
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, ...args))
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      const formatted = this.formatMessage('info', message, ...args)
      console.log(this.colors ? `${COLORS.green}✓${COLORS.reset} ${formatted}` : `✓ ${formatted}`)
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, ...args))
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, ...args))
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level
  }

  setPrefix(prefix: string): void {
    this.prefix = prefix
  }
}

// 默认导出单例
export const logger = new Logger()

// 创建带前缀的 logger
export function createLogger(prefix: string, options?: LoggerOptions): Logger {
  return new Logger({ ...options, prefix })
}




