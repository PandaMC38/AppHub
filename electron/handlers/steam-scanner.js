const { ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { exec } = require('child_process');

function setupSteamHandlers() {
    ipcMain.handle('get-steam-games', async () => {
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
}

module.exports = { setupSteamHandlers };
