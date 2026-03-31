#!/bin/bash
# АромаПро — Скрипт деплоя на VPS
# Запуск на сервере: curl -sL <url>/deploy.sh | bash
# Или вручную:       ./scripts/deploy.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo "================================================"
echo "  АромаПро — Deployment Script"
echo "================================================"
echo ""

# 1. Check prerequisites
echo "--- Проверка зависимостей ---"

command -v docker &>/dev/null || err "Docker не установлен. Установите: https://docs.docker.com/engine/install/"
command -v docker compose &>/dev/null && COMPOSE="docker compose" || {
    command -v docker-compose &>/dev/null && COMPOSE="docker-compose" || err "Docker Compose не установлен"
}
log "Docker и Docker Compose найдены"

# 2. Setup environment
echo ""
echo "--- Настройка окружения ---"

if [ ! -f .env ]; then
    cp .env.example .env
    log "Создан .env из .env.example"
    warn "Проверьте настройки в .env перед продолжением"
else
    log ".env уже существует"
fi

# 3. Create directories
mkdir -p backups nginx/ssl
log "Директории созданы"

# 4. Make scripts executable
chmod +x scripts/*.sh 2>/dev/null || true
log "Скрипты настроены"

# 5. Build and start
echo ""
echo "--- Сборка и запуск ---"

$COMPOSE build --no-cache
log "Docker образ собран"

$COMPOSE down 2>/dev/null || true
$COMPOSE up -d
log "Контейнеры запущены"

# 6. Wait for health check
echo ""
echo "--- Проверка работоспособности ---"
sleep 5

for i in $(seq 1 10); do
    if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
        log "Приложение работает!"
        break
    fi
    if [ $i -eq 10 ]; then
        err "Приложение не отвечает. Проверьте логи: $COMPOSE logs app"
    fi
    echo "  Ожидание... ($i/10)"
    sleep 3
done

# 7. Setup cron backup
echo ""
echo "--- Настройка бэкапов ---"

CRON_JOB="0 3 * * * cd $(pwd) && ./scripts/backup.sh >> backups/cron.log 2>&1"
if crontab -l 2>/dev/null | grep -q "aromapro"; then
    warn "Cron-задача для бэкапов уже существует"
else
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    log "Cron-задача добавлена: ежедневный бэкап в 03:00"
fi

# 8. Summary
SERVER_IP=$(curl -sf ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo "================================================"
echo "  Деплой завершён!"
echo "================================================"
echo ""
echo "  Приложение:  http://${SERVER_IP}:80"
echo "  API:         http://${SERVER_IP}:3001/api/health"
echo ""
echo "  Управление:"
echo "    Логи:      $COMPOSE logs -f app"
echo "    Стоп:      $COMPOSE down"
echo "    Рестарт:   $COMPOSE restart"
echo "    Бэкап:     ./scripts/backup.sh"
echo "    Восстан.:  ./scripts/restore.sh <file>"
echo ""
echo "  SSL (опционально):"
echo "    1. Положите сертификаты в nginx/ssl/"
echo "    2. Раскомментируйте HTTPS в nginx/nginx.conf"
echo "    3. $COMPOSE restart nginx"
echo ""
