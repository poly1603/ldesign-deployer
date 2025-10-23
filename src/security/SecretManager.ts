/**
 * 密钥管理系统
 * 支持加密存储和安全注入
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { logger } from '../utils/logger.js'
import { readFile, writeFile, fileExists } from '../utils/file-system.js'
import type { SecretConfig } from '../types/index.js'

/**
 * 加密算法配置
 */
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const SALT_LENGTH = 32
const TAG_LENGTH = 16

/**
 * 密钥存储接口
 */
export interface SecretStore {
  secrets: Record<string, EncryptedSecret>
  version: string
  createdAt: string
  updatedAt: string
}

/**
 * 加密的密钥
 */
export interface EncryptedSecret {
  encrypted: string
  iv: string
  tag: string
  salt: string
  metadata?: {
    name: string
    description?: string
    environment?: string
    createdAt: string
    updatedAt: string
  }
}

/**
 * 密钥管理器
 */
export class SecretManager {
  private secretsFile: string
  private masterKey?: Buffer

  constructor(secretsFile: string = '.deployer-secrets.json') {
    this.secretsFile = secretsFile
  }

  /**
   * 初始化主密钥
   */
  initMasterKey(password: string): void {
    // 使用 scrypt 从密码派生密钥
    const salt = randomBytes(SALT_LENGTH)
    this.masterKey = scryptSync(password, salt, KEY_LENGTH)
  }

  /**
   * 从环境变量加载主密钥
   */
  loadMasterKeyFromEnv(): boolean {
    const envKey = process.env.DEPLOYER_MASTER_KEY
    if (!envKey) {
      return false
    }

    try {
      this.masterKey = Buffer.from(envKey, 'hex')
      return true
    } catch (error) {
      logger.error('Failed to load master key from environment')
      return false
    }
  }

  /**
   * 加密密钥
   */
  encrypt(plaintext: string, password?: string): EncryptedSecret {
    const key = password 
      ? scryptSync(password, randomBytes(SALT_LENGTH), KEY_LENGTH)
      : this.masterKey

    if (!key) {
      throw new Error('Master key not initialized. Call initMasterKey() first.')
    }

    const iv = randomBytes(IV_LENGTH)
    const salt = randomBytes(SALT_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const tag = cipher.getAuthTag()

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      salt: salt.toString('hex'),
    }
  }

  /**
   * 解密密钥
   */
  decrypt(encryptedSecret: EncryptedSecret, password?: string): string {
    const key = password
      ? scryptSync(password, Buffer.from(encryptedSecret.salt, 'hex'), KEY_LENGTH)
      : this.masterKey

    if (!key) {
      throw new Error('Master key not initialized. Call initMasterKey() first.')
    }

    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(encryptedSecret.iv, 'hex')
    )

    decipher.setAuthTag(Buffer.from(encryptedSecret.tag, 'hex'))

    let decrypted = decipher.update(encryptedSecret.encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  /**
   * 存储密钥
   */
  async storeSecret(
    name: string,
    value: string,
    metadata?: {
      description?: string
      environment?: string
    }
  ): Promise<void> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized')
    }

    // 加载现有密钥存储
    let store: SecretStore
    if (await fileExists(this.secretsFile)) {
      const content = await readFile(this.secretsFile)
      store = JSON.parse(content)
    } else {
      store = {
        secrets: {},
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    // 加密并存储
    const encrypted = this.encrypt(value)
    store.secrets[name] = {
      ...encrypted,
      metadata: {
        name,
        description: metadata?.description,
        environment: metadata?.environment,
        createdAt: store.secrets[name]?.metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }
    store.updatedAt = new Date().toISOString()

    // 写入文件
    await writeFile(this.secretsFile, JSON.stringify(store, null, 2))
    logger.info(`✅ 密钥 '${name}' 已安全存储`)
  }

  /**
   * 获取密钥
   */
  async getSecret(name: string): Promise<string | null> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized')
    }

    if (!(await fileExists(this.secretsFile))) {
      return null
    }

    const content = await readFile(this.secretsFile)
    const store: SecretStore = JSON.parse(content)

    const encrypted = store.secrets[name]
    if (!encrypted) {
      return null
    }

    return this.decrypt(encrypted)
  }

  /**
   * 列出所有密钥
   */
  async listSecrets(): Promise<Array<{ name: string; metadata?: any }>> {
    if (!(await fileExists(this.secretsFile))) {
      return []
    }

    const content = await readFile(this.secretsFile)
    const store: SecretStore = JSON.parse(content)

    return Object.keys(store.secrets).map((name) => ({
      name,
      metadata: store.secrets[name].metadata,
    }))
  }

  /**
   * 删除密钥
   */
  async deleteSecret(name: string): Promise<boolean> {
    if (!(await fileExists(this.secretsFile))) {
      return false
    }

    const content = await readFile(this.secretsFile)
    const store: SecretStore = JSON.parse(content)

    if (!store.secrets[name]) {
      return false
    }

    delete store.secrets[name]
    store.updatedAt = new Date().toISOString()

    await writeFile(this.secretsFile, JSON.stringify(store, null, 2))
    logger.info(`🗑️  密钥 '${name}' 已删除`)
    return true
  }

  /**
   * 导出密钥到环境变量格式
   */
  async exportToEnv(environment?: string): Promise<Record<string, string>> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized')
    }

    const secrets = await this.listSecrets()
    const env: Record<string, string> = {}

    for (const { name, metadata } of secrets) {
      // 如果指定了环境，只导出该环境的密钥
      if (environment && metadata?.environment && metadata.environment !== environment) {
        continue
      }

      const value = await this.getSecret(name)
      if (value) {
        env[name] = value
      }
    }

    return env
  }

  /**
   * 从配置导入密钥
   */
  async importFromConfig(secrets: SecretConfig[]): Promise<void> {
    for (const secret of secrets) {
      if (secret.encrypted) {
        // 已加密的密钥，直接存储
        const content = await readFile(this.secretsFile)
        const store: SecretStore = JSON.parse(content)
        store.secrets[secret.name] = JSON.parse(secret.value)
        await writeFile(this.secretsFile, JSON.stringify(store, null, 2))
      } else {
        // 未加密的密钥，加密后存储
        await this.storeSecret(secret.name, secret.value)
      }
    }
  }

  /**
   * 轮换密钥（重新加密）
   */
  async rotateSecrets(newPassword: string): Promise<void> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized')
    }

    if (!(await fileExists(this.secretsFile))) {
      return
    }

    // 读取所有密钥
    const content = await readFile(this.secretsFile)
    const store: SecretStore = JSON.parse(content)

    // 解密所有密钥
    const decrypted: Record<string, string> = {}
    for (const [name, encrypted] of Object.entries(store.secrets)) {
      decrypted[name] = this.decrypt(encrypted)
    }

    // 更新主密钥
    this.initMasterKey(newPassword)

    // 重新加密所有密钥
    for (const [name, value] of Object.entries(decrypted)) {
      const encrypted = this.encrypt(value)
      store.secrets[name] = {
        ...encrypted,
        metadata: store.secrets[name].metadata,
      }
    }

    store.updatedAt = new Date().toISOString()

    // 写回文件
    await writeFile(this.secretsFile, JSON.stringify(store, null, 2))
    logger.success('✅ 所有密钥已轮换')
  }

  /**
   * 生成主密钥并导出到环境变量格式
   */
  static generateMasterKey(): string {
    const key = randomBytes(KEY_LENGTH)
    return key.toString('hex')
  }
}

/**
 * Vault 集成（可选）
 */
export class VaultSecretManager {
  private vaultAddr: string
  private vaultToken: string

  constructor(vaultAddr?: string, vaultToken?: string) {
    this.vaultAddr = vaultAddr || process.env.VAULT_ADDR || 'http://localhost:8200'
    this.vaultToken = vaultToken || process.env.VAULT_TOKEN || ''
  }

  /**
   * 从 Vault 读取密钥
   */
  async getSecret(path: string): Promise<any> {
    if (!this.vaultToken) {
      throw new Error('Vault token not configured')
    }

    try {
      const response = await fetch(`${this.vaultAddr}/v1/${path}`, {
        headers: {
          'X-Vault-Token': this.vaultToken,
        },
      })

      if (!response.ok) {
        throw new Error(`Vault request failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data.data
    } catch (error: any) {
      logger.error(`Failed to read secret from Vault: ${error.message}`)
      throw error
    }
  }

  /**
   * 向 Vault 写入密钥
   */
  async putSecret(path: string, data: Record<string, any>): Promise<void> {
    if (!this.vaultToken) {
      throw new Error('Vault token not configured')
    }

    try {
      const response = await fetch(`${this.vaultAddr}/v1/${path}`, {
        method: 'POST',
        headers: {
          'X-Vault-Token': this.vaultToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      })

      if (!response.ok) {
        throw new Error(`Vault request failed: ${response.statusText}`)
      }

      logger.success(`✅ 密钥已写入 Vault: ${path}`)
    } catch (error: any) {
      logger.error(`Failed to write secret to Vault: ${error.message}`)
      throw error
    }
  }
}

