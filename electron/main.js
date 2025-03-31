
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const os = require('os');
const osUtils = require('node-os-utils');
const fs = require('fs');

let mainWindow;
const userDataPath = app.getPath('userData');
const memoryFilePath = path.join(userDataPath, 'karna-memory.json');

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

// Memory persistence functions
ipcMain.on('save-memory', (event, memoryData) => {
  try {
    fs.writeFileSync(memoryFilePath, JSON.stringify(memoryData, null, 2));
    event.reply('memory-saved', { success: true });
  } catch (error) {
    console.error('Error saving memory:', error);
    event.reply('memory-saved', { success: false, error: error.message });
  }
});

ipcMain.on('load-memory', (event) => {
  try {
    if (fs.existsSync(memoryFilePath)) {
      const memoryData = fs.readFileSync(memoryFilePath, 'utf8');
      event.reply('memory-loaded', { success: true, data: JSON.parse(memoryData) });
    } else {
      event.reply('memory-loaded', { success: true, data: null });
    }
  } catch (error) {
    console.error('Error loading memory:', error);
    event.reply('memory-loaded', { success: false, error: error.message });
  }
});

// Mock implementation for Ollama queries
ipcMain.on('ollama-query', (event, { id, prompt, model }) => {
  console.log(`Ollama query (${id}):`, prompt, model);
  
  // Simulate processing time
  setTimeout(() => {
    const response = {
      response: `This is a simulated response from Ollama about "${prompt}".`,
      model: model || 'llama3',
      created_at: new Date().toISOString(),
      done: true
    };
    
    event.sender.send('ollama-response', { id, response });
  }, 1500);
});

// Mock implementation for Gemini queries
ipcMain.on('gemini-query', (event, { id, prompt }) => {
  console.log(`Gemini query (${id}):`, prompt);
  
  // Simulate processing time
  setTimeout(() => {
    const response = {
      text: `This is a simulated response from Gemini about "${prompt}".`,
      model: 'gemini-pro'
    };
    
    event.sender.send('gemini-response', { id, response });
  }, 2000);
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
