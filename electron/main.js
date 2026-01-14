const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

// Import Handlers
const { setupAppHandlers } = require('./handlers/app-scanner');
const { setupSteamHandlers } = require('./handlers/steam-scanner');
const { setupSystemHandlers } = require('./handlers/system-info');
const { setupWallpaperHandlers } = require('./handlers/wallpaper-handler');
const { setupMediaHandlers } = require('./handlers/media-handler');

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

    // Calculate position manually to center? Or let OS handle it. 
    // center: true is default for new windows usually.
    splash.center();

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
            webSecurity: false // Keeping this for now as per plan, can be tightened later if we add CSP handler
        },
        autoHideMenuBar: true,
        frame: false,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#1a1a1a',
            symbolColor: '#ffffff',
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

function checkAndCreateShortcut() {
    if (process.platform !== 'win32') return;

    const desktopPath = app.getPath('desktop');
    const shortcutPath = path.join(desktopPath, 'AppHub.lnk');
    const appDir = path.resolve(__dirname, '..'); // Root of project
    const target = path.join(appDir, 'AppHub_Silent.vbs');
    const icon = path.join(appDir, 'src', 'logo.png');

    if (!fs.existsSync(shortcutPath)) {
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

app.whenReady().then(() => {
    createSplash();

    // Initialize Handlers
    setupAppHandlers();
    setupSteamHandlers();
    setupSystemHandlers();
    setupWallpaperHandlers();

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
    app.exit(0);
});
