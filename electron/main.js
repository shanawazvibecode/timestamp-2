const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
let pythonProcess = null;
const BACKEND_PORT = 8000;
const FRONTEND_PORT = 5173;

// Find cross-platform Python executable
function getPythonExecutable() {
  const rootDir = path.resolve(__dirname, '..');
  const isWindows = process.platform === 'win32';
  
  // 1. Check project local virtual environment
  const venvPythonWin = path.join(rootDir, 'backend_venv', 'Scripts', 'python.exe');
  const venvPythonMac = path.join(rootDir, 'backend_venv', 'bin', 'python');

  if (isWindows && fs.existsSync(venvPythonWin)) {
    return venvPythonWin;
  }
  if (!isWindows && fs.existsSync(venvPythonMac)) {
    return venvPythonMac;
  }

  // 2. Check general venv naming
  const altVenvWin = path.join(rootDir, 'venv', 'Scripts', 'python.exe');
  const altVenvMac = path.join(rootDir, 'venv', 'bin', 'python');
  if (isWindows && fs.existsSync(altVenvWin)) return altVenvWin;
  if (!isWindows && fs.existsSync(altVenvMac)) return altVenvMac;

  // 3. Fallback to system python
  return isWindows ? 'python' : 'python3';
}

// Start Python FastAPI backend server
function startPythonBackend() {
  const pythonBin = getPythonExecutable();
  const rootDir = path.resolve(__dirname, '..');
  
  console.log(`[Electron] Launching Python backend with: ${pythonBin}`);

  const args = [
    '-m', 'uvicorn',
    'backend.app:app',
    '--host', '127.0.0.1',
    '--port', `${BACKEND_PORT}`
  ];

  pythonProcess = spawn(pythonBin, args, {
    cwd: rootDir,
    detached: process.platform !== 'win32',
    stdio: 'pipe'
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python Server] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python Server] ${data.toString().trim()}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`[Python Server] Exited with code ${code}`);
  });
}

// Cleanly kill the Python backend process and any children
function killPythonBackend() {
  if (!pythonProcess || !pythonProcess.pid) return;

  console.log(`[Electron] Terminating Python process (PID: ${pythonProcess.pid})...`);
  
  if (process.platform === 'win32') {
    try {
      exec(`taskkill /pid ${pythonProcess.pid} /T /F`, (err) => {
        if (err) console.log(`[Electron] Process kill status: ${err.message}`);
      });
    } catch (e) {
      console.error('[Electron] Error executing taskkill', e);
    }
  } else {
    try {
      // Kill process group on Unix
      process.kill(-pythonProcess.pid, 'SIGTERM');
    } catch (e) {
      try {
        pythonProcess.kill('SIGTERM');
      } catch (err) {
        // ignore
      }
    }
  }
}

// Wait until backend health endpoint responds
function waitForBackend(callback, maxRetries = 30) {
  let retries = 0;
  const check = () => {
    http.get(`http://127.0.0.1:${BACKEND_PORT}/health`, (res) => {
      if (res.statusCode === 200) {
        console.log('[Electron] Python backend is ready.');
        callback();
      } else {
        retry();
      }
    }).on('error', () => {
      retry();
    });
  };

  const retry = () => {
    retries++;
    if (retries >= maxRetries) {
      console.warn('[Electron] Backend readiness timeout. Loading window anyway...');
      callback();
    } else {
      setTimeout(check, 400);
    }
  };

  check();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#090A0F',
    title: 'SyncForge Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Check if Vite dev server is running on :5173, else load dist/index.html
  const distIndex = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');

  http.get(`http://localhost:${FRONTEND_PORT}`, () => {
    mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}`);
  }).on('error', () => {
    if (fs.existsSync(distIndex)) {
      mainWindow.loadFile(distIndex);
    } else {
      mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}`);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  startPythonBackend();
  waitForBackend(() => {
    createWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  killPythonBackend();
});

app.on('window-all-closed', () => {
  killPythonBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
