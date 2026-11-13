const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Permitir autoplay de audio sin requerir interacción del usuario en Electron
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
};

let serverInstance = null;

function startStaticServer(distDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURIComponent(req.url.split('?')[0]);
      if (reqPath === '/' || reqPath === '') {
        reqPath = '/index.html';
      }

      // Evitar path traversal fuera de distDir
      const resolvedPath = path.normalize(path.join(distDir, reqPath));
      if (!resolvedPath.startsWith(distDir)) {
        res.writeHead(403);
        return res.end('Acceso denegado');
      }

      fs.stat(resolvedPath, (err, stats) => {
        if (!err && stats.isFile()) {
          const ext = path.extname(resolvedPath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          fs.readFile(resolvedPath, (readErr, content) => {
            if (readErr) {
              res.writeHead(500);
              return res.end('Error al leer archivo');
            }
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
          });
        } else {
          // Fallback a index.html para Single Page Application
          const indexPath = path.join(distDir, 'index.html');
          fs.readFile(indexPath, (readErr, content) => {
            if (readErr) {
              res.writeHead(404);
              return res.end('No se encontró index.html');
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(content);
          });
        }
      });
    });

    server.listen(0, '127.0.0.1', () => {
      serverInstance = server;
      const address = server.address();
      resolve(address.port);
    });

    server.on('error', reject);
  });
}

async function createWindow() {
  const distDir = path.join(__dirname, 'dist');
  let port = 0;

  try {
    port = await startStaticServer(distDir);
  } catch (err) {
    console.error('Error al iniciar el servidor estático local:', err);
  }

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "La Cocina de mi A'ma - Punto de Venta",
    icon: path.join(__dirname, 'assets', 'iconoapp.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  // Atajos para desarrollador: F12 o Ctrl+Shift+I abren la consola
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  if (port) {
    win.loadURL(`http://127.0.0.1:${port}/`).catch((err) => {
      console.error('Error al cargar la URL local:', err);
    });
  } else {
    win.loadFile(path.join(distDir, 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverInstance) {
    serverInstance.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
