const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getApps: () => ipcRenderer.invoke('get-apps'),
    launchApp: (path) => ipcRenderer.invoke('launch-app', path),
    getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
    getDiskSpace: () => ipcRenderer.invoke('get-disk-space'),
    getSteamGames: () => ipcRenderer.invoke('get-steam-games'),
    selectWallpaper: () => ipcRenderer.invoke('select-wallpaper')
});
