
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const os = require('os');
const osUtils = require('node-os-utils');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
  });

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:8080' // Development server
    : `file://${path.join(__dirname, '../dist/index.html')}`; // Production build

  mainWindow.loadURL(startUrl);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set up system monitoring
  setupSystemMonitoring();
}

function setupSystemMonitoring() {
  // CPU usage monitoring
  setInterval(async () => {
    try {
      const cpuUsage = await osUtils.cpu.usage();
      const memInfo = await osUtils.mem.info();
      const fsStats = await osUtils.drive.info();

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('system-stats', {
          cpu: {
            usage: cpuUsage,
            count: os.cpus().length,
            model: os.cpus()[0].model,
          },
          memory: {
            total: os.totalmem(),
            free: os.freemem(),
            usedPercentage: 100 - memInfo.freeMemPercentage,
          },
          disk: {
            usedPercentage: 100 - fsStats.freePercentage,
          },
          uptime: os.uptime(),
        });
      }
    } catch (error) {
      console.error('Error getting system stats:', error);
    }
  }, 2000);
}

// Handle IPC messages from renderer
ipcMain.on('speak-text', (event, text) => {
  // In a full implementation, you could use a native TTS engine here
  console.log('Speaking:', text);
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
