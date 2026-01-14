const { ipcMain } = require('electron');
const os = require('os');
const { exec } = require('child_process');

function setupSystemHandlers() {
    // --- System Stats ---
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

    // --- Disk Space ---
    ipcMain.handle('get-disk-space', async () => {
        return new Promise((resolve) => {
            if (process.platform === 'win32') {
                const cmd = 'powershell -command "Get-CimInstance -ClassName Win32_LogicalDisk | Where-Object {$_.DriveType -eq 3} | Select-Object DeviceID, FreeSpace, Size | ConvertTo-Json"';
                exec(cmd, (error, stdout) => {
                    if (error || !stdout) {
                        resolve([]);
                        return;
                    }
                    try {
                        const prevOutput = stdout.trim();
                        if (!prevOutput) { resolve([]); return; }
                        let data = JSON.parse(prevOutput);
                        if (!Array.isArray(data)) data = [data];
                        const disks = data.map(d => ({
                            drive: d.DeviceID,
                            free: (d.FreeSpace / 1024 / 1024 / 1024).toFixed(1),
                            size: (d.Size / 1024 / 1024 / 1024).toFixed(1),
                            percent: Math.round(((d.Size - d.FreeSpace) / d.Size) * 100)
                        }));
                        resolve(disks);
                    } catch (e) { resolve([]); }
                });
            } else { resolve([]); }
        });
    });

    // --- System Commands ---
    ipcMain.handle('execute-system-command', async (event, command) => {
        let cmd = '';
        switch (command) {
            case 'shutdown':
                cmd = 'shutdown /s /t 0';
                break;
            case 'restart':
                cmd = 'shutdown /r /t 0';
                break;
            case 'lock':
                cmd = 'rundll32.exe user32.dll,LockWorkStation';
                break;
            case 'sleep':
                cmd = 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0';
                break;
            case 'empty-bin':
                cmd = 'powershell -command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"';
                break;
            default:
                return false;
        }

        exec(cmd, (error) => {
            if (error) console.error(`Failed to execute ${command}:`, error);
        });
        return true;
    });
}

module.exports = { setupSystemHandlers };
