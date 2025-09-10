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

### 1. 服务器环境准备

#### 系统要求
- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **CPU**: 2核心以上
- **内存**: 4GB以上
- **存储**: 20GB可用空间
- **网络**: 公网IP和域名（可选）

#### 安装必要软件

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# 安装 Nginx（可选，用于反向代理）
sudo apt install nginx -y

# 安装 Git
sudo apt install git -y
```

#### 防火墙配置

```bash
# 启用防火墙
sudo ufw enable

# 允许SSH
sudo ufw allow ssh

# 允许HTTP和HTTPS
sudo ufw allow 80
sudo ufw allow 443

# 允许应用端口（3005）
sudo ufw allow 3005

# 查看防火墙状态
sudo ufw status
```

### 2. 项目部署

#### 克隆项目到服务器

```bash
# 创建项目目录
sudo mkdir -p /mnt/data/quanmin
sudo chown $USER:$USER /mnt/data/quanmin

# 克隆项目
cd /mnt/data/quanmin
git clone <your-repository-url> energy-dashboard-main
cd energy-dashboard-main
```

#### 安装依赖和构建

```bash
# 安装依赖
npm install

# 构建应用（生产环境）
npm run build

# 或者开发环境直接启动
# npm run start:dev
```

### 2. 启动生产服务器

```bash
# 启动生产服务器
pnpm start

# 或使用 PM2（推荐）
npm install -g pm2
pm2 start ecosystem.config.js
```

### 3. PM2 部署配置

#### 方法一：使用 ecosystem.config.js 配置文件（推荐）

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'Dash',
    script: 'npm',
    args: 'run start:dev',
    cwd: '/mnt/data/quanmin/energy-dashboard-main',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3005
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3005
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

启动命令：
```bash
pm2 start ecosystem.config.js
```

#### 方法二：直接使用命令行启动

```bash
# 开发环境启动（端口3005）
PORT=3005 pm2 start npm --name "Dash" -- run start:dev --prefix /mnt/data/quanmin/energy-dashboard-main

# 生产环境启动
PORT=3005 pm2 start npm --name "Dash" -- run start --prefix /mnt/data/quanmin/energy-dashboard-main
```

#### PM2 常用管理命令

```bash
# 查看所有进程
pm2 list

# 查看进程详情
pm2 show Dash

# 查看日志
pm2 logs Dash

# 重启应用
pm2 restart Dash

# 停止应用
pm2 stop Dash

# 删除应用
pm2 delete Dash

# 重载应用（零停机时间）
pm2 reload Dash

# 监控
pm2 monit

# 保存当前进程列表
pm2 save

# 开机自启动
pm2 startup
pm2 save
```
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

### 3. 环境变量配置

创建生产环境配置文件：

```bash
# 创建环境变量文件
cp .env.example .env.production

# 编辑生产环境配置
nano .env.production
```

生产环境配置示例：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=30TasH2i!@#
DB_NAME=energy_dashboard

# 应用配置
NODE_ENV=production
PORT=3005
NEXTAUTH_SECRET=your-production-secret-key
NEXTAUTH_URL=http://your-domain.com:3005

# 安全配置
SSL_ENABLED=false
CORS_ORIGIN=http://your-domain.com:3005
```

### 4. 启动应用

```bash
# 使用PM2启动应用
PORT=3005 pm2 start npm --name "Dash" -- run start:dev --prefix /mnt/data/quanmin/energy-dashboard-main

# 或使用配置文件启动
pm2 start ecosystem.config.js

# 设置开机自启动
pm2 startup
pm2 save
```

### 5. Nginx反向代理配置（可选）

创建Nginx配置文件：

```bash
sudo nano /etc/nginx/sites-available/energy-dashboard
```

配置内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：
```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/energy-dashboard /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

## 故障排除

### PM2 相关问题

#### 1. 应用启动失败

```bash
# 查看详细错误日志
pm2 logs Dash --lines 50

# 查看进程状态
pm2 list

# 重启应用
pm2 restart Dash
```

#### 2. 端口占用问题

```bash
# 查看端口占用
sudo netstat -tlnp | grep :3005
# 或
sudo lsof -i :3005

# 杀死占用进程
sudo kill -9 <PID>

# 重新启动应用
pm2 restart Dash
```

#### 3. 内存不足

```bash
# 查看内存使用
free -h
pm2 monit

# 设置内存限制
pm2 start ecosystem.config.js --max-memory-restart 1G
```

#### 4. 权限问题

```bash
# 检查文件权限
ls -la /mnt/data/quanmin/energy-dashboard-main

# 修改权限
sudo chown -R $USER:$USER /mnt/data/quanmin/energy-dashboard-main
sudo chmod -R 755 /mnt/data/quanmin/energy-dashboard-main
```

### 数据库连接问题

#### 1. 连接被拒绝

```bash
# 检查MySQL服务状态
sudo systemctl status mysql

# 启动MySQL服务
sudo systemctl start mysql

# 测试数据库连接
mysql -u root -p -h localhost
```

#### 2. 权限问题

```sql
-- 创建数据库用户
CREATE USER 'dash'@'localhost' IDENTIFIED BY '30TasHi!@#';
GRANT ALL PRIVILEGES ON energy_dashboard.* TO 'dash'@'localhost';
FLUSH PRIVILEGES;
```

### 网络和防火墙问题

#### 1. 端口无法访问

```bash
# 检查防火墙状态
sudo ufw status

# 开放端口
sudo ufw allow 3005

# 检查应用是否监听端口
sudo netstat -tlnp | grep :3005
```

#### 2. 域名解析问题

```bash
# 测试域名解析
nslookup your-domain.com

# 测试网络连接
ping your-domain.com

# 检查本地hosts文件
cat /etc/hosts
```

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

## 部署检查清单

### 部署前检查

- [ ] 服务器环境准备完成（Node.js, PM2, MySQL, Git）
- [ ] 防火墙配置正确（端口3005已开放）
- [ ] 数据库服务正常运行
- [ ] 项目代码已克隆到指定目录
- [ ] 环境变量配置文件已创建
- [ ] 依赖包安装完成
- [ ] 数据库连接测试通过

### 部署后验证

- [ ] PM2进程状态正常
- [ ] 应用端口监听正常（3005）
- [ ] 网页可以正常访问
- [ ] 数据库操作功能正常
- [ ] 日志输出正常
- [ ] 内存使用在合理范围内
- [ ] 开机自启动配置完成

### 验证命令

```bash
# 检查PM2状态
pm2 list
pm2 logs Dash --lines 20

# 检查端口监听
sudo netstat -tlnp | grep :3005

# 检查应用响应
curl http://localhost:3005

# 检查系统资源
free -h
df -h

# 检查防火墙
sudo ufw status
```

## 最佳实践

### 1. 安全配置

```bash
# 定期更新系统
sudo apt update && sudo apt upgrade

# 配置SSH密钥认证
ssh-keygen -t ed25519
# 禁用密码登录（可选）

# 设置强密码策略
# 定期备份数据库
```

### 2. 监控和告警

```bash
# 安装系统监控工具
sudo apt install htop iotop

# 配置PM2监控
pm2 install pm2-server-monit

# 设置日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 3. 备份策略

```bash
# 数据库备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p energy_dashboard > /backup/energy_dashboard_$DATE.sql

# 代码备份
tar -czf /backup/energy-dashboard_$DATE.tar.gz /mnt/data/quanmin/energy-dashboard-main

# 设置定时备份
crontab -e
# 添加：0 2 * * * /path/to/backup-script.sh
```

### 4. 性能调优

```bash
# PM2集群模式（生产环境推荐）
pm2 start ecosystem.config.js --env production

# 启用gzip压缩
# 配置CDN加速
# 数据库查询优化
# 静态资源缓存
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