const { app, BrowserWindow, ipcMain, shell, dialog, protocol, nativeImage } = require('electron');
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
    // --- Helper Functions ---

    // 1. Expand Environment Variables
    const expandEnvVars = (p) => {
        if (!p) return p;
        return p.replace(/%([^%]+)%/g, (match, n) => {
            const envKey = Object.keys(process.env).find(k => k.toLowerCase() === n.toLowerCase());
            return envKey ? process.env[envKey] : match;
        });
    };

    // 2. Resolve Shortcut Chain (Recursion)
    // Returns { target, icon, args } of the final link or the most relevant one
    const resolveShortcutChain = (startPath, depth = 0) => {
        if (depth > 5) return { target: startPath, icon: null, args: null }; // Recursion limit

        try {
            const sc = shell.readShortcutLink(startPath);
            const target = expandEnvVars(sc.target);

            // If target is another .lnk, recurse
            if (target && target.toLowerCase().endsWith('.lnk') && fs.existsSync(target)) {
                return resolveShortcutChain(target, depth + 1);
            }

            return {
                target: target || startPath,
                icon: expandEnvVars(sc.icon),
                args: sc.args
            };
        } catch (e) {
            return { target: startPath, icon: null, args: null };
        }
    };

    // 3. Find Squirrel App Binary (Discord, Slack, etc.)
    // Look for app-x.x.x/App.exe in the parent folder of Update.exe
    const findSquirrelBinary = async (updateExePath, args) => {
        if (!updateExePath || !args) return null;
        if (!updateExePath.toLowerCase().endsWith('update.exe')) return null;

        // Extract app name from args: --processStart "Discord.exe"
        const match = args.match(/--processStart\s+["']?([^"'\s]+)["']?/);
        if (!match) return null;

        const appExeName = match[1]; // e.g., Discord.exe
        const rootDir = path.dirname(updateExePath); // e.g., %LocalAppData%/Discord

        try {
            // Find folders starting with app-
            const entries = await fsPromises.readdir(rootDir, { withFileTypes: true });
            const appDirs = entries
                .filter(e => e.isDirectory() && e.name.startsWith('app-'))
                .sort((a, b) => b.name.localeCompare(a.name)); // Newest version first

            for (const dir of appDirs) {
                const candidate = path.join(rootDir, dir.name, appExeName);
                if (fs.existsSync(candidate)) return candidate;
            }
        } catch (e) { }
        return null;
    };

    // 4. Smart Icon Loader
    async function loadIcon(pathStr) {
        if (!pathStr) return null;
        try {
            const ext = path.extname(pathStr).toLowerCase();
            // Handle images directly
            if (['.png', '.jpg', '.ico'].includes(ext)) {
                const img = nativeImage.createFromPath(pathStr);
                if (!img.isEmpty()) return img;
            }
            // Handle executables/system icons
            return await app.getFileIcon(pathStr, { size: 'large' });
        } catch (e) { return null; }
    }


    // --- Processing ---
    const BATCH_SIZE = 10;
    const appsWithIcons = [];
    for (let i = 0; i < apps.length; i += BATCH_SIZE) {
        const batch = apps.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(async (appItem) => {
            let iconObj = null;
            let finalIconPath = null;
            let isSteam = false;

            try {
                // Step 1: Resolve the shortcut chain
                const details = resolveShortcutChain(appItem.path);

                // Check Steam
                if (details.target.toLowerCase().includes('steam.exe') || (details.args && details.args.includes('steam://'))) {
                    isSteam = true;
                }

                if (isSteam) return null;

                // Step 2: Check for Squirrel (Update.exe)
                let squirrelBin = await findSquirrelBinary(details.target, details.args);

                // --- Icon Strategy Priority ---

                // Priority 1: Custom Icon from the Shortcut (Top Level)
                // We re-read the top-level shortcut specifically for the custom icon field
                try {
                    const topSc = shell.readShortcutLink(appItem.path);
                    if (topSc.icon) {
                        const p = expandEnvVars(topSc.icon);
                        if (fs.existsSync(p)) finalIconPath = p;
                    }
                } catch (e) { }

                // Priority 2: Squirrel Binary (Real Discord.exe)
                if (!finalIconPath && squirrelBin) {
                    finalIconPath = squirrelBin;
                }

                // Priority 3: Target Executable (Standard Apps)
                if (!finalIconPath && details.target && fs.existsSync(details.target)) {
                    // Check "Smart Fuzzy Match" in folder ONLY if normal retrieval fails?
                    // No, let's trust the target first.
                    finalIconPath = details.target;
                }

                // Apply Icon Selection
                if (finalIconPath) {
                    iconObj = await loadIcon(finalIconPath);
                }

                // Priority 4: Smart Folder Scan (Fallback for generic icons)
                // Only if the result seems generic or missing.
                // But this broke Valorant. Let's make it very conservative.
                // Only do this if we STILL don't have a good icon (or it's Update.exe).
                if ((!iconObj && details.target) || (details.target.toLowerCase().endsWith('update.exe') && !squirrelBin)) {
                    try {
                        const targetDir = path.dirname(details.target);
                        const files = await fsPromises.readdir(targetDir);
                        const exeName = path.basename(details.target, path.extname(details.target)).toLowerCase();

                        // Exact match only to be safe
                        const exactIco = files.find(f => f.toLowerCase() === `${exeName}.ico`);
                        if (exactIco) {
                            iconObj = await loadIcon(path.join(targetDir, exactIco));
                        }
                    } catch (e) { }
                }

            } catch (e) { }

            // Final Fallback: The original .lnk file
            // If everything else failed, THIS is what makes Valorant work (Windows resolves it)
            if (!iconObj) {
                try {
                    iconObj = await app.getFileIcon(appItem.path, { size: 'large' });
                } catch (e) { }
            }

            return {
                ...appItem,
                icon: iconObj ? iconObj.toDataURL() : null
            };
        }));

        appsWithIcons.push(...batchResults.filter(a => a !== null));
    }

    console.log("Scan complete.");
    return appsWithIcons;
});

// 3. Launch App
// 3. Launch App
ipcMain.handle('launch-app', async (event, appPath) => {
    try {
        if (appPath.startsWith('http://') || appPath.startsWith('https://') || appPath.startsWith('steam://')) {
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

// 6. Steam Detection
ipcMain.handle('get-steam-games', async () => {
    const { exec } = require('child_process');

    // Helper to find Steam Path via Registry
    const getSteamPath = () => new Promise((resolve) => {
        if (process.platform !== 'win32') {
            // Mac/Linux paths could be added here if needed
            resolve(null);
            return;
        }

        const cmd = 'reg query "HKCU\\Software\\Valve\\Steam" /v SteamPath';
        exec(cmd, (err, stdout) => {
            if (err || !stdout) {
                // Try HKLM as fallback
                exec('reg query "HKLM\\Software\\Valve\\Steam" /v SteamPath', (err2, stdout2) => {
                    if (!err2 && stdout2) {
                        const match = stdout2.match(/SteamPath\s+REG_SZ\s+(.+)/);
                        if (match && match[1]) resolve(match[1].trim());
                        else resolve(null);
                    } else {
                        // Finally check default paths
                        const defaults = [
                            'C:\\Program Files (x86)\\Steam',
                            'C:\\Program Files\\Steam'
                        ];
                        const found = defaults.find(p => fs.existsSync(p));
                        resolve(found || null);
                    }
                });
            } else {
                const match = stdout.match(/SteamPath\s+REG_SZ\s+(.+)/);
                if (match && match[1]) resolve(match[1].trim());
                else resolve(null);
            }
        });
    });

    try {
        let steamPath = await getSteamPath();
        if (!steamPath) return [];

        // Normalize slashes
        steamPath = path.normalize(steamPath);

        // 1. Find all library folders
        const libraryFolders = [steamPath];
        const vdfPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');

        if (fs.existsSync(vdfPath)) {
            const content = await fsPromises.readFile(vdfPath, 'utf8');
            // Regex to find paths in VDF (simplified)
            // Look for "path" "..."
            const pathRegex = /"path"\s+"(.+?)"/g;
            let match;
            while ((match = pathRegex.exec(content)) !== null) {
                // Determine if this path needs unescaping (vdf uses double backslashes)
                let libPath = match[1].replace(/\\\\/g, '\\');
                if (!libraryFolders.includes(libPath)) {
                    libraryFolders.push(libPath);
                }
            }
        }

        // 2. Scan each library for appmanifest_*.acf
        const games = [];

        for (const lib of libraryFolders) {
            const steamApps = path.join(lib, 'steamapps');
            if (fs.existsSync(steamApps)) {
                const files = await fsPromises.readdir(steamApps);
                const acfFiles = files.filter(f => f.startsWith('appmanifest_') && f.endsWith('.acf'));

                for (const acf of acfFiles) {
                    try {
                        const acfContent = await fsPromises.readFile(path.join(steamApps, acf), 'utf8');
                        const idMatch = acfContent.match(/"appid"\s+"(\d+)"/);
                        const nameMatch = acfContent.match(/"name"\s+"(.+?)"/);
                        const installDirMatch = acfContent.match(/"installdir"\s+"(.+?)"/);

                        if (idMatch && nameMatch) {
                            const appid = idMatch[1];
                            const name = nameMatch[1];
                            const installDir = installDirMatch ? installDirMatch[1] : null;

                            let icon = null;

                            // Strategy 1: Steam Library Cache
                            const cachePath = path.join(steamPath, 'appcache', 'librarycache', `${appid}_icon.jpg`);
                            if (fs.existsSync(cachePath)) {
                                icon = `file://${cachePath.replace(/\\/g, '/')}`;
                            }
                            // Strategy 2: Find Executable in Install Dir
                            else if (installDir) {
                                try {
                                    const gameDir = path.join(lib, 'steamapps', 'common', installDir);
                                    if (fs.existsSync(gameDir)) {
                                        // Find largest EXE or one matching the game name?
                                        // Simple heuristic: Find first .exe that isn't verify/uninstall/unity/launcher if possible,
                                        // or just the largest one.
                                        const gameFiles = await fsPromises.readdir(gameDir);
                                        const exes = gameFiles.filter(f => f.toLowerCase().endsWith('.exe'));

                                        if (exes.length > 0) {
                                            // Sort by distinctiveness or size? 
                                            // Let's assume the game exe often resembles the game name or is the largest.
                                            // For now, pick the one that matches installDir name or just the first valid one.
                                            let bestExe = exes.find(e => e.toLowerCase().includes(installDir.toLowerCase()));
                                            if (!bestExe) bestExe = exes[0]; // Fallback

                                            const exePath = path.join(gameDir, bestExe);
                                            const iconObj = await app.getFileIcon(exePath, { size: 'large' });
                                            if (iconObj) icon = iconObj.toDataURL();
                                        }
                                    }
                                } catch (err2) {
                                    // Ignore exe scan error
                                }
                            }

                            games.push({
                                name: name,
                                path: `steam://run/${appid}`,
                                type: 'steam',
                                icon: icon
                            });
                        }
                    } catch (e) {
                        // Skip malformed
                    }
                }
            }
        }

        return games;

    } catch (e) {
        console.error("Steam Scan Error:", e);
        return [];
    }
});
