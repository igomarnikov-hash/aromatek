#!/bin/bash
# АромаПро - Система управления производством
# Скрипт запуска приложения

echo "============================================"
echo "  АромаПро - Система управления производством"
echo "============================================"
echo ""

# Install backend dependencies
echo "→ Установка зависимостей backend..."
cd backend
npm install --production 2>/dev/null
cd ..

# Install frontend dependencies and build
echo "→ Установка зависимостей frontend..."
cd frontend
npm install 2>/dev/null
echo "→ Сборка frontend..."
npm run build 2>/dev/null
cd ..

# Start server
echo ""
echo "→ Запуск сервера..."
echo "============================================"
echo "  Приложение доступно по адресу:"
echo "  http://localhost:3001"
echo "============================================"
echo ""

cd backend
node server.js
