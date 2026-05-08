# Movio AI 部署手册

## 前置条件

| 资源 | 要求 |
|------|------|
| 服务器 | Ubuntu 22.04 LTS, 2核4G+, 40G SSD |
| 域名 | 已解析到服务器 IP |
| API-Key | OpenAI / Stability AI（至少各 1 个） |
| 端口 | 80/443（HTTP/HTTPS）, 22（SSH） |

## 一键部署

```bash
git clone https://github.com/your-org/movio-ai.git /opt/movio
cd /opt/movio
chmod +x deploy.sh
sudo ./deploy.sh your-domain.com
```

脚本自动完成：系统依赖 → Node.js → MySQL+Redis → 数据库迁移 → 密钥生成 → npm install → PM2 启动 → Nginx+SSL

## 手动部署（分步）

### 1. 服务器环境

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# MySQL 8 + Redis
sudo apt-get install -y mysql-server redis-server nginx certbot python3-certbot-nginx
```

### 2. 数据库

```bash
sudo mysql -u root <<SQL
CREATE DATABASE movio CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'movio'@'localhost' IDENTIFIED BY 'your-db-password';
GRANT ALL PRIVILEGES ON movio.* TO 'movio'@'localhost';
FLUSH PRIVILEGES;
SQL

cd /opt/movio/server
mysql -u movio -p movio < sql/schema.sql
for f in sql/migration_0*.sql; do mysql -u movio -p movio < "$f"; done
for f in sql/seed_*.sql; do mysql -u movio -p movio < "$f"; done
```

### 3. 环境变量

```bash
cp .env.example .env
# 编辑 .env 填入真实值：
#   JWT_SECRET=<32位随机字符串>
#   AES_ENCRYPTION_KEY=<32位hex>
#   OPENAI_API_KEY=sk-xxx
#   STABILITY_API_KEY=sk-xxx
#   DB_PASSWORD=<数据库密码>
#   NODE_ENV=production
#   MOCK_ENABLED=false
```

### 4. 启动

```bash
npm install --production
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 5. Nginx + SSL

```bash
sudo cp /opt/movio/nginx.conf /etc/nginx/sites-available/movio
sudo sed -i 's/your-domain.com/你的域名/g' /etc/nginx/sites-available/movio
sudo ln -sf /etc/nginx/sites-available/movio /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d 你的域名
```

### 6. 验证

```bash
# 健康检查
curl https://你的域名/api/health

# 预期返回:
# {"status":"ok","models":{"openai":"healthy","sd":"healthy"},"uptime":...}

# 运行测试
cd /opt/movio/server
npx vitest run src/__tests__/route/core.test.js
```

## 运维命令

| 操作 | 命令 |
|------|------|
| 查看状态 | `pm2 status` |
| 查看日志 | `pm2 logs movio-api` |
| 重启 | `pm2 restart movio-api` |
| 重载（零停机） | `pm2 reload movio-api` |
| 更新代码 | `git pull && npm install && pm2 reload movio-api` |
| SSL 续期 | `sudo certbot renew --dry-run`（自动续期已配置） |

## 目录结构

```
/opt/movio/
├── server/                  # Express API 服务
│   ├── src/
│   ├── sql/                 # 数据库迁移+种子
│   ├── logs/                # PM2 日志
│   ├── certs/               # 支付证书
│   ├── .env                 # 环境变量（保密）
│   └── ecosystem.config.cjs # PM2 配置
├── client/                  # Nuxt3 前端
├── nginx.conf               # Nginx 配置
└── deploy.sh                # 部署脚本
```

## 故障排查

| 现象 | 检查 |
|------|------|
| 502 Bad Gateway | `pm2 status` 确认服务运行 |
| 数据库连接失败 | `.env` 中 DB 配置 + MySQL 服务状态 |
| AI 生成失败 | `.env` 中 API-Key 是否正确、额度是否用完 |
| SSL 证书错误 | `sudo certbot certificates` 查看证书状态 |
