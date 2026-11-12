const { contextBridge, ipcRenderer } = require('electron');

let cachedHardwareMac = null;
try {
  cachedHardwareMac = ipcRenderer.sendSync('get-mac-sync');
} catch (e) {
  console.warn('[Preload] Não foi possível obter MAC físico de forma síncrona:', e);
}

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  hardwareMac: cachedHardwareMac,
  getHardwareMac: () => ipcRenderer.invoke('get-mac'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  toggleFullScreen: () => ipcRenderer.send('window-toggle-fullscreen'),
  isFullScreen: () => {
    try {
      return ipcRenderer.sendSync('window-is-fullscreen');
    } catch {
      return false;
    }
  },
  isMaximized: () => {
    try {
      return ipcRenderer.sendSync('window-is-maximized');
    } catch {
      return false;
    }
  },
  onFullScreenChange: (callback) => {
    const handler = (_event, isFull) => callback(isFull);
    ipcRenderer.on('fullscreen-changed', handler);
    return () => ipcRenderer.removeListener('fullscreen-changed', handler);
  },
  onMaximizeChange: (callback) => {
    const handler = (_event, isMax) => callback(isMax);
    ipcRenderer.on('maximize-changed', handler);
    return () => ipcRenderer.removeListener('maximize-changed', handler);
  }
});

