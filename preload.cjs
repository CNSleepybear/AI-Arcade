const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /** Close the entire application (quit the exe). */
  quitApp: () => ipcRenderer.send('quit-app'),
});
