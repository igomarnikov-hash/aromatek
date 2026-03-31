# АромаПро — Сборка Desktop-версии (Windows .exe)

## Требования
- Node.js 18+ (https://nodejs.org)
- Windows 10/11 (для нативной сборки) или macOS с Wine (для кросс-компиляции)

## Быстрая сборка на Windows

1. Откройте PowerShell или CMD в папке `desktop/`
2. Запустите:
```
build.bat
```
3. Готовый установщик: `desktop/release/AromaPro-Setup-1.0.0.exe`

## Ручная сборка (пошагово)

### 1. Скопируйте файлы бэкенда и фронтенда
```bash
# Из папки desktop/
mkdir backend\routes
copy ..\backend\server.js backend\
copy ..\backend\database.js backend\
copy ..\backend\routes\*.js backend\routes\

mkdir frontend\dist
xcopy ..\frontend\dist frontend\dist /s /e
```

### 2. Установите зависимости
```bash
npm install
```

### 3. Соберите .exe
```bash
npm run build:win
```

### 4. Результат
Файл `release/AromaPro-Setup-1.0.0.exe` — полноценный установщик NSIS для Windows.

## Что внутри
- Electron — десктоп-оболочка
- Express.js сервер — запускается автоматически при старте приложения
- SQLite (sql.js) — база данных хранится в `%APPDATA%/aromapro/`
- React фронтенд — встроен в приложение

## Сборка на macOS (кросс-компиляция)
```bash
brew install --cask wine-stable
chmod +x build.sh
./build.sh
npm run build:win
```
