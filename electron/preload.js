const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getApps: () => ipcRenderer.invoke('get-apps'),
    launchApp: (path) => ipcRenderer.invoke('launch-app', path),
    getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
    getDiskSpace: () => ipcRenderer.invoke('get-disk-space'),
    getSteamGames: () => ipcRenderer.invoke('get-steam-games'),
    selectWallpaper: () => ipcRenderer.invoke('select-wallpaper'),
    controlMedia: (cmd) => ipcRenderer.invoke('media-control', cmd),
    onMediaUpdate: (callback) => ipcRenderer.on('media-update', (event, value) => callback(value)),
    executeSystemCommand: (cmd) => ipcRenderer.invoke('execute-system-command', cmd),
    searchFiles: (query) => ipcRenderer.invoke('search-files', query),
    getCalendarEvents: (url) => ipcRenderer.invoke('get-calendar-events', url)
});
