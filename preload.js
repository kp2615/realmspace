// Exposes a small, safe API to the interface for loading and saving the campaign.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('realm', {
  load: () => ipcRenderer.invoke('campaign:load'),
  save: (data) => ipcRenderer.invoke('campaign:save', data),
  revealFile: () => ipcRenderer.invoke('campaign:reveal'),
});
