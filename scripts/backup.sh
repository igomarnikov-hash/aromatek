#!/bin/bash
# АромаПро — Резервное копирование базы данных
# Запуск: ./scripts/backup.sh
# Cron:   0 3 * * * /path/to/scripts/backup.sh

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_CONTAINER="${DB_CONTAINER:-aromapro}"
DB_PATH="/app/data/aromapro.db"
KEEP_DAYS="${KEEP_DAYS:-14}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/aromapro_${TIMESTAMP}.db"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# If running in Docker
if command -v docker &> /dev/null && docker ps -q -f name="$DB_CONTAINER" | grep -q .; then
    docker cp "${DB_CONTAINER}:${DB_PATH}" "$BACKUP_FILE"
    echo "  Copied from Docker container: $DB_CONTAINER"
else
    # Direct copy (non-Docker)
    LOCAL_DB="${LOCAL_DB:-./backend/aromapro.db}"
    if [ -f "$LOCAL_DB" ]; then
        cp "$LOCAL_DB" "$BACKUP_FILE"
        echo "  Copied local file: $LOCAL_DB"
    else
        echo "  ERROR: Database not found at $LOCAL_DB"
        exit 1
    fi
fi

# Compress
if command -v gzip &> /dev/null; then
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    echo "  Compressed: $BACKUP_FILE"
fi

# Report size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "  Backup size: $SIZE"

# Cleanup old backups
DELETED=$(find "$BACKUP_DIR" -name "aromapro_*.db*" -mtime +${KEEP_DAYS} -delete -print | wc -l)
echo "  Deleted old backups: $DELETED (older than ${KEEP_DAYS} days)"

echo "[$(date)] Backup complete: $BACKUP_FILE"
