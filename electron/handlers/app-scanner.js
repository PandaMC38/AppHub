const { ipcMain, app, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

function setupAppHandlers() {
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

                    // Check Steam Games (Filter out shortcuts that launch games, but KEEP Steam Client)
                    // Common Steam shortcut: "C:\...\Steam.exe" -applaunch <id>
                    // Or URL shortcut: steam://rungameid/<id>
                    if (details.args && (details.args.includes('steam://') || details.args.includes('-applaunch'))) {
                        isSteam = true;
                    }
                    // Previously we filtered ALL steam.exe, which hid the main Steam app. Now we only filter games
                    // because we have a dedicated steam-scanner for games.

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
}

module.exports = { setupAppHandlers };
