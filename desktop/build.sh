#!/bin/bash
# Build script for АромаПро Desktop
# Run from the desktop/ directory

set -e

echo "============================================="
echo "  АромаПро — Desktop Build"
echo "============================================="

# 1. Copy backend files
echo "[1/5] Copying backend..."
rm -rf backend
mkdir -p backend/routes
cp ../backend/server.js backend/
cp ../backend/database.js backend/
cp ../backend/routes/*.js backend/routes/

# 2. Copy frontend dist
echo "[2/5] Copying frontend..."
rm -rf frontend
mkdir -p frontend/dist
cp -r ../frontend/dist/* frontend/dist/

# 3. Create icon
echo "[3/5] Creating icon..."
node create-icon.js

# 4. Install dependencies
echo "[4/5] Installing dependencies..."
npm install

# 5. Build for target platform
echo "[5/5] Building installer..."

if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]] || [[ -n "$WINDIR" ]]; then
    echo "Building for Windows..."
    npm run build:win
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Building for macOS..."
    echo "To cross-compile for Windows, install Wine:"
    echo "  brew install --cask wine-stable"
    echo ""
    echo "Then run: npm run build:win"
    echo ""
    echo "Building for macOS instead..."
    npm run build:mac
else
    echo "Building for Linux..."
    npm run build:linux
fi

echo ""
echo "============================================="
echo "  Build complete! Check the release/ folder"
echo "============================================="
