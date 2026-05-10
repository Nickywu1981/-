#!/bin/bash
# ============================================================
# Movio AI 一键部署脚本
# 用法: chmod +x deploy.sh && sudo ./deploy.sh
# 适配: Ubuntu 22.04 LTS
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[OK]${NC}  $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC}  $1"; exit 1; }

APP_DIR="/opt/movio"
DOMAIN="${1:-}"
NODE_VERSION="20"

[[ $(id -u) -eq 0 ]] || err "请以 root 执行: sudo ./deploy.sh your-domain.com"
[[ -z "$DOMAIN" ]] && err "用法: sudo ./deploy.sh your-domain.com"

# ==================== Step 1: 系统依赖 ====================
log "Step 1/6: 安装系统依赖..."
apt-get update -qq
apt-get install -y -qq curl git nginx certbot python3-certbot-nginx mysql-server redis-server brotli 2>&1 | tail -1

# ==================== Step 2: Node.js ====================
log "Step 2/6: 安装 Node.js ${NODE_VERSION}..."
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - 2>&1 | tail -1
  apt-get install -y -qq nodejs
fi
log "Node $(node -v) / npm $(npm -v)"

# ==================== Step 3: 数据库 ====================
log "Step 3/6: 初始化数据库..."
systemctl start mysql redis-server 2>/dev/null || true

if ! mysql -u root -e "SELECT 1" &>/dev/null; then
  warn "MySQL root 需要密码，请手动创建数据库后重新运行"
  warn "  CREATE DATABASE movio CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
fi

mysql -u root -e "CREATE DATABASE IF NOT EXISTS movio CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;" 2>/dev/null || true

# 导入 schema + migration + seed
MIGRATIONS=$(ls ${APP_DIR}/server/sql/migration_0*.sql 2>/dev/null | sort || true)
SEEDS=$(ls ${APP_DIR}/server/sql/seed_*.sql 2>/dev/null | sort || true)

if [[ -f "${APP_DIR}/server/sql/schema.sql" ]]; then
  mysql -u root movio < "${APP_DIR}/server/sql/schema.sql" && log "schema.sql 导入完成"
fi

for f in $MIGRATIONS; do
  mysql -u root movio < "$f" 2>/dev/null && log "迁移: $(basename $f)" || warn "跳过: $(basename $f)"
done

for f in $SEEDS; do
  mysql -u root movio < "$f" 2>/dev/null && log "种子: $(basename $f)" || warn "跳过: $(basename $f)"
done

# ==================== Step 4: 环境配置 ====================
log "Step 4/6: 配置环境变量..."
cd "$APP_DIR/server"

if [[ ! -f .env ]]; then
  cp .env.example .env
  warn ".env 已从模板创建，请编辑填入真实 API-Key:"
  warn "  vim ${APP_DIR}/server/.env"
  warn "  必填: JWT_SECRET / AES_ENCRYPTION_KEY / OPENAI_API_KEY"
fi

# 生成密钥
if grep -q "your-secret-key" .env 2>/dev/null; then
  JWT_SECRET=$(openssl rand -hex 32)
  AES_KEY=$(openssl rand -hex 16)
  CSRF_SECRET=$(openssl rand -hex 16)
  sed -i "s/your-secret-key/${JWT_SECRET}/" .env
  sed -i "s/your-refresh-secret/${JWT_SECRET}_refresh/" .env
  sed -i "s/your-csrf-secret/${CSRF_SECRET}/" .env
  sed -i "s|ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${AES_KEY}|" .env 2>/dev/null || echo "ENCRYPTION_KEY=${AES_KEY}" >> .env
  sed -i "s/NODE_ENV=development/NODE_ENV=production/" .env
  sed -i "s/MOCK_ENABLED=true/MOCK_ENABLED=false/" .env
  log "JWT/AES/CSRF 密钥已自动生成"
fi

# ==================== Step 5: 安装依赖 + 启动 ====================
log "Step 5/6: 安装依赖 + 启动..."
npm install --production 2>&1 | tail -1

npm install -g pm2 2>&1 | tail -1 || true

# 创建日志目录
mkdir -p logs

pm2 delete movio-api 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root 2>&1 | tail -1 || true
log "PM2 已启动, 状态:"
pm2 status

# ==================== Step 6: Nginx + HTTPS ====================
log "Step 6/6: 配置 Nginx + SSL..."
cp "${APP_DIR}/nginx.conf" /etc/nginx/sites-available/movio
sed -i "s/your-domain.com/${DOMAIN}/g" /etc/nginx/sites-available/movio

ln -sf /etc/nginx/sites-available/movio /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx && log "Nginx 配置通过"

# SSL 证书
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@${DOMAIN}" 2>&1 | tail -3 || warn "SSL 证书申请失败，请手动执行: certbot --nginx -d ${DOMAIN}"

# ==================== 完成 ====================
echo ""
echo "============================================"
echo "  Movio AI 部署完成!"
echo "  访问: https://${DOMAIN}"
echo "  API:  https://${DOMAIN}/api/health"
echo "  PM2:  pm2 status"
echo "  日志: pm2 logs movio-api"
echo "============================================"
echo ""
warn "请立即编辑 .env 填入真实 API-Key:"
warn "  vim ${APP_DIR}/server/.env"
warn "  pm2 restart movio-api"
