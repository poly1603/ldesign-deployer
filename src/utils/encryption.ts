/**
 * 配置加密工具
 * @module utils/encryption
 * 
 * @description 提供配置文件加密和解密功能
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'crypto'

/**
 * 加密算法
 */
const ALGORITHM = 'aes-256-gcm'

/**
 * 盐长度
 */
const SALT_LENGTH = 16

/**
 * IV 长度
 */
const IV_LENGTH = 12

/**
 * Auth Tag 长度
 */
const AUTH_TAG_LENGTH = 16

/**
 * 加密结果
 */
export interface EncryptedData {
  /** 加密后的数据（Base64） */
  encrypted: string
  /** 盐（Base64） */
  salt: string
  /** 初始化向量（Base64） */
  iv: string
  /** 认证标签（Base64） */
  authTag: string
  /** 算法 */
  algorithm: string
}

/**
 * 配置加密器
 * 
 * @example
 * ```typescript
 * const encryptor = new ConfigEncryptor('my-secret-key');
 * 
 * // 加密
 * const encrypted = encryptor.encrypt({ apiKey: 'secret123' });
 * 
 * // 解密
 * const decrypted = encryptor.decrypt(encrypted);
 * ```
 */
export class ConfigEncryptor {
  private password: string

  constructor(password: string) {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }
    this.password = password
  }

  /**
   * 加密数据
   */
  encrypt(data: any): EncryptedData {
    const salt = randomBytes(SALT_LENGTH)
    const key = this.deriveKey(salt)
    const iv = randomBytes(IV_LENGTH)

    const cipher = createCipheriv(ALGORITHM, key, iv)

    const jsonData = JSON.stringify(data)
    const encrypted = Buffer.concat([
      cipher.update(jsonData, 'utf8'),
      cipher.final(),
    ])

    const authTag = cipher.getAuthTag()

    return {
      encrypted: encrypted.toString('base64'),
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: ALGORITHM,
    }
  }

  /**
   * 解密数据
   */
  decrypt<T = any>(encryptedData: EncryptedData): T {
    const salt = Buffer.from(encryptedData.salt, 'base64')
    const key = this.deriveKey(salt)
    const iv = Buffer.from(encryptedData.iv, 'base64')
    const encrypted = Buffer.from(encryptedData.encrypted, 'base64')
    const authTag = Buffer.from(encryptedData.authTag, 'base64')

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ])

    return JSON.parse(decrypted.toString('utf8'))
  }

  /**
   * 加密字符串
   */
  encryptString(text: string): string {
    const encrypted = this.encrypt(text)
    return Buffer.from(JSON.stringify(encrypted)).toString('base64')
  }

  /**
   * 解密字符串
   */
  decryptString(encryptedText: string): string {
    const encrypted = JSON.parse(
      Buffer.from(encryptedText, 'base64').toString('utf8')
    ) as EncryptedData
    return this.decrypt<string>(encrypted)
  }

  /**
   * 派生密钥
   */
  private deriveKey(salt: Buffer): Buffer {
    return scryptSync(this.password, salt, 32)
  }
}

/**
 * 环境变量加密器
 * 
 * @description 专用于加密环境变量和密钥
 */
export class SecretEncryptor extends ConfigEncryptor {
  /**
   * 加密多个密钥
   */
  encryptSecrets(secrets: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(secrets)) {
      result[key] = this.encryptString(value)
    }
    return result
  }

  /**
   * 解密多个密钥
   */
  decryptSecrets(encryptedSecrets: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(encryptedSecrets)) {
      result[key] = this.decryptString(value)
    }
    return result
  }

  /**
   * 生成密钥指纹
   */
  static fingerprint(value: string): string {
    return createHash('sha256')
      .update(value)
      .digest('hex')
      .substring(0, 16)
  }
}

/**
 * 配置文件加密器
 * 
 * @description 用于加密和解密整个配置文件
 */
export class ConfigFileEncryptor {
  private encryptor: ConfigEncryptor

  constructor(password: string) {
    this.encryptor = new ConfigEncryptor(password)
  }

  /**
   * 加密配置文件内容
   * 
   * @param config - 配置对象
   * @param sensitiveKeys - 需要加密的敏感键列表
   * @returns 部分加密的配置
   */
  encryptSensitive(
    config: Record<string, any>,
    sensitiveKeys: string[] = ['password', 'secret', 'apiKey', 'token', 'key']
  ): Record<string, any> {
    const result = { ...config }

    for (const key of Object.keys(result)) {
      const value = result[key]

      // 检查是否是敏感键
      const isSensitive = sensitiveKeys.some(
        sk => key.toLowerCase().includes(sk.toLowerCase())
      )

      if (isSensitive && typeof value === 'string') {
        result[key] = {
          __encrypted: true,
          value: this.encryptor.encryptString(value),
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // 递归处理嵌套对象
        result[key] = this.encryptSensitive(value, sensitiveKeys)
      }
    }

    return result
  }

  /**
   * 解密配置文件内容
   */
  decryptSensitive(config: Record<string, any>): Record<string, any> {
    const result = { ...config }

    for (const key of Object.keys(result)) {
      const value = result[key]

      if (value && typeof value === 'object') {
        if (value.__encrypted === true && typeof value.value === 'string') {
          // 解密加密的值
          result[key] = this.encryptor.decryptString(value.value)
        } else if (!Array.isArray(value)) {
          // 递归处理嵌套对象
          result[key] = this.decryptSensitive(value)
        }
      }
    }

    return result
  }

  /**
   * 完全加密配置
   */
  encryptAll(config: Record<string, any>): EncryptedData {
    return this.encryptor.encrypt(config)
  }

  /**
   * 完全解密配置
   */
  decryptAll<T = Record<string, any>>(encrypted: EncryptedData): T {
    return this.encryptor.decrypt<T>(encrypted)
  }
}

/**
 * 便捷函数：生成随机密码
 */
export function generatePassword(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  const bytes = randomBytes(length)
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length]
  }
  return password
}

/**
 * 便捷函数：哈希密码
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

/**
 * 便捷函数：验证密码
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [saltHex, hashHex] = hashedPassword.split(':')
  const salt = Buffer.from(saltHex, 'hex')
  const hash = Buffer.from(hashHex, 'hex')
  const newHash = scryptSync(password, salt, 64)
  return hash.equals(newHash)
}
