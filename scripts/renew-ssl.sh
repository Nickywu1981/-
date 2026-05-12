#!/bin/bash
# =============================================================================
# SSL 证书自动续期脚本（Let's Encrypt + Certbot）
# 用法: sudo ./scripts/renew-ssl.sh
#
# 建议加入 crontab（每月 1 号凌晨 3:07 执行）:
#   7 3 1 * * /path/to/scripts/renew-ssl.sh >> /var/log/ssl-renew.log 2>&1
# =============================================================================

set -euo pipefail

DOMAINS="${SSL_DOMAINS:-movioai.com www.movioai.com}"
EMAIL="${SSL_EMAIL:-admin@movioai.com}"
WEBROOT="${SSL_WEBROOT:-/var/www/html}"
NGINX_RELOAD="${NGINX_RELOAD:-true}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] SSL renewal check starting..."

# 检查 certbot 是否安装
if ! command -v certbot &>/dev/null; then
  echo "certbot not found, installing..."
  if command -v apt-get &>/dev/null; then
    apt-get update -qq && apt-get install -y certbot python3-certbot-nginx
  elif command -v yum &>/dev/null; then
    yum install -y certbot python3-certbot-nginx
  elif command -v brew &>/dev/null; then
    brew install certbot
  else
    echo "ERROR: cannot install certbot automatically, install manually first"
    exit 1
  fi
fi

# 检查证书是否存在
CERT_PATH="/etc/letsencrypt/live/${SSL_PRIMARY_DOMAIN:-movioai.com}/fullchain.pem"

if [ -f "$CERT_PATH" ]; then
  echo "Certificate exists, attempting renewal..."
  certbot renew --quiet --non-interactive --post-hook "nginx -s reload 2>/dev/null || systemctl reload nginx 2>/dev/null || true"
  echo "Renewal check complete."
else
  echo "No certificate found, requesting new one..."

  DOMAIN_ARGS=""
  for d in $DOMAINS; do
    DOMAIN_ARGS="$DOMAIN_ARGS -d $d"
  done

  certbot certonly \
    --webroot \
    --webroot-path="$WEBROOT" \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    $DOMAIN_ARGS

  echo "Certificate obtained successfully."

  if [ "$NGINX_RELOAD" = "true" ]; then
    echo "Reloading nginx..."
    nginx -s reload 2>/dev/null || systemctl reload nginx 2>/dev/null || true
  fi
fi

# 生成 DH 参数（仅首次）
DH_FILE="/etc/nginx/ssl-dhparams.pem"
if [ ! -f "$DH_FILE" ]; then
  echo "Generating DH params (this may take a minute)..."
  openssl dhparam -out "$DH_FILE" 2048
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] SSL check completed OK."
