#!/bin/bash
# АромаПро — Восстановление из резервной копии
# Запуск: ./scripts/restore.sh backups/aromapro_20240320_030000.db.gz

set -e

if [ -z "$1" ]; then
    echo "Использование: $0 <path-to-backup>"
    echo ""
    echo "Доступные бэкапы:"
    ls -lth backups/aromapro_*.db* 2>/dev/null || echo "  Нет бэкапов в ./backups/"
    exit 1
fi

BACKUP="$1"
DB_CONTAINER="${DB_CONTAINER:-aromapro}"
DB_PATH="/app/data/aromapro.db"

echo "[$(date)] Restoring from: $BACKUP"

# Decompress if needed
RESTORE_FILE="$BACKUP"
if [[ "$BACKUP" == *.gz ]]; then
    RESTORE_FILE="/tmp/aromapro_restore.db"
    gunzip -c "$BACKUP" > "$RESTORE_FILE"
    echo "  Decompressed to: $RESTORE_FILE"
fi

# Verify it's a valid SQLite database
if ! file "$RESTORE_FILE" | grep -q "SQLite"; then
    echo "  ERROR: Not a valid SQLite database"
    exit 1
fi

echo "  Database verified as SQLite"

# Stop app
echo "  Stopping application..."
if command -v docker &> /dev/null && docker ps -q -f name="$DB_CONTAINER" | grep -q .; then
    docker stop "$DB_CONTAINER"
    docker cp "$RESTORE_FILE" "${DB_CONTAINER}:${DB_PATH}"
    docker start "$DB_CONTAINER"
    echo "  Restored in Docker container"
else
    LOCAL_DB="${LOCAL_DB:-./backend/aromapro.db}"
    cp "$RESTORE_FILE" "$LOCAL_DB"
    echo "  Restored local file: $LOCAL_DB"
fi

# Cleanup
if [ "$RESTORE_FILE" = "/tmp/aromapro_restore.db" ]; then
    rm -f "$RESTORE_FILE"
fi

echo "[$(date)] Restore complete!"
echo "  Restart the application if it was running."
