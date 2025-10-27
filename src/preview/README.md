# 配置预览和变更分析

> 在部署前对比配置变更，评估影响和风险

## 功能特性

- ✅ **配置对比** - 详细的字段级差异对比
- ✅ **影响分析** - 智能分析变更的影响范围和风险
- ✅ **风险评估** - 自动计算风险评分（0-100）
- ✅ **停机预测** - 判断是否需要停机维护
- ✅ **时间估算** - 估算部署影响时间
- ✅ **智能建议** - 根据变更类型提供操作建议
- ✅ **多种格式** - 支持文本和 JSON 输出

## 快速开始

### CLI 使用

#### 对比两个配置文件

```bash
# 显示详细差异
ldesign-deployer preview:diff old-config.json new-config.json

# 简洁模式
ldesign-deployer preview:diff old-config.json new-config.json --verbose=false
```

#### 分析变更影响

```bash
ldesign-deployer preview:analyze old-config.json new-config.json
```

**输出示例:**
```
============================================================
变更影响分析报告
============================================================

📊 摘要:
  总变更数: 5
  高风险变更: 2
  需要停机: 是
  估计影响时间: 8 分钟
  风险评分: 75/100 🟠

💡 建议:
  ⚠️  此变更需要停机，请在维护窗口期进行
  📋 提前通知用户计划的维护时间
  🚨 包含关键变更，建议先在测试环境验证
  📸 建议在部署前创建备份或快照

🚨 高风险变更:
  🔴 platform
     风险: critical | 影响: deployment, service
     部署平台变更
     建议: 需要重新规划整个部署流程
```

### 编程 API

#### 配置对比

```typescript
import { ConfigDiffer } from '@ldesign/deployer';

const differ = new ConfigDiffer();
const report = differ.compare(oldConfig, newConfig);

console.log(`总差异: ${report.total}`);
console.log(`新增: ${report.added}, 删除: ${report.removed}, 修改: ${report.modified}`);

// 格式化输出
console.log(differ.formatReport(report));

// JSON 输出
const jsonReport = differ.toJSON(report);
```

#### 影响分析

```typescript
import { ConfigDiffer, ChangeAnalyzer } from '@ldesign/deployer';

// 1. 对比配置
const differ = new ConfigDiffer();
const diffReport = differ.compare(oldConfig, newConfig);

// 2. 分析影响
const analyzer = new ChangeAnalyzer();
const analysis = analyzer.analyze(diffReport, oldConfig, newConfig);

// 3. 查看结果
console.log(`风险评分: ${analysis.overallRiskScore}/100`);
console.log(`需要停机: ${analysis.requiresDowntime ? '是' : '否'}`);
console.log(`估计时间: ${analysis.estimatedImpactTime} 分钟`);

// 4. 查看建议
analysis.recommendations.forEach(rec => {
  console.log(`💡 ${rec}`);
});

// 5. 格式化输出
console.log(analyzer.formatReport(analysis));
```

## API 文档

### ConfigDiffer

配置差异对比器。

#### compare(oldConfig, newConfig)

对比两个配置。

**参数:**
- `oldConfig: DeployConfig` - 旧配置
- `newConfig: DeployConfig` - 新配置

**返回:** `DiffReport`

#### formatReport(report, options?)

格式化差异报告。

**参数:**
- `report: DiffReport` - 差异报告
- `options.colors?: boolean` - 是否使用颜色（默认 false）
- `options.verbose?: boolean` - 是否详细输出（默认 true）

**返回:** `string`

#### getHighRiskChanges(report)

获取高风险变更。

**参数:**
- `report: DiffReport` - 差异报告

**返回:** `DiffItem[]`

### ChangeAnalyzer

变更影响分析器。

#### analyze(diffReport, oldConfig, newConfig)

分析变更影响。

**参数:**
- `diffReport: DiffReport` - 差异报告
- `oldConfig: DeployConfig` - 旧配置
- `newConfig: DeployConfig` - 新配置

**返回:** `ImpactAnalysisReport`

#### formatReport(report)

格式化分析报告。

**参数:**
- `report: ImpactAnalysisReport` - 分析报告

**返回:** `string`

## 风险级别说明

| 级别 | 图标 | 评分范围 | 说明 |
|------|------|----------|------|
| Low | 🟢 | 0-19 | 低风险，可以正常部署 |
| Medium | 🟡 | 20-39 | 中等风险，建议检查 |
| High | 🟠 | 40-69 | 高风险，需要谨慎操作 |
| Critical | 🔴 | 70-100 | 关键变更，必须特别小心 |

## 影响范围说明

- **config** - 配置层面的变更
- **deployment** - 部署过程的影响
- **service** - 服务运行的影响
- **network** - 网络访问的影响
- **data** - 数据存储的影响

## 高风险字段

以下字段的变更被标记为高风险：

### 关键配置 (Critical)
- `platform` - 部署平台变更
- `environment` - 环境变更

### 高风险 (High)
- `docker.registry` - 镜像仓库变更
- `docker.image` - 镜像名称变更
- `kubernetes.namespace` - 命名空间变更
- `kubernetes.service` - Service 配置变更
- `healthCheck.enabled` - 健康检查启用状态

### 中风险 (Medium)
- `kubernetes.deployment.replicas` - 副本数变更
- `healthCheck.path` - 健康检查路径变更

## 使用场景

### 1. 部署前审查

```bash
# 对比当前配置和新配置
ldesign-deployer preview:diff deploy.config.json deploy.config.new.json

# 分析变更影响
ldesign-deployer preview:analyze deploy.config.json deploy.config.new.json
```

### 2. CI/CD 集成

```yaml
# GitHub Actions 示例
- name: Analyze Config Changes
  run: |
    ldesign-deployer preview:analyze \
      deploy.config.prod.json \
      deploy.config.staging.json
    
    if [ $? -eq 2 ]; then
      echo "High risk changes detected!"
      exit 1
    fi
```

### 3. Pull Request 检查

在 PR 中自动对比配置变更：

```typescript
import { ConfigDiffer, ChangeAnalyzer } from '@ldesign/deployer';

// 在 PR 检查中运行
const differ = new ConfigDiffer();
const report = differ.compare(baseConfig, headConfig);

if (report.hasDifferences) {
  const analyzer = new ChangeAnalyzer();
  const analysis = analyzer.analyze(report, baseConfig, headConfig);
  
  // 添加 PR 评论
  await addPRComment(analyzer.formatReport(analysis));
  
  // 高风险变更需要审批
  if (analysis.overallRiskScore >= 70) {
    await requestReview();
  }
}
```

## 最佳实践

### 1. 在部署前始终对比配置

```bash
ldesign-deployer preview:diff current.json new.json
ldesign-deployer preview:analyze current.json new.json
```

### 2. 使用版本控制追踪配置

```bash
git diff HEAD:deploy.config.json feature:deploy.config.json > config.diff
```

### 3. 自动化配置检查

将配置对比集成到 CI/CD 流程中，防止意外变更。

### 4. 定期审查配置

```bash
# 对比生产和测试环境配置
ldesign-deployer preview:diff \
  deploy.config.prod.json \
  deploy.config.test.json
```

## 扩展功能

未来计划添加：

- [ ] **可视化 Diff** - 图形化对比界面
- [ ] **配置快照** - 自动保存配置历史
- [ ] **变更审批** - 集成审批工作流
- [ ] **成本估算** - 计算资源变更的成本影响
- [ ] **回归测试** - 自动测试配置变更

## 示例项目

查看更多示例：

- `examples/preview-diff.ts` - 配置对比示例
- `examples/preview-analysis.ts` - 影响分析示例

## 相关文档

- [部署配置文档](../../README.md#配置示例)
- [CLI 命令文档](../../README.md#cli-命令)

