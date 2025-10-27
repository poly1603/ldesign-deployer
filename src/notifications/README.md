# 通知系统

> 为部署过程提供多渠道通知功能

## 功能特性

- ✅ **多渠道支持** - Webhook、控制台等多种通知方式
- ✅ **统一接口** - 基于抽象基类的统一通知接口
- ✅ **并行发送** - 支持并行或串行发送通知
- ✅ **错误容错** - 单个通知器失败不影响其他通知器
- ✅ **灵活配置** - 支持启用/禁用、超时、标签等配置
- ✅ **类型安全** - 完整的 TypeScript 类型定义
- ✅ **扩展性强** - 易于添加新的通知渠道

## 快速开始

### 基础使用

```typescript
import { ConsoleNotifier } from '@ldesign/deployer';

const notifier = new ConsoleNotifier();

await notifier.send({
  title: '部署通知',
  message: '部署成功',
  level: 'success'
});
```

### 使用通知管理器

```typescript
import { 
  NotificationManager, 
  ConsoleNotifier, 
  WebhookNotifier 
} from '@ldesign/deployer';

const manager = new NotificationManager();

// 添加多个通知器
manager
  .addNotifier(new ConsoleNotifier())
  .addNotifier(new WebhookNotifier({
    url: 'https://hooks.example.com/webhook',
    authToken: 'secret-token'
  }));

// 发送通知到所有渠道
await manager.sendAll({
  title: '部署通知',
  message: '应用已成功部署到生产环境',
  level: 'success'
});
```

### 发送部署通知

```typescript
await manager.sendDeployment({
  appName: 'my-app',
  version: '1.0.0',
  environment: 'production',
  success: true,
  duration: 45000,
  title: '部署成功',
  message: '应用已成功部署',
  level: 'success'
});
```

## 可用的通知器

### ConsoleNotifier

在控制台输出彩色通知消息，适合开发和调试。

```typescript
import { ConsoleNotifier } from '@ldesign/deployer';

const notifier = new ConsoleNotifier({
  enabled: true,
  tags: ['production', 'web']
});
```

### WebhookNotifier

通过 HTTP Webhook 发送通知，支持自定义认证和头信息。

```typescript
import { WebhookNotifier } from '@ldesign/deployer';

const notifier = new WebhookNotifier({
  url: 'https://hooks.example.com/webhook',
  method: 'POST',
  authToken: 'secret-token',
  headers: {
    'X-Custom-Header': 'value'
  },
  timeout: 10000
});
```

## 集成到部署流程

### 在 Deployer 中使用

```typescript
import { 
  EnhancedDeployer, 
  NotificationManager,
  ConsoleNotifier,
  WebhookNotifier
} from '@ldesign/deployer';

const deployer = new EnhancedDeployer();
const notifications = new NotificationManager();

// 配置通知器
notifications
  .addNotifier(new ConsoleNotifier())
  .addNotifier(new WebhookNotifier({
    url: process.env.WEBHOOK_URL!
  }));

// 监听部署进度
deployer.onProgress((event) => {
  if (event.progress === 100) {
    notifications.send({
      title: '部署完成',
      message: `部署进度: ${event.progress}%`,
      level: 'success'
    });
  }
});

// 执行部署
const result = await deployer.deploy({
  environment: 'production'
});

// 发送部署结果通知
await notifications.sendDeployment({
  appName: 'my-app',
  version: '1.0.0',
  environment: 'production',
  success: result.success,
  duration: 45000,
  error: result.success ? undefined : result.message,
  title: result.success ? '部署成功' : '部署失败',
  message: result.message,
  level: result.success ? 'success' : 'error'
});
```

## 自定义通知器

创建自定义通知器非常简单，只需继承 `BaseNotifier` 并实现 `send` 方法：

```typescript
import { BaseNotifier, NotificationMessage } from '@ldesign/deployer';

export class SlackNotifier extends BaseNotifier {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    super('Slack');
    this.webhookUrl = webhookUrl;
  }

  async send(message: NotificationMessage): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const payload = {
      text: message.title,
      attachments: [{
        color: this.getColor(message.level),
        text: message.message,
        ts: Math.floor((message.timestamp?.getTime() || Date.now()) / 1000)
      }]
    };

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  private getColor(level: string): string {
    const colors: Record<string, string> = {
      info: '#0000FF',
      success: '#00FF00',
      warning: '#FFA500',
      error: '#FF0000'
    };
    return colors[level] || '#808080';
  }
}

// 使用自定义通知器
const slackNotifier = new SlackNotifier('https://hooks.slack.com/...');
manager.addNotifier(slackNotifier);
```

## API 参考

### NotificationMessage

```typescript
interface NotificationMessage {
  title: string;           // 消息标题
  message: string;         // 消息内容
  level: NotificationLevel; // 通知级别
  metadata?: Record<string, any>; // 附加数据
  timestamp?: Date;        // 时间戳
}
```

### DeploymentNotification

```typescript
interface DeploymentNotification extends NotificationMessage {
  appName: string;    // 应用名称
  version: string;    // 版本号
  environment: string; // 环境
  success: boolean;   // 部署结果
  duration?: number;  // 部署时长（毫秒）
  error?: string;     // 错误信息
}
```

### NotifierConfig

```typescript
interface NotifierConfig {
  enabled?: boolean;   // 是否启用
  tags?: string[];     // 自定义标签
  timeout?: number;    // 超时时间（毫秒）
}
```

## 最佳实践

### 1. 错误处理

始终启用 `continueOnError` 确保单个通知器失败不影响部署：

```typescript
await manager.sendAll(message, {
  continueOnError: true  // 默认为 true
});
```

### 2. 环境区分

根据环境使用不同的通知器：

```typescript
const manager = new NotificationManager();

// 开发环境只用控制台
if (process.env.NODE_ENV === 'development') {
  manager.addNotifier(new ConsoleNotifier());
}

// 生产环境使用 Webhook
if (process.env.NODE_ENV === 'production') {
  manager.addNotifier(new WebhookNotifier({
    url: process.env.WEBHOOK_URL!
  }));
}
```

### 3. 使用标签分类

```typescript
const prodNotifier = new WebhookNotifier({
  url: '...',
  tags: ['production', 'critical']
});

const devNotifier = new ConsoleNotifier({
  tags: ['development', 'debug']
});
```

### 4. 性能优化

对于大量通知，使用并行发送：

```typescript
await manager.sendAll(message, {
  parallel: true  // 默认为 true
});
```

## 扩展计划

未来可以添加的通知器：

- [ ] **SlackNotifier** - Slack 集成
- [ ] **DingTalkNotifier** - 钉钉集成
- [ ] **EmailNotifier** - 邮件通知
- [ ] **TeamsNotifier** - Microsoft Teams 集成
- [ ] **TelegramNotifier** - Telegram 机器人
- [ ] **SMSNotifier** - 短信通知

## 注意事项

1. **超时设置**：建议设置合理的超时时间，避免阻塞部署流程
2. **认证安全**：Webhook 的 authToken 应该通过环境变量配置
3. **重试机制**：目前不支持自动重试，失败的通知会被记录但不会重试
4. **性能影响**：通知发送是异步的，不会阻塞主流程

## 示例项目

查看 `examples/` 目录获取更多示例：

- `examples/notifications-basic.ts` - 基础使用
- `examples/notifications-deployment.ts` - 部署通知
- `examples/notifications-custom.ts` - 自定义通知器

