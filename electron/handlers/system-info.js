const { ipcMain } = require('electron');
const os = require('os');
const { exec } = require('child_process');

function setupSystemHandlers() {
    // System Stats
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

    // Disk Space
    ipcMain.handle('get-disk-space', async () => {
        return new Promise((resolve) => {
            if (process.platform === 'win32') {
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
}

module.exports = { setupSystemHandlers };
