/**
 * SSH 部署类型定义
 * @module ssh/types
 */

/**
 * SSH 连接配置
 */
export interface SSHConfig {
  /** 服务器主机名或 IP */
  host: string
  /** SSH 端口，默认 22 */
  port?: number
  /** 用户名 */
  username: string
  /** 密码（不推荐，建议使用密钥） */
  password?: string
  /** 私钥路径 */
  privateKeyPath?: string
  /** 私钥内容 */
  privateKey?: string
  /** 私钥密码 */
  passphrase?: string
  /** 连接超时时间（毫秒） */
  timeout?: number
  /** 是否严格检查主机密钥 */
  strictHostKeyChecking?: boolean
  /** 跳板机配置 */
  jumpHost?: SSHConfig
}

/**
 * SFTP 上传选项
 */
export interface SFTPUploadOptions {
  /** 本地文件或目录路径 */
  localPath: string
  /** 远程目标路径 */
  remotePath: string
  /** 是否递归上传目录 */
  recursive?: boolean
  /** 排除的文件模式 */
  exclude?: string[]
  /** 是否保留文件权限 */
  preservePermissions?: boolean
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean
  /** 上传进度回调 */
  onProgress?: (progress: SFTPProgress) => void
}

/**
 * SFTP 传输进度
 */
export interface SFTPProgress {
  /** 当前文件 */
  file: string
  /** 已传输字节数 */
  transferred: number
  /** 文件总大小 */
  total: number
  /** 进度百分比 */
  percentage: number
  /** 传输速度（字节/秒） */
  speed: number
}

/**
 * SSH 命令执行选项
 */
export interface SSHExecOptions {
  /** 要执行的命令 */
  command: string
  /** 工作目录 */
  cwd?: string
  /** 环境变量 */
  env?: Record<string, string>
  /** 是否以 sudo 执行 */
  sudo?: boolean
  /** sudo 密码 */
  sudoPassword?: string
  /** 执行超时时间（毫秒） */
  timeout?: number
  /** 是否实时输出 */
  stream?: boolean
}

/**
 * SSH 命令执行结果
 */
export interface SSHExecResult {
  /** 是否成功 */
  success: boolean
  /** 退出码 */
  exitCode: number
  /** 标准输出 */
  stdout: string
  /** 标准错误 */
  stderr: string
  /** 执行时长（毫秒） */
  duration: number
}

/**
 * SSH 部署配置
 */
export interface SSHDeployConfig {
  /** SSH 连接配置 */
  connection: SSHConfig
  /** 远程部署路径 */
  deployPath: string
  /** 当前版本软链接名称 */
  currentLink?: string
  /** 保留的版本数量 */
  keepReleases?: number
  /** 共享目录（不会被清理） */
  sharedDirs?: string[]
  /** 共享文件（不会被覆盖） */
  sharedFiles?: string[]
  /** 部署前钩子 */
  beforeDeploy?: string[]
  /** 部署后钩子 */
  afterDeploy?: string[]
  /** 是否备份当前版本 */
  backup?: boolean
  /** 备份目录 */
  backupPath?: string
}

/**
 * SSH 部署结果
 */
export interface SSHDeployResult {
  /** 是否成功 */
  success: boolean
  /** 消息 */
  message: string
  /** 部署版本 */
  version: string
  /** 部署路径 */
  deployPath: string
  /** 部署时间戳 */
  timestamp: string
  /** 部署时长（毫秒） */
  duration: number
  /** 传输的文件数 */
  filesTransferred: number
  /** 传输的字节数 */
  bytesTransferred: number
}

/**
 * 服务器状态
 */
export interface ServerStatus {
  /** 主机名 */
  hostname: string
  /** 操作系统 */
  os: string
  /** 负载 */
  loadAverage: number[]
  /** 内存使用 */
  memory: {
    total: number
    used: number
    free: number
    percentage: number
  }
  /** 磁盘使用 */
  disk: {
    total: number
    used: number
    free: number
    percentage: number
  }
  /** 运行时间 */
  uptime: number
}
