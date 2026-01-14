import { NotificationManager } from './NotificationManager.js';

export class SpotlightManager {
    constructor(allApps) {
        this.allApps = allApps;
        this.isVisible = false;
        this.overlay = null;
        this.input = null;
        this.resultsList = null;

        this.initUI();
        this.setupListeners();
    }

    initUI() {
        // Create Overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'spotlight-overlay';
        this.overlay.innerHTML = `
            <div class="spotlight-container">
                <input type="text" class="spotlight-input" placeholder="Rechercher une app, calculer, commande...">
                <div class="spotlight-results"></div>
            </div>
            <div class="spotlight-hint">
                <span>Tab</span> choisir • <span>Enter</span> valider • <span>Esc</span> fermer
            </div>
        `;
        document.body.appendChild(this.overlay);

        this.input = this.overlay.querySelector('.spotlight-input');
        this.resultsList = this.overlay.querySelector('.spotlight-results');
    }

    setupListeners() {
        // Toggle Shortcut
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                this.toggle();
            }
            if (this.isVisible && e.key === 'Escape') {
                this.close();
            }
        });

        // Input Handling
        this.input.addEventListener('input', (e) => this.handleInput(e.target.value));
        this.input.addEventListener('keydown', (e) => this.handleKeyNavigation(e));

        // Click outside to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });
    }

    toggle() {
        this.isVisible = !this.isVisible;
        if (this.isVisible) {
            this.overlay.classList.add('visible');
            this.input.value = '';
            this.resultsList.innerHTML = '';
            this.input.focus();
        } else {
            this.overlay.classList.remove('visible');
        }
    }

    close() {
        this.isVisible = false;
        this.overlay.classList.remove('visible');
    }

    async handleInput(query) {
        if (!query) {
            this.resultsList.innerHTML = '';
            return;
        }

        const results = [];

        // 1. Math Calculation (Regex: numbers and operators only)
        // Only trigger if query looks like math and has at least one number and operator
        const mathRegex = /^[\d\s\+\-\*\/\(\)\.]*[\d]+[\d\s\+\-\*\/\(\)\.]*$/;
        const hasOperator = /[\+\-\*\/]/.test(query);

        if (hasOperator && mathRegex.test(query)) {
            try {
                // Determine safety... eval is risky but for a controlled electron local env with regex check...
                // Better use Function constructor or simple eval since we regex checked it strictly
                const result = Function('"use strict";return (' + query + ')')();
                if (result !== undefined && !isNaN(result)) {
                    results.push({
                        type: 'math',
                        label: `= ${result}`,
                        value: String(result),
                        icon: '🧮'
                    });
                }
            } catch (e) { }
        }

        // 2. Apps Search
        const appMatches = this.allApps.filter(app =>
            app.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5); // Limit 5

        appMatches.forEach(app => {
            results.push({
                type: 'app',
                label: app.name,
                value: app.path,
                icon: app.icon ? `<img src="${app.icon}">` : '🚀'
            });
        });

        // 3. System Commands
        const sysCmds = [
            { key: 'shutdown', name: 'Eteindre (Shutdown)', cmd: 'shutdown' },
            { key: 'restart', name: 'Redémarrer (Restart)', cmd: 'restart' },
            { key: 'sleep', name: 'Mise en veille (Sleep)', cmd: 'sleep' },
            { key: 'reload', name: 'Recharger AppHub', cmd: 'app-reload' },
            { key: 'bin', name: 'Vider la corbeille', cmd: 'empty-bin' },
        ];

        sysCmds.forEach(c => {
            if (c.name.toLowerCase().includes(query.toLowerCase()) || c.key.includes(query.toLowerCase())) {
                results.push({
                    type: 'system',
                    label: c.name,
                    value: c.cmd,
                    icon: '⚙️'
                });
            }
        });

        // 4. File Search (Async - might lag if typed fast, maybe debounce later?)
        if (query.length > 2) {
            // We trigger file search but don't await blocking UI
            // For V1, let's keep it simple and await.
            // Or better, just push a "Searching files..." placeholder if needed.
            // Let's rely on fast response or user stopping typing.
            try {
                const files = await window.electronAPI.searchFiles(query);
                files.forEach(f => {
                    results.push({
                        type: 'file',
                        label: f.name,
                        sub: f.path,
                        value: f.path,
                        icon: '📄'
                    });
                });
            } catch (e) { }
        }

        // 5. Web Search Fallback
        results.push({
            type: 'web',
            label: `Rechercher "${query}" sur Google`,
            value: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            icon: '🌐'
        });

        this.renderResults(results);
    }

    renderResults(results) {
        this.resultsList.innerHTML = '';
        this.results = results; // Store for navigation
        this.selectedIndex = 0;

        results.forEach((res, index) => {
            const item = document.createElement('div');
            item.className = 'spotlight-item';
            if (index === 0) item.classList.add('selected');

            const iconContent = res.icon.startsWith('<') ? res.icon : `<span style="font-size:1.2rem">${res.icon}</span>`;

            item.innerHTML = `
                <div class="spotlight-icon">${iconContent}</div>
                <div class="spotlight-info">
                    <div class="spotlight-label">${res.label}</div>
                    ${res.sub ? `<div class="spotlight-sub">${res.sub}</div>` : ''}
                </div>
                ${res.type === 'math' ? '<div class="spotlight-action">Copier</div>' : ''}
            `;

            item.onclick = () => this.executeAction(res);
            this.resultsList.appendChild(item);
        });
    }

    handleKeyNavigation(e) {
        // ... Arrows / Enter logic ... 
        if (!this.results || this.results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
            this.updateSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
            this.updateSelection();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            this.executeAction(this.results[this.selectedIndex]);
        }
    }

    updateSelection() {
        const items = this.resultsList.querySelectorAll('.spotlight-item');
        items.forEach((item, idx) => {
            if (idx === this.selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    launchBestMatch(appName) {
        // Simple search in allApps
        // 1. Exact match
        let match = this.allApps.find(a => a.name.toLowerCase() === appName.toLowerCase());

        // 2. Contains match
        if (!match) {
            match = this.allApps.find(a => a.name.toLowerCase().includes(appName.toLowerCase()));
        }

        if (match) {
            window.electronAPI.launchApp(match.path);
            new NotificationManager().show(`Lancement de ${match.name}...`, '🚀');
        } else {
            new NotificationManager().show(`Impossible de trouver "${appName}"`, '❌');
            if (window.speechSynthesis) {
                const u = new SpeechSynthesisUtterance(`Je n'ai pas trouvé l'application ${appName}`);
                u.lang = 'fr-FR';
                window.speechSynthesis.speak(u);
            }
        }
    }

    async executeAction(result) {
        if (!result) return;

        switch (result.type) {
            case 'app':
                window.electronAPI.launchApp(result.value);
                this.close();
                break;
            case 'math':
                // Copy to clipboard
                navigator.clipboard.writeText(result.value);
                this.input.value = result.value; // Show result
                // We use a custom event or a global helper if NotificationManager isn't passed to SpotlightManager.
                // Since SpotlightManager is standalone, we might need to pass the notification instance or dispatch event.
                // Let's assume we can dispatch a custom event for the main process to pick up, OR we can instantiate NotificationManager here too since it's just DOM.
                // Actually, NotificationManager is a class we can just import.
                // checking imports... we need to import it at the top.
                // For now, let's try a simple approach:
                const notif = new NotificationManager();
                notif.show('Résultat copié !', 'success');
                break;
            case 'web':
                window.open(result.value, '_blank');
                this.close();
                break;
            case 'system':
                if (result.value === 'app-reload') {
                    window.location.reload();
                } else {
                    if (confirm(`Exécuter : ${result.label} ?`)) {
                        await window.electronAPI.executeSystemCommand(result.value);
                    }
                }
                this.close();
                break;
            case 'file':
                // Open file folder or file itself?? standard is file itself
                // Use launchApp for generic open
                window.electronAPI.launchApp(result.value);
                this.close();
                break;
        }
    }
}
