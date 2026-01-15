export class WorkspaceManager {
    constructor(widgetManager) {
        this.widgetManager = widgetManager;
        this.workspaces = [];
        this.activeWorkspaceId = 'default';

        this.load();
    }

    load() {
        const data = localStorage.getItem('apphub_workspaces');
        if (data) {
            const parsed = JSON.parse(data);
            this.workspaces = parsed.workspaces || [];
            this.activeWorkspaceId = parsed.activeId || 'default';
            this.checkMigration();
        } else {
            // First time or migration needed
            this.migrateFromWidgetManager();
        }
    }

    save() {
        // Before saving specific workspace, ensure current widgets are synced to it
        this.syncCurrentWorkspace();

        const data = {
            activeId: this.activeWorkspaceId,
            workspaces: this.workspaces
        };
        localStorage.setItem('apphub_workspaces', JSON.stringify(data));
    }

    migrateFromWidgetManager() {
        // Check if there are existing widgets in the old key
        const oldWidgets = localStorage.getItem('apphub_widgets');
        let widgets = [];

        if (oldWidgets) {
            try {
                widgets = JSON.parse(oldWidgets);
            } catch (e) { }
        }

        // Create default workspace with these widgets
        this.workspaces = [{
            id: 'default',
            name: 'Principal',
            icon: '🏠',
            widgets: widgets,
            rules: { launch: [], kill: [] }
        }];
        this.activeWorkspaceId = 'default';

        this.save();
    }

    getCurrentWorkspace() {
        return this.workspaces.find(w => w.id === this.activeWorkspaceId) || this.workspaces[0];
    }

    getWorkspaces() {
        return this.workspaces;
    }

    syncCurrentWorkspace() {
        // Get latest widget config from manager
        const currentWidgets = this.widgetManager.getWidgetsConfig(); // Method we need to add to WidgetManager if not exists

        const wsIndex = this.workspaces.findIndex(w => w.id === this.activeWorkspaceId);
        if (wsIndex !== -1) {
            this.workspaces[wsIndex].widgets = currentWidgets;
        }
    }

    async switchWorkspace(id) {
        if (id === this.activeWorkspaceId) return;

        // 1. Save current state
        this.save();

        // 2. Find new workspace
        const targetWs = this.workspaces.find(w => w.id === id);
        if (!targetWs) return;

        // 3. Update active ID
        this.activeWorkspaceId = id;

        // 4. Load new widgets
        this.widgetManager.loadWidgets(targetWs.widgets);

        // 5. Execute Rules (Automation)
        if (targetWs.rules) {
            try {
                await window.electronAPI.executeWorkspaceRules(targetWs.rules);
            } catch (e) {
                console.error("Automation error:", e);
            }
        }

        // 6. Persist switch
        this.save();

        // Notify UI (Trigger event or callback - handled by UI component later)
        window.dispatchEvent(new CustomEvent('workspace-changed', { detail: { id: id } }));
    }

    createWorkspace(name, icon) {
        const id = 'ws-' + Date.now();
        const newWs = {
            id: id,
            name: name,
            icon: icon,
            widgets: [], // Start empty? Or copy current? Let's start empty.
            rules: { launch: [], kill: [] }
        };
        this.workspaces.push(newWs);
        this.save();
        return id;
    }

    updateRules(id, rules) {
        const ws = this.workspaces.find(w => w.id === id);
        if (ws) {
            ws.rules = rules;
            this.save();
        }
    }

    deleteWorkspace(id) {
        if (this.workspaces.length <= 1) return; // Prevent deleting last one

        this.workspaces = this.workspaces.filter(w => w.id !== id);

        // If we deleted active one, switch to first available
        if (this.activeWorkspaceId === id) {
            this.switchWorkspace(this.workspaces[0].id);
        } else {
            this.save();
        }
    }
}
