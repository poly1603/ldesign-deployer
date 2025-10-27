/**
 * 超时和重试相关常量
 * @module constants/timeouts
 */

/**
 * 默认超时时间（毫秒）
 */
export const DEFAULT_TIMEOUT = 60000; // 60 秒

/**
 * 默认部署超时时间（毫秒）
 */
export const DEFAULT_DEPLOYMENT_TIMEOUT = 600000; // 10 分钟

/**
 * 健康检查超时时间（毫秒）
 */
export const HEALTH_CHECK_TIMEOUT = 5000; // 5 秒

/**
 * 命令执行超时时间（毫秒）
 */
export const COMMAND_TIMEOUT = 30000; // 30 秒

/**
 * 网络请求超时时间（毫秒）
 */
export const NETWORK_TIMEOUT = 10000; // 10 秒

/**
 * 锁获取超时时间（毫秒）
 */
export const LOCK_TIMEOUT = 300000; // 5 分钟

/**
 * 默认重试次数
 */
export const DEFAULT_RETRY_ATTEMPTS = 3;

/**
 * 默认重试延迟（毫秒）
 */
export const DEFAULT_RETRY_DELAY = 1000; // 1 秒

/**
 * 默认退避因子
 */
export const DEFAULT_BACKOFF_FACTOR = 2;

/**
 * 最大重试延迟（毫秒）
 */
export const MAX_RETRY_DELAY = 30000; // 30 秒

/**
 * 健康检查间隔（秒）
 */
export const HEALTH_CHECK_INTERVAL = 30;

/**
 * 健康检查重试次数
 */
export const HEALTH_CHECK_RETRIES = 3;

/**
 * 启动等待时间（秒）
 */
export const HEALTH_CHECK_START_PERIOD = 5;

