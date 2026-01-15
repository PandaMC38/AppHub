const { ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');

function setupWorkspaceHandlers() {

    // Execute workspace rules (Launch / Kill apps)
    ipcMain.handle('workspace:execute-rules', async (event, rules) => {
        if (!rules) return { success: false, error: 'No rules provided' };

        const results = {
            launched: [],
            killed: [],
            errors: []
        };

        // 1. Kill Apps
        if (rules.kill && Array.isArray(rules.kill)) {
            for (const appName of rules.kill) {
                try {
                    // Windows specific command to kill process by name
                    const cmd = `taskkill /IM "${appName}" /F`;
                    await new Promise((resolve, reject) => {
                        exec(cmd, (err) => {
                            // Ignore error if process not found (128)
                            if (err && !err.message.includes('not found')) reject(err);
                            else resolve();
                        });
                    });
                    results.killed.push(appName);
                } catch (e) {
                    console.error(`Failed to kill ${appName}:`, e);
                    results.errors.push(`Kill ${appName}: ${e.message}`);
                }
            }
        }

        // 2. Launch Apps
        if (rules.launch && Array.isArray(rules.launch)) {
            for (const appPath of rules.launch) {
                try {
                    // Use 'start' to launch independent of the node process
                    // Wrap path in quotes to handle spaces
                    const cmd = `start "" "${appPath}"`;
                    await new Promise((resolve, reject) => {
                        exec(cmd, (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    results.launched.push(appPath);
                } catch (e) {
                    console.error(`Failed to launch ${appPath}:`, e);
                    results.errors.push(`Launch ${appPath}: ${e.message}`);
                }
            }
        }

        return { success: true, results };
    });
}

module.exports = { setupWorkspaceHandlers };
