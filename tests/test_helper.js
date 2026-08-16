const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');

let serverProcess = null;
let serverPort = null;
let activeBrowser = null;

// Dynamic port finder utility
function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => {
        resolve(port);
      });
    });
  });
}

// Cross-platform Chrome path utility
function getChromePath() {
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH;
  }
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  
  const platform = process.platform;
  let paths = [];
  
  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
    paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe')
    ];
  } else if (platform === 'darwin') {
    paths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    ];
  } else {
    // Linux/other
    paths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser'
    ];
  }
  
  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  
  return paths[0]; // fallback
}

function registerBrowser(browserInstance) {
  activeBrowser = browserInstance;
}

function startServer(port) {
  return new Promise(async (resolve, reject) => {
    try {
      // Find a free port dynamically if not provided or if placeholder port 3001/3002 is given
      const selectedPort = (port && port !== 3001 && port !== 3002 && port !== 0) ? port : await getFreePort();
      serverPort = selectedPort;
      
      const serverPath = path.join(__dirname, '../server.js');
      console.log(`Starting server process: node ${serverPath} on port ${selectedPort}`);
      
      serverProcess = spawn('node', [serverPath], {
        env: { ...process.env, PORT: selectedPort.toString() }
      });

      let resolved = false;

      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[Server] ${output.trim()}`);
        if (output.includes(`Server is running on port ${selectedPort}`)) {
          if (!resolved) {
            resolved = true;
            serverProcess.port = selectedPort;
            resolve(serverProcess);
          }
        }
      });

      serverProcess.stderr.on('data', (data) => {
        console.error(`[Server Error] ${data.toString()}`);
      });

      serverProcess.on('error', (err) => {
        console.error('Failed to start server process:', err);
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });

      serverProcess.on('exit', (code) => {
        console.log(`Server process exited with code ${code}`);
        if (!resolved) {
          resolved = true;
          reject(new Error(`Server exited early with code ${code}`));
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (serverProcess) {
      console.log('Stopping server process...');
      
      // Teardown Robustness: check if already exited
      if (serverProcess.exitCode !== null || serverProcess.killed) {
        console.log('Server process has already exited.');
        serverProcess = null;
        resolve();
        return;
      }
      
      serverProcess.on('exit', () => {
        serverProcess = null;
        resolve();
      });
      
      serverProcess.kill('SIGTERM');
      
      // Fallback: if it doesn't exit in 2 seconds, kill it forcefully
      setTimeout(() => {
        if (serverProcess) {
          try {
            serverProcess.kill('SIGKILL');
          } catch (e) {}
          serverProcess = null;
          resolve();
        }
      }, 2000);
    } else {
      resolve();
    }
  });
}

// Forceful orphaned process cleanup function
function forceCleanup() {
  if (serverProcess && serverProcess.exitCode === null && !serverProcess.killed) {
    try {
      serverProcess.kill('SIGKILL');
    } catch (e) {}
  }
  if (activeBrowser) {
    try {
      const proc = typeof activeBrowser.process === 'function' ? activeBrowser.process() : null;
      if (proc && proc.exitCode === null && !proc.killed) {
        proc.kill('SIGKILL');
      }
    } catch (e) {}
  }
}

// Process-level listeners to clean up on parent exit
process.on('exit', forceCleanup);
process.on('SIGINT', () => {
  forceCleanup();
  process.exit(1);
});
process.on('SIGTERM', () => {
  forceCleanup();
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception in test process:', err);
  forceCleanup();
  process.exit(1);
});

module.exports = {
  startServer,
  stopServer,
  getChromePath,
  registerBrowser
};
