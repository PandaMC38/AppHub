const { ipcMain, dialog, app } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

function setupWallpaperHandlers() {
    ipcMain.handle('select-wallpaper', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Media', extensions: ['jpg', 'png', 'gif', 'webp', 'jpeg', 'bmp', 'mp4', 'webm'] }]
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        const sourcePath = result.filePaths[0];
        const ext = path.extname(sourcePath).toLowerCase();

        try {
            // Create a persistent path in userData
            const userDataPath = app.getPath('userData');
            const backgroundsDir = path.join(userDataPath, 'backgrounds');

            // Ensure dir exists
            if (!fs.existsSync(backgroundsDir)) {
                await fsPromises.mkdir(backgroundsDir, { recursive: true });
            }

            // Generate unique name to avoid cache issues ? Or static name to save space?
            // Let's use static "current_wallpaper" + ext to avoid pileup
            const destName = `wallpaper${ext}`;
            const destPath = path.join(backgroundsDir, destName);

            await fsPromises.copyFile(sourcePath, destPath);

            // Determine type
            let type = 'image';
            if (['.mp4', '.webm'].includes(ext)) type = 'video';

            // Return a file:// URL
            const { pathToFileURL } = require('url');
            const fileUrl = pathToFileURL(destPath).href;

            return { path: fileUrl, type: type };

        } catch (e) {
            console.error("Error saving wallpaper:", e);
            throw e; // Propagate error to renderer
        }
    });
}

module.exports = { setupWallpaperHandlers };
