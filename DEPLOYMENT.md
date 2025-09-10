# 部署文档

## 目录
1. [环境要求](#环境要求)
2. [本地开发环境](#本地开发环境)
3. [生产环境部署](#生产环境部署)
4. [数据库配置](#数据库配置)
5. [环境变量配置](#环境变量配置)
6. [Docker 部署](#docker-部署)
7. [云平台部署](#云平台部署)
8. [监控和维护](#监控和维护)
9. [故障排除](#故障排除)

## 环境要求

### 基础要求
- **Node.js**: 18.0.0 或更高版本
- **pnpm**: 8.0.0 或更高版本（推荐）或 npm 9.0.0+
- **MySQL**: 8.0 或更高版本
- **操作系统**: Linux, macOS, Windows

### 推荐配置
- **CPU**: 2 核心或更多
- **内存**: 4GB 或更多
- **存储**: 20GB 可用空间
- **网络**: 稳定的互联网连接

## 本地开发环境

### 1. 克隆项目

```bash
git clone <repository-url>
cd energy-dashboard
```

### 2. 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 3. 环境变量配置

创建 `.env.local` 文件：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件：

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

访问 `http://localhost:3000` 查看应用。

## 生产环境部署

### 1. 构建应用

```bash
# 安装生产依赖
pnpm install --production

# 构建应用
pnpm run build
```

### 2. 启动生产服务器

```bash
# 启动生产服务器
pnpm start

# 或使用 PM2（推荐）
npm install -g pm2
pm2 start ecosystem.config.js
```

### 3. PM2 配置文件

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'roi-dashboard',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

## 数据库配置

### MySQL 安装和配置

#### Ubuntu/Debian

```bash
# 安装 MySQL
sudo apt update
sudo apt install mysql-server

# 安全配置
sudo mysql_secure_installation

# 创建数据库和用户
sudo mysql -u root -p
```

```sql
CREATE DATABASE roi_dashboard;
CREATE USER 'roi_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON roi_dashboard.* TO 'roi_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### macOS

```bash
# 使用 Homebrew 安装
brew install mysql
brew services start mysql

# 安全配置
mysql_secure_installation
```

#### Windows

1. 下载 MySQL Installer
2. 运行安装程序
3. 选择 "Server only" 或 "Developer Default"
4. 配置 root 密码
5. 完成安装

### 数据库表结构

```sql
-- ROI 数据表
CREATE TABLE roi_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  app VARCHAR(100) NOT NULL,
  bid_type VARCHAR(50) NOT NULL,
  country VARCHAR(100) NOT NULL,
  channel VARCHAR(100) NOT NULL DEFAULT 'organic',
  installs INT DEFAULT 0,
  roi_1_day DECIMAL(10,4) DEFAULT 0.0000,
  roi_3_day DECIMAL(10,4) DEFAULT 0.0000,
  roi_7_day DECIMAL(10,4) DEFAULT 0.0000,
  roi_14_day DECIMAL(10,4) DEFAULT 0.0000,
  roi_30_day DECIMAL(10,4) DEFAULT 0.0000,
  is_real_zero BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_roi_record (date, app, bid_type, country, channel),
  INDEX idx_date (date),
  INDEX idx_app (app),
  INDEX idx_country (country),
  INDEX idx_channel (channel),
  INDEX idx_bid_type (bid_type)
);
```

## 环境变量配置

### 开发环境 (.env.local)

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=roi_user
DB_PASSWORD=your_password
DB_NAME=roi_dashboard

# 应用配置
NODE_ENV=development
PORT=3000
NEXTAUTH_SECRET=dev-secret-key
NEXTAUTH_URL=http://localhost:3000

# 调试配置
DEBUG=true
LOG_LEVEL=debug
```

### 生产环境 (.env.production)

```env
# 数据库配置
DB_HOST=your-production-db-host
DB_PORT=3306
DB_USER=roi_user
DB_PASSWORD=strong_production_password
DB_NAME=roi_dashboard
DB_SSL=true

# 应用配置
NODE_ENV=production
PORT=3000
NEXTAUTH_SECRET=very-strong-production-secret
NEXTAUTH_URL=https://your-domain.com

# 安全配置
CSRF_SECRET=csrf-secret-key
SESSION_SECRET=session-secret-key

# 监控配置
LOG_LEVEL=info
ENABLE_METRICS=true
```

## Docker 部署

### 1. Dockerfile

```dockerfile
# 多阶段构建
FROM node:18-alpine AS base

# 安装依赖阶段
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable pnpm && pnpm run build

# 运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 2. docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_PORT=3306
      - DB_USER=roi_user
      - DB_PASSWORD=password
      - DB_NAME=roi_dashboard
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=roi_dashboard
      - MYSQL_USER=roi_user
      - MYSQL_PASSWORD=password
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3306:3306"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mysql_data:
```

### 3. 部署命令

```bash
# 构建和启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 更新应用
docker-compose pull
docker-compose up -d
```

## 云平台部署

### Vercel 部署

1. **连接 GitHub 仓库**
   - 登录 Vercel
   - 导入 GitHub 项目
   - 配置构建设置

2. **环境变量配置**
   ```
   DB_HOST=your-cloud-db-host
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   DB_NAME=roi_dashboard
   NEXTAUTH_SECRET=your-secret
   NEXTAUTH_URL=https://your-app.vercel.app
   ```

3. **数据库配置**
   - 使用 PlanetScale、Supabase 或 AWS RDS
   - 配置连接字符串
   - 运行数据库迁移

### AWS 部署

#### 使用 AWS Amplify

```bash
# 安装 Amplify CLI
npm install -g @aws-amplify/cli

# 初始化项目
amplify init

# 添加托管
amplify add hosting

# 部署
amplify publish
```

#### 使用 AWS ECS

1. **创建 ECR 仓库**
2. **构建和推送 Docker 镜像**
3. **创建 ECS 任务定义**
4. **创建 ECS 服务**
5. **配置负载均衡器**

### Google Cloud Platform

```bash
# 安装 gcloud CLI
curl https://sdk.cloud.google.com | bash

# 初始化
gcloud init

# 部署到 Cloud Run
gcloud run deploy roi-dashboard \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## 监控和维护

### 日志管理

```bash
# PM2 日志
pm2 logs
pm2 logs roi-dashboard

# 日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### 性能监控

```javascript
// 添加到 next.config.js
module.exports = {
  experimental: {
    instrumentationHook: true,
  },
  // 其他配置...
}
```

### 健康检查

创建 `/api/health` 端点：

```typescript
// pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}
```

### 备份策略

```bash
#!/bin/bash
# backup.sh

DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backups"
DB_NAME="roi_dashboard"

# 数据库备份
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# 压缩备份
gzip $BACKUP_DIR/db_backup_$DATE.sql

# 删除 7 天前的备份
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete
```

## 故障排除

### 常见问题

#### 1. 数据库连接失败

```bash
# 检查数据库状态
sudo systemctl status mysql

# 检查端口
netstat -tlnp | grep :3306

# 测试连接
mysql -h localhost -u roi_user -p
```

#### 2. 应用启动失败

```bash
# 检查日志
pm2 logs roi-dashboard

# 检查端口占用
lsof -i :3000

# 重启应用
pm2 restart roi-dashboard
```

#### 3. 内存不足

```bash
# 检查内存使用
free -h

# 检查进程内存
ps aux --sort=-%mem | head

# 增加 swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 性能优化

#### 1. 数据库优化

```sql
-- 添加索引
CREATE INDEX idx_date_app ON roi_data(date, app);
CREATE INDEX idx_country_channel ON roi_data(country, channel);

-- 分析查询性能
EXPLAIN SELECT * FROM roi_data WHERE date >= '2024-01-01';
```

#### 2. 应用优化

```javascript
// next.config.js
module.exports = {
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // 图片优化
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // 缓存配置
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=60'
          }
        ]
      }
    ];
  }
};
```

### 安全加固

#### 1. 防火墙配置

```bash
# Ubuntu UFW
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3306/tcp
```

#### 2. SSL 证书

```bash
# 使用 Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### 3. 安全头配置

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};
```

---

*本文档会根据部署经验持续更新*