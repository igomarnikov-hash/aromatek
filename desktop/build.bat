@echo off
echo =============================================
echo   АромаПро — Desktop Build (Windows)
echo =============================================

echo [1/5] Copying backend...
if exist backend rmdir /s /q backend
mkdir backend\routes
copy ..\backend\server.js backend\
copy ..\backend\database.js backend\
copy ..\backend\routes\*.js backend\routes\

echo [2/5] Copying frontend...
if exist frontend rmdir /s /q frontend
mkdir frontend\dist
xcopy ..\frontend\dist frontend\dist /s /e /q

echo [3/5] Creating icon...
node create-icon.js

echo [4/5] Installing dependencies...
call npm install

echo [5/5] Building Windows installer...
call npm run build:win

echo.
echo =============================================
echo   Build complete! Check the release\ folder
echo   File: release\AromaPro-Setup-1.0.0.exe
echo =============================================
pause
