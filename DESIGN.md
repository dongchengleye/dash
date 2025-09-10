# 系统设计文档

## 项目概述

本项目是一个基于 Next.js 的 ROI 数据分析仪表板，提供数据上传、可视化分析、预测和趋势分析等功能。

## 技术架构

### 前端技术栈
- **框架**: Next.js 14 (App Router)
- **UI 组件**: Shadcn/ui + Tailwind CSS
- **图表库**: Recharts
- **状态管理**: React Hooks
- **类型检查**: TypeScript

### 后端技术栈
- **运行时**: Node.js
- **数据库**: MySQL
- **API**: Next.js API Routes
- **文件处理**: CSV 解析和处理

## 数据库设计

### ROI 数据表 (roi_data)

```sql
CREATE TABLE roi_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  app VARCHAR(100) NOT NULL,
  bid_type VARCHAR(50) NOT NULL,
  country VARCHAR(100) NOT NULL,
  channel VARCHAR(100) NOT NULL DEFAULT 'organic',
  installs INT DEFAULT 0,
  roi_today DECIMAL(10,4) DEFAULT 0.0000,
  roi_1_day DECIMAL(10,4) DEFAULT 0.0000,
  roi_3_day DECIMAL(10,4) DEFAULT 0.0000,
  roi_7_day DECIMAL(10,4) DEFAULT 0.0000,
  roi_14_day DECIMAL(10,4) DEFAULT 0.0000,
  roi_30_day DECIMAL(10,4) DEFAULT 0.0000,
  roi_60_day DECIMAL(10,4) DEFAULT 0.0000,
  roi_90_day DECIMAL(10,4) DEFAULT 0.0000,
  is_real_zero BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_roi_record (date, app, bid_type, country, channel)
);
```

### 字段说明
- `id`: 主键，自增
- `date`: 数据日期
- `app`: 应用名称
- `bid_type`: 出价类型 (CPI, CPA, etc.)
- `country`: 国家地区
- `channel`: 用户安装渠道
- `installs`: 安装数量
- `roi_*_day`: 不同时间周期的 ROI 值
- `is_real_zero`: 标识是否为真实的 0% ROI (区分数据不足)
- `created_at/updated_at`: 时间戳

## API 设计

### 1. 数据查询 API

**端点**: `GET /api/roi-data`

**查询参数**:
- `app`: 应用筛选
- `country`: 国家筛选
- `channel`: 渠道筛选
- `bid_type`: 出价类型筛选
- `start_date`: 开始日期
- `end_date`: 结束日期
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 100)
- `sort_by`: 排序字段 (默认: date)
- `sort_order`: 排序方向 (asc/desc, 默认: desc)

**响应格式**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "date": "2024-01-01",
      "app": "TikTok",
      "bid_type": "CPI",
      "country": "US",
      "channel": "organic",
      "installs": 1000,
      "roi_today": 0.08,
      "roi_1_day": 0.15,
      "roi_3_day": 0.25,
      "roi_7_day": 0.35,
      "roi_14_day": 0.45,
      "roi_30_day": 0.55,
      "roi_60_day": 0.75,
      "roi_90_day": 0.95,
      "is_real_zero": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 1500,
    "pages": 15
  }
}
```

### 2. 筛选器选项 API

**端点**: `POST /api/roi-data`

**请求体**:
```json
{
  "type": "channels" // 或 "bid_types", "countries", "apps"
}
```

### 3. ROI 预测 API

**端点**: `GET /api/roi-prediction`

**查询参数**:
- `app`: 应用名称
- `country`: 国家
- `channel`: 渠道
- `bid_type`: 出价类型
- `days`: 预测天数 (默认: 7)

**响应格式**:
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "roi_today": 0.08,
      "roi_1_day": 0.15,
      "roi_3_day": 0.25,
      "roi_7_day": 0.35,
      "roi_14_day": 0.45,
      "roi_30_day": 0.55,
      "roi_60_day": 0.75,
      "roi_90_day": 0.95,
      "confidence": 0.85,
      "method": "linear_regression"
    }
  ]
}
```

### 4. 趋势分析 API

**端点**: `GET /api/roi-trend`

**响应格式**:
```json
{
  "success": true,
  "data": {
    "trend": {
      "direction": "increasing",
      "slope": 0.02,
      "strength": 0.75
    },
    "anomalies": [
      {
        "date": "2024-01-10",
        "value": 0.15,
        "expected": 0.35,
        "severity": "high"
      }
    ]
  }
}
```

### 5. 数据上传 API

**端点**: `POST /api/upload-roi`

**请求**: FormData with CSV file

## 核心功能模块

### 1. 数据可视化
- **图表类型**: 线性图、对数图
- **交互功能**: 缩放、平移、数据点悬停
- **多维度展示**: 支持8个 ROI 周期同时显示（当日、1日、3日、7日、14日、30日、60日、90日）
- **移动平均**: 可选的趋势平滑显示
- **预测数据**: 虚线样式显示未来ROI预测，与历史数据区分
- **数据合并**: 智能合并历史数据和预测数据，按日期排序显示

### 2. 智能数据处理
- **0% 数据区分**: 自动识别真实 0% 和数据不足情况
- **数据验证**: CSV 上传时的格式和内容验证
- **重复数据处理**: 基于唯一键的数据更新策略

### 3. 预测算法
- **移动平均**: 基于历史数据的简单预测
- **线性回归**: 趋势拟合和未来值预测
- **置信度计算**: 基于历史误差的预测可信度

### 4. 趋势分析
- **趋势识别**: 上升、下降、平稳趋势检测
- **异常检测**: 基于统计方法的异常值识别
- **强度评估**: 趋势强度的量化评估

## 性能优化

### 前端优化
- **组件懒加载**: 大型图表组件的按需加载
- **数据缓存**: 筛选结果的客户端缓存
- **虚拟滚动**: 大数据集的高效渲染

### 后端优化
- **数据库索引**: 查询字段的复合索引
- **分页查询**: 避免大数据集的全量加载
- **连接池**: 数据库连接的复用管理

## 安全考虑

### 数据安全
- **输入验证**: 严格的参数验证和清理
- **SQL 注入防护**: 参数化查询
- **文件上传安全**: 文件类型和大小限制

### 访问控制
- **CORS 配置**: 跨域请求的安全控制
- **速率限制**: API 调用频率限制

## 部署架构

### 开发环境
- **本地开发**: Next.js dev server + 本地 MySQL
- **热重载**: 代码变更的实时更新

### 生产环境
- **容器化**: Docker 容器部署
- **数据库**: 云数据库服务
- **CDN**: 静态资源的全球分发

## 扩展性设计

### 水平扩展
- **API 无状态**: 支持多实例部署
- **数据库分片**: 大数据量的分布式存储

### 功能扩展
- **插件架构**: 新分析算法的模块化集成
- **多租户**: 支持多用户数据隔离
- **实时数据**: WebSocket 的实时数据推送

## 监控和日志

### 应用监控
- **性能指标**: API 响应时间、错误率
- **业务指标**: 数据上传量、查询频率

### 日志管理
- **结构化日志**: JSON 格式的日志输出
- **日志级别**: 开发和生产环境的不同级别
- **错误追踪**: 异常的详细堆栈信息

## 测试策略

### 单元测试
- **组件测试**: React 组件的功能测试
- **API 测试**: 后端接口的逻辑测试
- **工具函数**: 纯函数的输入输出测试

### 集成测试
- **端到端测试**: 完整用户流程的自动化测试
- **数据库测试**: 数据操作的正确性验证

### 性能测试
- **负载测试**: 高并发场景的性能验证
- **压力测试**: 系统极限的探测

---

*本文档将随着项目发展持续更新*