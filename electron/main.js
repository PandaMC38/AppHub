const { app, BrowserWindow, ipcMain, shell, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises; // Ensure this is present
const os = require('os');

// Register a protocol to load user data files safely if needed, 
// though file:// usually works in Electron if contextIsolation is handled right.
// For now we will return file paths that simple img tags can use if we disable web security or use a custom protocol.
// Actually, standard file:// paths often get blocked by valid file:// restrictions in renderer.
// Simplest fix for local user images: "file://" protocol support in mainWindow.

let splash;

function createSplash() {
    splash = new BrowserWindow({
        width: 400,
        height: 300,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    // Load splash.html from one level up (root)
    splash.loadFile(path.join(__dirname, '../splash.html'));
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#1a1a1a',
        show: false, // Hidden until splash is done
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false
        },
        autoHideMenuBar: true,
        frame: false, // Switch to custom frame logic setup OR use overlay
        // Actually user wants "no white bar". simpler is overlay with color.
        // Let's use titleBarOverlay for standard buttons but dark background
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#1a1a1a', // Match background
            symbolColor: '#ffffff', // White buttons
            height: 30
        }
    });

    const devUrl = 'http://localhost:5173';
    win.loadURL(devUrl).catch((err) => {
        console.log('Vite dev server not found, loading local file...');
        const indexPath = path.join(__dirname, '../dist/index.html');
        if (fs.existsSync(indexPath)) {
            win.loadFile(indexPath);
        } else {
            win.loadFile(path.join(__dirname, '../index.html'));
        }
    });

    win.once('ready-to-show', () => {
        setTimeout(() => {
            if (splash) splash.close();
            win.show();
        }, 1500);
    });
}

app.whenReady().then(() => {
    createSplash();
    createWindow();
    checkAndCreateShortcut();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    // Forcefully terminate all potential lingering processes
    app.exit(0);
});

function checkAndCreateShortcut() {
    if (process.platform !== 'win32') return;

    const desktopPath = app.getPath('desktop');
    const shortcutPath = path.join(desktopPath, 'AppHub.lnk');
    const appDir = path.resolve(__dirname, '..'); // Root of project
    const target = path.join(appDir, 'AppHub_Silent.vbs');
    const icon = path.join(appDir, 'src', 'logo.png'); // Use PNG (Windows might prefer ICO but this is a start)

    if (!fs.existsSync(shortcutPath)) {
        // Create shortcut via PowerShell
        const { exec } = require('child_process');
        const psScript = `
            $WshShell = New-Object -comObject WScript.Shell;
            $Shortcut = $WshShell.CreateShortcut("${shortcutPath}");
            $Shortcut.TargetPath = "${target}";
            $Shortcut.WorkingDirectory = "${appDir}";
            $Shortcut.IconLocation = "${icon}";
            $Shortcut.Save();
        `;

        exec(`powershell -command "${psScript.replace(/\r?\n/g, ' ')}"`, (err) => {
            if (err) console.error("Failed to create shortcut:", err);
            else console.log("Shortcut created successfully.");
        });
    }
}

// --- Optimized Handlers ---

// 1. Wallpaper Handler (File Copy instead of Base64)
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
        // Using forward slashes for URL compatibility
        const fileUrl = `file:///${destPath.replace(/\\/g, '/')}`;

        return { path: fileUrl, type: type };

    } catch (e) {
        console.error("Error saving wallpaper:", e);
        throw e; // Propagate error to renderer
    }
});

// 2. Async App Scanning
ipcMain.handle('get-apps', async () => {
    const apps = [];
    const commonStartMenu = path.join(process.env.ProgramData, 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    const userStartMenu = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs');

    // Helper: Async recursive scan
    async function scanDirectory(dir) {
        try {
            const entries = await fsPromises.readdir(dir, { withFileTypes: true });

            const promises = entries.map(async (entry) => {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await scanDirectory(fullPath);
                } else if (entry.isFile() && entry.name.endsWith('.lnk')) {
                    apps.push({
                        name: entry.name.replace('.lnk', ''),
                        path: fullPath
                    });
                }
            });

            await Promise.all(promises);
        } catch (err) {
            // Ignore access errors silently or log debug
            // console.debug('Skipping dir:', dir);
        }
    }

    console.log("Starting async app scan...");
    await Promise.all([
        scanDirectory(commonStartMenu),
        scanDirectory(userStartMenu)
    ]);
    console.log(`Found ${apps.length} apps. Processing icons...`);

    // Fetch icons (Parallelized with limit)
    // Processing all icons at once might be heavy. Let's do it in chunks or parallel map.
    // Map is fine for 100-200 apps usually.
    const appsWithIcons = await Promise.all(apps.map(async (appItem) => {
        try {
            let iconPath = appItem.path;
            try {
                // readShortcutLink is sync but fast enough for individual items? 
                // Better to wrap in try/catch.
                const shortcut = shell.readShortcutLink(appItem.path);
                if (shortcut.target) iconPath = shortcut.target;
            } catch (e) { }

            const icon = await app.getFileIcon(iconPath, { size: 'large' });
            return {
                ...appItem,
                icon: icon.toDataURL()
            };
        } catch (err) {
            return { ...appItem, icon: null };
        }
    }));

    console.log("Scan complete.");
    return appsWithIcons;
});

// 3. Launch App
ipcMain.handle('launch-app', async (event, appPath) => {
    try {
        if (appPath.startsWith('http://') || appPath.startsWith('https://')) {
            await shell.openExternal(appPath);
        } else {
            await shell.openPath(appPath);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 4. System Stats
ipcMain.handle('get-system-stats', async () => {
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const usedMem = totalMem - freeMem;
    const memUsage = Math.round((usedMem / totalMem) * 100);

    return {
        memUsage,
        freeMem: (freeMem / 1024 / 1024 / 1024).toFixed(1),
        totalMem: (totalMem / 1024 / 1024 / 1024).toFixed(1)
    };
});

// 5. Disk Space
ipcMain.handle('get-disk-space', async () => {
    return new Promise((resolve) => {
        if (process.platform === 'win32') {
            const { exec } = require('child_process');
            // Use PowerShell to get JSON data - cleaner and more reliable
            const cmd = 'powershell -command "Get-CimInstance -ClassName Win32_LogicalDisk | Where-Object {$_.DriveType -eq 3} | Select-Object DeviceID, FreeSpace, Size | ConvertTo-Json"';

            exec(cmd, (error, stdout) => {
                if (error || !stdout) {
                    console.error("Disk check error:", error);
                    resolve([]);
                    return;
                }
                try {
                    // PowerShell might return a single object or array
                    const prevOutput = stdout.trim();
                    if (!prevOutput) { resolve([]); return; }

                    let data = JSON.parse(prevOutput);
                    if (!Array.isArray(data)) data = [data];

                    const disks = data.map(d => {
                        const free = d.FreeSpace;
                        const size = d.Size;
                        return {
                            drive: d.DeviceID,
                            free: (free / 1024 / 1024 / 1024).toFixed(1),
                            size: (size / 1024 / 1024 / 1024).toFixed(1),
                            percent: Math.round(((size - free) / size) * 100)
                        };
                    });

                    resolve(disks);
                } catch (e) {
                    console.error("JSON parse error:", e);
                    resolve([]);
                }
            });
        } else {
            resolve([]);
        }
    });
});

