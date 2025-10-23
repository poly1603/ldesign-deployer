/**
 * 文件系统工具
 */

import { promises as fs } from 'fs'
import { join, dirname, resolve } from 'path'
import { existsSync } from 'fs'

/**
 * 确保目录存在
 */
export async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true })
  }
}

/**
 * 读取文件
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`)
  }
}

/**
 * 写入文件
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    await ensureDir(dirname(filePath))
    await fs.writeFile(filePath, content, 'utf-8')
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`)
  }
}

/**
 * 读取 JSON 文件
 */
export async function readJSON<T = any>(filePath: string): Promise<T> {
  const content = await readFile(filePath)
  try {
    return JSON.parse(content)
  } catch (error) {
    throw new Error(`Failed to parse JSON from ${filePath}: ${error}`)
  }
}

/**
 * 写入 JSON 文件
 */
export async function writeJSON(filePath: string, data: any, pretty = true): Promise<void> {
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
  await writeFile(filePath, content)
}

/**
 * 检查文件是否存在
 */
export function fileExists(filePath: string): boolean {
  return existsSync(filePath)
}

/**
 * 检查路径是否为目录
 */
export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path)
    return stat.isDirectory()
  } catch {
    return false
  }
}

/**
 * 复制文件
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  await ensureDir(dirname(dest))
  await fs.copyFile(src, dest)
}

/**
 * 删除文件
 */
export async function removeFile(filePath: string): Promise<void> {
  if (fileExists(filePath)) {
    await fs.unlink(filePath)
  }
}

/**
 * 删除目录
 */
export async function removeDir(dir: string): Promise<void> {
  if (fileExists(dir)) {
    await fs.rm(dir, { recursive: true, force: true })
  }
}

/**
 * 列出目录内容
 */
export async function listDir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir)
  } catch {
    return []
  }
}

/**
 * 查找文件（向上查找）
 */
export async function findFileUp(fileName: string, startDir: string = process.cwd()): Promise<string | null> {
  let currentDir = resolve(startDir)
  const root = resolve('/')

  while (currentDir !== root) {
    const filePath = join(currentDir, fileName)
    if (fileExists(filePath)) {
      return filePath
    }
    currentDir = dirname(currentDir)
  }

  // 检查根目录
  const rootFilePath = join(root, fileName)
  if (fileExists(rootFilePath)) {
    return rootFilePath
  }

  return null
}

/**
 * 获取文件大小
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stat = await fs.stat(filePath)
  return stat.size
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}




