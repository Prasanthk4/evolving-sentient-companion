const { app, BrowserWindow, ipcMain, shell, screen } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const os = require('os');
const osUtils = require('node-os-utils');
const fs = require('fs');
const fetch = require('node-fetch');
const { exec } = require('child_process');

let mainWindow;
const userDataPath = app.getPath('userData');
const memoryFilePath = path.join(userDataPath, 'karna-memory.json');
const modelsPath = path.join(userDataPath, 'models');

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

  // Ensure model directory exists and models are copied
  ensureFaceModelsExist();
}

function ensureFaceModelsExist() {
  // Create models directory if it doesn't exist
  if (!fs.existsSync(modelsPath)) {
    try {
      fs.mkdirSync(modelsPath, { recursive: true });
      console.log(`Created models directory at: ${modelsPath}`);
    } catch (error) {
      console.error(`Error creating models directory: ${error}`);
    }
  }

  // Define model files to ensure
  const requiredModelFiles = [
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_expression_model-weights_manifest.json',
    'face_expression_model-shard1'
  ];

  // Copy model files from public/models to user's app data directory
  const sourceDir = path.join(isDev ? process.cwd() : process.resourcesPath, 'public', 'models');
  
  requiredModelFiles.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(modelsPath, file);
    
    if (!fs.existsSync(destPath) && fs.existsSync(sourcePath)) {
      try {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Copied model file: ${file}`);
      } catch (error) {
        console.error(`Error copying model file ${file}:`, error);
      }
    }
  });
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

// Handle creating directories for face-api models
ipcMain.on('create-directory', (event, dirPath) => {
  const fullPath = path.join(userDataPath, dirPath);
  
  if (!fs.existsSync(fullPath)) {
    try {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`Directory created: ${fullPath}`);
    } catch (error) {
      console.error(`Error creating directory ${fullPath}:`, error);
    }
  }
});

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

// Desktop automation handlers
ipcMain.on('open-browser', (event, { browserName, url }) => {
  console.log(`Opening browser: ${browserName} with URL: ${url || 'default'}`);
  
  let openCommand;
  const searchUrl = url ? `https://www.google.com/search?q=${encodeURIComponent(url)}` : '';
  
  try {
    // Platform-specific browser opening
    switch (process.platform) {
      case 'win32':
        if (browserName === 'chrome') {
          openCommand = `start chrome ${searchUrl}`;
        } else if (browserName === 'firefox') {
          openCommand = `start firefox ${searchUrl}`;
        } else if (browserName === 'edge') {
          openCommand = `start msedge ${searchUrl}`;
        } else {
          // Default to system default browser
          shell.openExternal(searchUrl || 'https://www.google.com');
          event.reply('automation-response', { success: true, action: 'open-browser' });
          return;
        }
        break;
        
      case 'darwin': // macOS
        if (browserName === 'chrome') {
          openCommand = `open -a "Google Chrome" ${searchUrl || ''}`;
        } else if (browserName === 'firefox') {
          openCommand = `open -a "Firefox" ${searchUrl || ''}`;
        } else if (browserName === 'safari') {
          openCommand = `open -a "Safari" ${searchUrl || ''}`;
        } else {
          // Default to system default browser
          shell.openExternal(searchUrl || 'https://www.google.com');
          event.reply('automation-response', { success: true, action: 'open-browser' });
          return;
        }
        break;
        
      case 'linux':
        if (browserName === 'chrome') {
          openCommand = `google-chrome ${searchUrl}`;
        } else if (browserName === 'firefox') {
          openCommand = `firefox ${searchUrl}`;
        } else {
          // Default to system default browser
          shell.openExternal(searchUrl || 'https://www.google.com');
          event.reply('automation-response', { success: true, action: 'open-browser' });
          return;
        }
        break;
        
      default:
        // Use shell.openExternal as fallback
        shell.openExternal(searchUrl || 'https://www.google.com');
        event.reply('automation-response', { success: true, action: 'open-browser' });
        return;
    }
    
    if (openCommand) {
      exec(openCommand, (error) => {
        if (error) {
          console.error('Error opening browser:', error);
          event.reply('automation-response', { 
            success: false, 
            action: 'open-browser',
            error: error.message
          });
        } else {
          event.reply('automation-response', { success: true, action: 'open-browser' });
        }
      });
    }
  } catch (error) {
    console.error('Error in open-browser handler:', error);
    event.reply('automation-response', { 
      success: false, 
      action: 'open-browser',
      error: error.message
    });
  }
});

ipcMain.on('web-search', (event, { query }) => {
  console.log(`Performing web search for: ${query}`);
  
  try {
    // Encode the query for use in a URL
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    
    // Open the search URL in the default browser
    shell.openExternal(searchUrl);
    
    event.reply('automation-response', { success: true, action: 'web-search' });
  } catch (error) {
    console.error('Error in web-search handler:', error);
    event.reply('automation-response', { 
      success: false, 
      action: 'web-search',
      error: error.message
    });
  }
});

ipcMain.on('open-application', (event, { appName }) => {
  console.log(`Opening application: ${appName}`);
  
  let openCommand;
  
  try {
    // Platform-specific application opening
    switch (process.platform) {
      case 'win32':
        openCommand = `start ${appName}`;
        break;
        
      case 'darwin': // macOS
        openCommand = `open -a "${appName}"`;
        break;
        
      case 'linux':
        openCommand = `${appName}`;
        break;
        
      default:
        event.reply('automation-response', { 
          success: false, 
          action: 'open-application',
          error: 'Unsupported platform'
        });
        return;
    }
    
    exec(openCommand, (error) => {
      if (error) {
        console.error('Error opening application:', error);
        event.reply('automation-response', { 
          success: false, 
          action: 'open-application',
          error: error.message
        });
      } else {
        event.reply('automation-response', { success: true, action: 'open-application' });
      }
    });
  } catch (error) {
    console.error('Error in open-application handler:', error);
    event.reply('automation-response', { 
      success: false, 
      action: 'open-application',
      error: error.message
    });
  }
});

ipcMain.on('take-screenshot', (event) => {
  console.log('Taking screenshot');
  
  try {
    // Get the primary display
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    
    // Capture screenshot
    mainWindow.webContents.capturePage({
      x: 0,
      y: 0,
      width,
      height
    }).then(image => {
      // Save the screenshot to the user's pictures directory
      const screenshotsDir = path.join(app.getPath('pictures'), 'KARNA-Screenshots');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      const filePath = path.join(screenshotsDir, `screenshot-${timestamp}.png`);
      
      // Write the image to disk
      fs.writeFile(filePath, image.toPNG(), (err) => {
        if (err) {
          console.error('Error saving screenshot:', err);
          event.reply('automation-response', { 
            success: false, 
            action: 'take-screenshot',
            error: err.message
          });
        } else {
          console.log('Screenshot saved to:', filePath);
          event.reply('automation-response', { 
            success: true, 
            action: 'take-screenshot',
            path: filePath
          });
          
          // Open the folder containing the screenshot
          shell.showItemInFolder(filePath);
        }
      });
    }).catch(err => {
      console.error('Error capturing screenshot:', err);
      event.reply('automation-response', { 
        success: false, 
        action: 'take-screenshot',
        error: err.message
      });
    });
  } catch (error) {
    console.error('Error in take-screenshot handler:', error);
    event.reply('automation-response', { 
      success: false, 
      action: 'take-screenshot',
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
