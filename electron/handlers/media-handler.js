const { ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mediaInterval = null;
let lastMediaInfo = null;

function setupMediaHandlers(mainWindow) {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'media-control.ps1');

    function runMediaScript(command = 'status') {
        return new Promise((resolve, reject) => {
            const ps = spawn('powershell.exe', [
                '-NoProfile',
                '-ExecutionPolicy', 'Bypass',
                '-File', scriptPath,
                command
            ]);

            let dataString = '';

            ps.stdout.on('data', (data) => {
                dataString += data.toString();
            });

            ps.stderr.on('data', (data) => {
                console.error(`PS Error: ${data}`);
            });

            ps.on('close', (code) => {
                if (code !== 0) {
                    resolve(null);
                    return;
                }
                try {
                    // Sometimes PS output has extra whitespace or newlines
                    const json = JSON.parse(dataString.trim());
                    resolve(json);
                } catch (e) {
                    // If JSON parse fails (e.g. empty output), return null
                    resolve(null);
                }
            });
        });
    }

    // Poll for status updates
    function startPolling() {
        if (mediaInterval) clearInterval(mediaInterval);

        // Poll every 2 seconds
        mediaInterval = setInterval(async () => {
            if (!mainWindow || mainWindow.isDestroyed()) {
                stopPolling();
                return;
            }

            const info = await runMediaScript('status');

            // Only send update if changed (basic check)
            // JSON stringify is a cheap way to compare simple objects
            // But thumbnail is huge, so maybe ignore thumbnail for comparison if it's identical?
            // Actually, sending base64 every 2s is heavy.
            // Let's optimize: if title/artist/status matches, we assume thumbnail matches (usually true).

            const hasChanged = !lastMediaInfo ||
                (info && (
                    info.title !== lastMediaInfo.title ||
                    info.artist !== lastMediaInfo.artist ||
                    info.status !== lastMediaInfo.status
                ));

            if (hasChanged) {
                lastMediaInfo = info;
                mainWindow.webContents.send('media-update', info);
            }
        }, 2000);
    }

    function stopPolling() {
        if (mediaInterval) clearInterval(mediaInterval);
        mediaInterval = null;
    }

    // IPC Handlers
    ipcMain.handle('media-control', async (event, command) => {
        // command: playpause, next, prev
        await runMediaScript(command);
        // Ask for immediate status update after command
        setTimeout(async () => {
            const info = await runMediaScript('status');
            lastMediaInfo = info;
            mainWindow.webContents.send('media-update', info);
        }, 300); // Wait a bit for system to react
    });

    // Start polling when app is ready (or maybe when frontend asks?)
    // For now auto-start
    startPolling();
}

module.exports = { setupMediaHandlers };
