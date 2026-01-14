const { ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');

function setupSearchHandlers() {
    ipcMain.handle('search-files', async (event, query) => {
        if (!query || query.length < 3) return [];

        return new Promise((resolve) => {
            // PowerShell command to search Desktop and Documents
            // -Recurse -File -Top 15 to limit results and speed
            const psScript = `
                $d = [Environment]::GetFolderPath("Desktop")
                $doc = [Environment]::GetFolderPath("MyDocuments")
                Get-ChildItem -Path $d, $doc -Recurse -File -ErrorAction SilentlyContinue | 
                Where-Object { $_.Name -match "${query.replace(/"/g, '')}" } | 
                Select-Object -First 10 Name, FullName, Extension | 
                ConvertTo-Json
            `;

            exec(`powershell -command "${psScript.replace(/\n/g, ' ')}"`, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
                if (error) {
                    // console.error("Search error:", error); // Ignore scan errors
                    resolve([]);
                    return;
                }
                try {
                    const output = stdout.trim();
                    if (!output) { resolve([]); return; }
                    let data = JSON.parse(output);
                    if (!Array.isArray(data)) data = [data];

                    resolve(data.map(f => ({
                        name: f.Name,
                        path: f.FullName,
                        type: 'file',
                        ext: f.Extension
                    })));
                } catch (e) {
                    resolve([]);
                }
            });
        });
    });
}

module.exports = { setupSearchHandlers };
