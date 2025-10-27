/**
 * 资源限制和要求常量
 * @module constants/resources
 */

/**
 * 最小 Node.js 主版本号
 */
export const MIN_NODE_MAJOR_VERSION = 16;

/**
 * 推荐 Node.js 主版本号
 */
export const RECOMMENDED_NODE_MAJOR_VERSION = 20;

/**
 * 最小磁盘空间（字节）- 1GB
 */
export const MIN_DISK_SPACE = 1024 * 1024 * 1024;

/**
 * 推荐磁盘空间（字节）- 5GB
 */
export const RECOMMENDED_DISK_SPACE = 5 * 1024 * 1024 * 1024;

/**
 * 默认 CPU 请求
 */
export const DEFAULT_CPU_REQUEST = '100m';

/**
 * 默认 CPU 限制
 */
export const DEFAULT_CPU_LIMIT = '500m';

/**
 * 默认内存请求
 */
export const DEFAULT_MEMORY_REQUEST = '128Mi';

/**
 * 默认内存限制
 */
export const DEFAULT_MEMORY_LIMIT = '512Mi';

/**
 * 字节单位
 */
export const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

/**
 * 字节进制（1024）
 */
export const BYTES_PER_UNIT = 1024;

