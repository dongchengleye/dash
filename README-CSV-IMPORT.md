# ROI数据CSV导入功能

## 功能概述

本功能允许用户通过CSV文件导入ROI数据到系统中，支持以下特性：

- 上传CSV文件导入数据
- 下载CSV模板
- 数据验证和错误处理
- 自动更新重复数据

## 数据格式

CSV文件必须包含以下列：

| 字段名 | 类型 | 描述 |
|-------|------|------|
| date | 字符串 | 日期，格式：YYYY-MM-DD |
| app | 字符串 | 应用名称 |
| bid_type | 字符串 | 出价类型 |
| country | 字符串 | 国家/地区 |
| installs | 数字 | 安装数量 |
| roi_today | 数字 | 当日ROI |
| roi_1_day | 数字 | 1日ROI |
| roi_3_day | 数字 | 3日ROI |
| roi_7_day | 数字 | 7日ROI |
| roi_14_day | 数字 | 14日ROI |
| roi_30_day | 数字 | 30日ROI |
| roi_60_day | 数字 | 60日ROI |
| roi_90_day | 数字 | 90日ROI |

## 设置说明

### 数据库配置

1. 创建MySQL数据库：

```sql
CREATE DATABASE energy_dashboard;
```

2. 配置环境变量：

在项目根目录创建`.env.local`文件，添加以下内容：

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=energy_dashboard
```

### 安装依赖

```bash
npm install
# 或
pnpm install
```

## 使用说明

1. **下载模板**：点击「下载模板」按钮获取CSV模板文件
2. **填写数据**：按照模板格式填写ROI数据
3. **导入数据**：点击「导入CSV」按钮，选择填写好的CSV文件
4. **查看结果**：上传成功后，页面会自动刷新显示最新数据

## 错误处理

- 如果CSV格式不正确，系统会显示错误信息
- 如果数据验证失败，系统会报告无效记录数量
- 如果数据库操作失败，系统会显示具体错误信息

## 技术实现

- 前端：React + Next.js
- 后端：Node.js + Express.js + TypeScript
- 数据库：MySQL
- CSV处理：csv-parse