const { app, BrowserWindow, Menu, Tray, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let serverProcess;
let tray;

const SERVER_PORT = 3001;
const isDev = process.argv.includes('--dev');

function getResourcePath(relativePath) {
  if (isDev) {
    return path.join(__dirname, relativePath);
  }
  return path.join(process.resourcesPath, relativePath);
}

function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = getResourcePath('backend/server.js');

    serverProcess = fork(serverPath, [], {
      env: {
        ...process.env,
        PORT: SERVER_PORT,
        NODE_ENV: 'production',
        DB_PATH: path.join(app.getPath('userData'), 'aromapro.db')
      },
      silent: true
    });

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log('[Server]', msg);
      if (msg.includes('listening') || msg.includes('started')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('[Server Error]', data.toString());
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
      reject(err);
    });

    serverProcess.on('exit', (code) => {
      console.log('Server exited with code:', code);
    });

    // Fallback resolve after 5 seconds
    setTimeout(resolve, 5000);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'АромаПро — Система управления производством',
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0a0f1e',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Remove default menu
  Menu.setApplicationMenu(null);

  mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', (e) => {
    if (process.platform === 'win32' && tray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  try {
    const iconPath = path.join(__dirname, 'icon.png');
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Открыть АромаПро', click: () => { if (mainWindow) mainWindow.show(); } },
      { type: 'separator' },
      { label: 'Выход', click: () => { app.quit(); } }
    ]);
    tray.setToolTip('АромаПро');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => { if (mainWindow) mainWindow.show(); });
  } catch (e) {
    console.log('Tray creation skipped:', e.message);
  }
}

app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
    createTray();
  } catch (err) {
    dialog.showErrorBox('Ошибка запуска',
      'Не удалось запустить сервер приложения.\n\n' + err.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopServer();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
  else mainWindow.show();
});

app.on('before-quit', () => {
  stopServer();
});

// Handle uncaught errors gracefully
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
