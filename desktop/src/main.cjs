const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Ativação de Aceleração por Hardware e decodificadores de vídeo para IPTV
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Garante apenas uma instância do aplicativo em execução
const gotTheLock = app.requestSingleInstanceLock();
let mainWindow = null;

if (!gotTheLock) {
  app.quit();
}

/**
 * Detecta o endereço MAC físico da placa de rede principal (Ethernet ou Wi-Fi)
 * Ignora adaptadores virtuais (WSL, Docker, Hyper-V, VMware, VirtualBox)
 */
function getHardwareMac() {
  try {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    const virtualKeywords = [
      'virtual', 'veth', 'vethernet', 'wsl', 'docker', 'vmware', 
      'vbox', 'virtualbox', 'tap', 'tun', 'loopback', 'teredo', 'pseudo'
    ];

    for (const [name, ifaceList] of Object.entries(interfaces)) {
      if (!ifaceList) continue;
      const lowerName = name.toLowerCase();
      const isVirtual = virtualKeywords.some((kw) => lowerName.includes(kw));

      for (const iface of ifaceList) {
        if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
          candidates.push({
            mac: iface.mac.toUpperCase(),
            isVirtual,
            name
          });
        }
      }
    }

    if (candidates.length === 0) return null;

    // Prioriza placa física real (não-virtual)
    const physical = candidates.find((c) => !c.isVirtual);
    if (physical) {
      return physical.mac;
    }

    return candidates[0].mac;
  } catch (err) {
    console.error('[Electron] Erro ao identificar MAC físico:', err);
    return null;
  }
}

const hardwareMacAddress = getHardwareMac();

/**
 * Gerenciamento de Estado da Janela (Posição e Dimensão)
 */
function getWindowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
  try {
    const stateFile = getWindowStatePath();
    if (fs.existsSync(stateFile)) {
      const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      return data;
    }
  } catch (e) {
    // Falha silenciosa, usa valores padrão
  }
  return {
    width: 1400,
    height: 850,
    isMaximized: false
  };
}

function saveWindowState() {
  if (!mainWindow) return;
  try {
    const isMax = mainWindow.isMaximized();
    const bounds = mainWindow.getBounds();
    const state = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: isMax
    };
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(state));
  } catch (e) {
    // Falha silenciosa
  }
}

function createWindow() {
  const windowState = loadWindowState();

  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, '../build/icon.ico')
    : path.join(__dirname, '../build/icon.png');

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width || 1400,
    height: windowState.height || 850,
    minWidth: 960,
    minHeight: 540,
    frame: false, // Frameless com TitleBar customizada
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0d14',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Permite carregar fluxos IPTV HTTP e M3U8 sem restrição de CORS
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Notifica o frontend sobre mudanças de estado de janela
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('maximize-changed', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('maximize-changed', false);
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('fullscreen-changed', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('fullscreen-changed', false);
  });

  mainWindow.on('close', () => {
    saveWindowState();
  });

  // Atalhos de Teclado Globais da Janela
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      if (input.key === 'F11') {
        event.preventDefault();
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
      } else if (input.key === 'Escape' && mainWindow.isFullScreen()) {
        event.preventDefault();
        mainWindow.setFullScreen(false);
      }
    }
  });

  // Carrega o frontend compilado
  const uiPath = path.join(__dirname, '../ui/index.html');
  const fallbackPath = path.join(__dirname, '../../smart-tv/dist/index.html');

  if (fs.existsSync(uiPath)) {
    mainWindow.loadFile(uiPath);
  } else if (fs.existsSync(fallbackPath)) {
    mainWindow.loadFile(fallbackPath);
  } else {
    mainWindow.loadURL('http://localhost:3001');
  }

  // Remove menu superior padrão do Electron (Alt bar)
  mainWindow.setMenuBarVisibility(false);
}

// IPC Handlers síncronos e assíncronos
ipcMain.on('get-mac-sync', (event) => {
  event.returnValue = hardwareMacAddress;
});

ipcMain.handle('get-mac', async () => {
  return hardwareMacAddress;
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('window-toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

ipcMain.on('window-is-fullscreen', (event) => {
  event.returnValue = mainWindow ? mainWindow.isFullScreen() : false;
});

ipcMain.on('window-is-maximized', (event) => {
  event.returnValue = mainWindow ? mainWindow.isMaximized() : false;
});

// Ciclo de Vida do Aplicativo
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
