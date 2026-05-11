#!/bin/bash
# ============================================================
# Movio AI — 数据库自动备份脚本
# 用法: ./scripts/backup-db.sh [retention_days]
# crontab: 0 2 * * * /app/scripts/backup-db.sh 30
# ============================================================

set -euo pipefail

RETENTION_DAYS="${1:-30}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/ai_saas_${TIMESTAMP}.sql.gz"

# ---- 加载环境变量 ----
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-ai_saas}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-ai_saas}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup of ${DB_NAME}..."

# ---- 执行备份 ----
mysqldump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --user="${DB_USER}" \
  --password="${DB_PASSWORD}" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --set-gtid-purged=OFF \
  "${DB_NAME}" | gzip > "${BACKUP_FILE}"

echo "[$(date)] Backup saved: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# ---- 清理过期备份 ----
DELETED=0
find "${BACKUP_DIR}" -name "ai_saas_*.sql.gz" -mtime +"${RETENTION_DAYS}" -print -delete | while read -r f; do
  echo "[$(date)] Deleted expired backup: ${f}"
  DELETED=$((DELETED + 1))
done

# ---- 保留最近 7 天统计 ----
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "ai_saas_*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)

echo "[$(date)] Backup complete. Files: ${BACKUP_COUNT}, Total: ${TOTAL_SIZE}, Retention: ${RETENTION_DAYS}d"
