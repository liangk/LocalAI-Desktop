import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { spawnSync } from 'child_process';
import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
const __dirname = process.cwd();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // disabled for local dev to allow file:// asset loading
      preload: path.join(__dirname, 'preload.cjs') // Optional: for IPC
    }
  });

  // Load Angular build output
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function detectOllama(): { found: boolean; path?: string; version?: string; error?: string } {
  const exe = process.platform === 'win32' ? 'ollama.exe' : 'ollama';
  try {
    // Try running `ollama --version` directly (safe, no shell)
    const r = spawnSync(exe, ['--version'], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout) {
      return { found: true, path: exe, version: r.stdout.trim() };
    }
    // If exec failed, try platform-specific lookup
    if (process.platform === 'win32') {
      const where = spawnSync('where', [exe], { encoding: 'utf8' });
      if (where.status === 0 && where.stdout) {
        return { found: true, path: where.stdout.split(/\r?\n/)[0].trim() };
      }
    } else {
      const which = spawnSync('which', [exe], { encoding: 'utf8' });
      if (which.status === 0 && which.stdout) {
        return { found: true, path: which.stdout.trim() };
      }
    }
    return { found: false, error: 'not found on PATH' };
  } catch (err: any) {
    return { found: false, error: String(err) };
  }
}

// Expose via IPC
ipcMain.handle('ollama-detect', () => {
  return detectOllama();
});

// Allow renderer to trigger in-app download
ipcMain.handle('ollama-start-download', async () => {
  const downloadUrl = process.platform === 'win32'
    ? 'https://ollama.com/download/OllamaSetup.exe'
    : 'https://ollama.com/download';
  const result = await downloadToFile(downloadUrl);
  return result;
});

// Helper to prompt user (call from main when appropriate)
async function promptInstallOllama(parentWindow?: BrowserWindow) {
  // Call showMessageBox with options only to avoid parent window timing/type issues
  const res = await dialog.showMessageBox({
    type: 'info',
    title: 'Ollama not found',
    message: 'Ollama was not detected on your system. Would you like to download the installer or open the download page?',
    buttons: ['Download installer', 'Open download page', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
  });

  // Platform-appropriate URL
  const downloadUrl = process.platform === 'win32'
    ? 'https://ollama.com/download/OllamaSetup.exe'
    : 'https://ollama.com/download';

  if (res.response === 1) {
    await shell.openExternal(downloadUrl);
    return;
  }

  if (res.response === 0) {
    try {
      // start in-app download and stream progress events to the renderer
      const result = await downloadToFile(downloadUrl);
      // notify renderer that download completed
      if (mainWindow?.webContents) {
        mainWindow.webContents.send('ollama-download-complete', { path: result });
      }
      // offer to open folder
      const openRes = await dialog.showMessageBox({
        type: 'info',
        title: 'Download complete',
        message: `Downloaded to ${result}`,
        buttons: ['Open folder', 'OK'],
        defaultId: 0,
        cancelId: 1,
      });
      if (openRes.response === 0) {
        shell.showItemInFolder(result);
      }
    } catch (err: any) {
      console.error('Download failed', err);
      dialog.showErrorBox('Download failed', String(err));
    }
  }
}

// Download helper: streams URL to local file, sends progress events to renderer
function downloadToFile(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const maxRedirects = 5;
    let redirects = 0;

    const doRequest = (u: string) => {
      try {
        const parsed = new URL(u);
        const lib = parsed.protocol === 'https:' ? https : http;
        const filename = path.basename(parsed.pathname) || 'download.bin';
        const downloadsDir = path.join(__dirname, 'downloads');
        fs.mkdirSync(downloadsDir, { recursive: true });
        const dest = path.join(downloadsDir, filename);

        const req = lib.get(parsed, { headers: { 'User-Agent': 'LocalAI-Desktop/1.0' } }, (res: any) => {
          // Handle redirects (3xx)
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers && res.headers.location) {
            if (redirects >= maxRedirects) {
              reject(new Error('Too many redirects'));
              return;
            }
            redirects += 1;
            const loc = new URL(res.headers.location, parsed).toString();
            // consume and discard body before redirecting
            res.resume();
            doRequest(loc);
            return;
          }

          if (!res || (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300))) {
            reject(new Error(`Download failed with status ${res?.statusCode}`));
            return;
          }

          const total = Number(res.headers['content-length'] ?? 0);
          let received = 0;
          const file = fs.createWriteStream(dest);

          res.on('data', (chunk: Buffer) => {
            received += chunk.length;
            if (mainWindow?.webContents) {
              mainWindow.webContents.send('ollama-download-progress', { received, total });
            }
          });

          res.pipe(file);

          file.on('finish', () => {
            file.close(() => resolve(dest));
          });

          file.on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
          });
        });

        req.on('error', (err: any) => reject(err));
      } catch (err) {
        reject(err);
      }
    };

    doRequest(url);
  });
}

app.whenReady().then(async () => {
  createWindow();

  // run detection after window exists so dialog has a valid parent
  const check = detectOllama();
  if (!check.found) {
    // await to make sure dialog resolves before continuing (optional)
    await promptInstallOllama(mainWindow ?? undefined);
  }
});

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
