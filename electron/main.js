
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const os = require('os');
const osUtils = require('node-os-utils');
const fs = require('fs');
const fetch = require('node-fetch');

let mainWindow;
const userDataPath = app.getPath('userData');
const memoryFilePath = path.join(userDataPath, 'karna-memory.json');

// Configuration for LLM services
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''; // Set your Gemini API key in environment variables

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

// Real implementation for Ollama queries
ipcMain.on('ollama-query', async (event, { id, prompt, model }) => {
  console.log(`Ollama query (${id}):`, prompt, model);
  
  try {
    // Use default model if not specified
    const modelToUse = model || 'llama3';
    
    // Call actual Ollama API
    const response = await fetch(`${OLLAMA_API_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelToUse,
        prompt,
        stream: false,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    event.sender.send('ollama-response', {
      id,
      response: {
        response: data.response,
        model: modelToUse,
        created_at: new Date().toISOString(),
        done: true
      }
    });
  } catch (error) {
    console.error('Error querying Ollama:', error);
    event.sender.send('ollama-response', {
      id,
      error: error.message
    });
  }
});

// Real implementation for Gemini queries
ipcMain.on('gemini-query', async (event, { id, prompt }) => {
  console.log(`Gemini query (${id}):`, prompt);
  
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not found. Set the GEMINI_API_KEY environment variable.');
    }
    
    // Call actual Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Extract text from the response
    let text = '';
    if (data.candidates && data.candidates.length > 0 && 
        data.candidates[0].content && data.candidates[0].content.parts) {
      text = data.candidates[0].content.parts.map(part => part.text).join('');
    }
    
    event.sender.send('gemini-response', {
      id,
      response: {
        text,
        model: 'gemini-pro'
      }
    });
  } catch (error) {
    console.error('Error querying Gemini:', error);
    event.sender.send('gemini-response', {
      id,
      error: error.message
    });
  }
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
