# ROI 数据分析仪表板

一个基于 Next.js 的 ROI 数据分析仪表板，提供数据上传、可视化分析、预测和趋势分析等功能。

## 功能特性

- 📊 **数据可视化**: 支持线性图和对数图，多维度 ROI 数据展示
- 📈 **趋势分析**: 智能识别数据趋势和异常值
- 🔮 **ROI 预测**: 基于历史数据的未来 ROI 预测
- 📁 **CSV 导入**: 支持批量数据上传和处理
- 🔍 **智能筛选**: 多维度数据筛选和对比分析
- 📱 **响应式设计**: 支持桌面和移动设备

## 技术栈

- **前端**: Next.js 14, React, TypeScript, Tailwind CSS
- **UI 组件**: Shadcn/ui, Recharts
- **后端**: Next.js API Routes
- **数据库**: MySQL
- **开发工具**: ESLint, Prettier, Jest, Playwright

## 环境要求

- Node.js 18.0.0 或更高版本
- pnpm 8.0.0 或更高版本（推荐）
- MySQL 8.0 或更高版本

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd dash
```

### 2. 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 3. 环境配置

创建 `.env.local` 文件：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，配置数据库连接：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=roi_dashboard

# Next.js 配置
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# 应用配置
NODE_ENV=development
PORT=3000
```

### 4. 数据库初始化

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE roi_dashboard;"

# 运行数据库迁移（如果有）
pnpm run db:migrate
```

### 5. 启动开发服务器

```bash
pnpm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 可用脚本

```bash
# 开发模式启动
pnpm run dev

# 构建生产版本
pnpm run build

# 启动生产服务器
pnpm run start

# 代码检查
pnpm run lint

# 代码格式化
pnpm run format

# 运行测试
pnpm run test

# 运行端到端测试
pnpm run test:e2e

# 测试覆盖率
pnpm run test:coverage
```

## 项目结构

```
dash/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # API 路由
│   │   ├── dashboard/       # 仪表板页面
│   │   └── page.tsx         # 首页
│   ├── components/          # React 组件
│   │   ├── ui/              # 基础 UI 组件
│   │   └── wired-components/ # 业务组件
│   ├── data/                # 数据层
│   │   ├── models/          # 数据模型
│   │   └── services/        # 数据服务
│   ├── lib/                 # 工具库
│   └── utils/               # 工具函数
├── public/                  # 静态资源
├── docs/                    # 文档
└── tests/                   # 测试文件
```

## 数据格式

### CSV 文件格式要求

上传的 CSV 文件必须包含以下列：

| 列名 | 类型 | 必需 | 说明 |
|------|------|------|------|
| date | 日期 | ✅ | 格式：YYYY-MM-DD |
| app | 文本 | ✅ | 应用名称 |
| bid_type | 文本 | ✅ | 出价类型（如：CPI, CPA） |
| country | 文本 | ✅ | 国家地区 |
| channel | 文本 | ❌ | 用户安装渠道（默认：organic） |
| installs | 数字 | ❌ | 安装数量（默认：0） |
| roi_1_day | 数字 | ❌ | 1天ROI（默认：0） |
| roi_3_day | 数字 | ❌ | 3天ROI（默认：0） |
| roi_7_day | 数字 | ❌ | 7天ROI（默认：0） |
| roi_14_day | 数字 | ❌ | 14天ROI（默认：0） |
| roi_30_day | 数字 | ❌ | 30天ROI（默认：0） |

### 示例 CSV

```csv
date,app,bid_type,country,channel,installs,roi_1_day,roi_3_day,roi_7_day,roi_14_day,roi_30_day
2024-01-01,TikTok,CPI,US,organic,1000,0.15,0.25,0.35,0.45,0.55
2024-01-02,TikTok,CPI,US,organic,1200,0.18,0.28,0.38,0.48,0.58
```

## 部署

### 生产环境部署

详细的部署指南请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)。

### Docker 部署

```bash
# 构建镜像
docker build -t roi-dashboard .

# 运行容器
docker run -p 3000:3000 roi-dashboard
```

### 使用 Docker Compose

```bash
docker-compose up -d
```

## 文档

- [设计文档](./DESIGN.md) - 系统架构和技术设计
- [用户指南](./USER_GUIDE.md) - 详细的使用说明
- [部署文档](./DEPLOYMENT.md) - 部署和运维指南
- [CSV 导入说明](./README-CSV-IMPORT.md) - 数据导入详细说明

## 开发指南

### 代码规范

项目使用 ESLint 和 Prettier 进行代码规范检查：

```bash
# 检查代码规范
pnpm run lint

# 自动修复代码格式
pnpm run format
```

### 测试

```bash
# 运行单元测试
pnpm run test

# 运行端到端测试
pnpm run test:e2e

# 查看测试覆盖率
pnpm run test:coverage
```

### 提交规范

请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: 添加新功能
fix: 修复bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加测试
chore: 构建过程或辅助工具的变动
```

## 常见问题

### 数据库连接失败

1. 确保 MySQL 服务正在运行
2. 检查 `.env.local` 中的数据库配置
3. 确认数据库用户权限

### 端口占用

如果 3000 端口被占用，可以指定其他端口：

```bash
PORT=3001 pnpm run dev
```

### 依赖安装失败

尝试清除缓存后重新安装：

```bash
# 清除 pnpm 缓存
pnpm store prune

# 删除 node_modules 和锁文件
rm -rf node_modules pnpm-lock.yaml

# 重新安装
pnpm install
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 支持

如果您遇到问题或有建议，请：

1. 查看 [常见问题](#常见问题) 部分
2. 搜索现有的 [Issues](../../issues)
3. 创建新的 Issue 描述问题

---

**开发团队** | **最后更新**: 2024年1月