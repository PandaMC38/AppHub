
// AppHub Frontend Entry Point
// Now refactored to use WidgetManager

import { WidgetManager } from './WidgetManager.js';
import { ProfileManager } from './ProfileManager.js';
import { SpotlightManager } from './SpotlightManager.js';
import { NotificationManager } from './NotificationManager.js';
import { VoiceAssistant } from './VoiceAssistant.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- UI Elements ---
    const gridEl = document.getElementById('widgets-area');
    const appGrid = document.getElementById('app-grid');
    const searchBar = document.getElementById('search-bar');
    const contextMenu = document.getElementById('context-menu');
    const menuLaunch = document.getElementById('menu-launch');
    const menuToggleFav = document.getElementById('menu-toggle-fav');

    // Header & Sidebar
    const welcomeTitle = document.querySelector('header h1');
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.createElement('button');

    // Controls
    // Controls
    const addWidgetBtn = document.getElementById('add-widget-btn');
    const widgetDrawer = document.getElementById('widget-drawer');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');

    // Settings
    const settingsBtn = document.getElementById('settings-btn');
    const settingsDrawer = document.getElementById('settings-drawer');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    // Settings Inputs
    const usernameInput = document.getElementById('username-input');
    const accentColorInput = document.getElementById('accent-color-input');
    const sizeInput = document.getElementById('size-input');
    const opacityInput = document.getElementById('opacity-input');
    const changeWallpaperBtn = document.getElementById('change-wallpaper-btn');
    const resetWallpaperBtn = document.getElementById('reset-wallpaper-btn');
    const videoBg = document.getElementById('video-bg');

    // Theme Store Inputs
    const newProfileName = document.getElementById('new-profile-name');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const profilesList = document.getElementById('profiles-list');

    // --- State & Helpers ---
    function safeJsonParse(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) { return defaultValue; }
    }

    let allApps = [];
    let favorites = safeJsonParse('apphub_favorites', []);
    let currentRightClickedApp = null;

    // --- Initialization ---

    // 1. Sidebar Toggle
    toggleBtn.className = 'sidebar-toggle';
    toggleBtn.innerHTML = '◀';
    toggleBtn.title = "Replier le menu";
    sidebar.prepend(toggleBtn);
    toggleBtn.onclick = () => {
        sidebar.classList.toggle('collapsed');
        toggleBtn.innerHTML = sidebar.classList.contains('collapsed') ? '▶' : '◀';
    };

    // 2. Notifications & Error Handling
    const notifications = new NotificationManager();

    // Replace native alerts with Toasts
    window.onerror = function (message, source, lineno, colno, error) {
        console.error("Global Error:", message, error); // Keep technical log for devs
        notifications.show(`Oups ! Une erreur est survenue.`, 'error', 5000);
        return true;
    };
    window.addEventListener('unhandledrejection', function (event) {
        console.error("Async Error:", event.reason);
        notifications.show(`Oups ! Une erreur inattendue s'est produite.`, 'error', 5000);
    });

    // 3. Widget Manager
    const widgetManager = new WidgetManager(gridEl, notifications);
    widgetManager.render();

    // --- Workspace Switcher UI ---
    const workspaceSwitcher = document.getElementById('workspace-switcher');

    function renderWorkspaces() {
        if (!workspaceSwitcher) return;
        workspaceSwitcher.innerHTML = '';

        const workspaces = widgetManager.workspaceManager.getWorkspaces();
        const activeId = widgetManager.workspaceManager.activeWorkspaceId;

        workspaces.forEach(ws => {
            const btn = document.createElement('button');
            btn.className = `ws-btn ${ws.id === activeId ? 'active' : ''}`;
            btn.title = ws.name;
            btn.innerHTML = `
                <span class="ws-icon">${ws.icon || '📦'}</span>
                <span class="ws-label">${ws.name}</span>
            `;

            btn.onclick = () => {
                if (ws.id !== activeId) {
                    widgetManager.workspaceManager.switchWorkspace(ws.id);
                    renderWorkspaces();
                    notifications.show(`Espace "${ws.name}" activé`, 'success');
                }
            };

            // Improved Button Inner HTML with Gear
            btn.innerHTML = `
                <div style="display:flex; align-items:center; gap:0.8rem; flex:1;">
                    <span class="ws-icon">${ws.icon || '📦'}</span>
                    <span class="ws-label">${ws.name}</span>
                </div>
                <div class="ws-actions" style="opacity:0.5; font-size:0.8rem;">⚙️</div>
            `;

            // Handle Gear Click specifically
            const gear = btn.querySelector('.ws-actions');
            gear.onclick = (e) => {
                e.stopPropagation(); // Don't switch workspace
                openWorkspaceConfig(ws);
            };

            // Context Menu for Deletion
            gear.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (ws.id === 'default') return;
                if (confirm(`Supprimer l'espace "${ws.name}" ?`)) {
                    widgetManager.workspaceManager.deleteWorkspace(ws.id);
                    renderWorkspaces();
                    notifications.show('Espace supprimé', 'info');
                }
            };

            // Keep button right click as fallback or just nothing
            btn.oncontextmenu = (e) => e.preventDefault();

            workspaceSwitcher.appendChild(btn);
        });

        // Add "New Workspace" button
        const addBtn = document.createElement('button');
        addBtn.className = 'ws-btn ws-add-btn';
        addBtn.title = "Créer un espace";
        addBtn.innerHTML = `
            <span class="ws-icon">➕</span>
            <span class="ws-label">Nouvel Espace</span>
        `;
        addBtn.onclick = () => {
            document.getElementById('new-ws-name').value = '';
            document.getElementById('new-ws-icon').value = '';
            document.getElementById('create-workspace-modal').classList.add('open');
            document.getElementById('new-ws-name').focus();
        };
        workspaceSwitcher.appendChild(addBtn);
    }

    // --- Create Workspace Modal Logic ---
    const createWsModal = document.getElementById('create-workspace-modal');
    const createWsConfirm = document.getElementById('create-ws-confirm');
    const createWsCancel = document.getElementById('create-ws-cancel');

    if (createWsCancel) createWsCancel.onclick = () => createWsModal.classList.remove('open');

    if (createWsConfirm) createWsConfirm.onclick = () => {
        const name = document.getElementById('new-ws-name').value.trim();
        const icon = document.getElementById('new-ws-icon').value.trim();

        if (name) {
            widgetManager.workspaceManager.createWorkspace(name, icon || '📁');
            renderWorkspaces();
            notifications.show('Espace créé !', 'success');
            createWsModal.classList.remove('open');
        } else {
            notifications.show('Le nom est obligatoire.', 'warning');
        }
    };



    // Initial Render
    renderWorkspaces();

    // List for global event if needed, but we re-render on click mainly.
    // If we wanted to react to external changes:
    // window.addEventListener('workspace-changed', () => renderWorkspaces());

    // 3. Profile Manager (for Themes)
    const profileManager = new ProfileManager(widgetManager, (prefs) => {
        // Callback when a profile is loaded -> Update UI
        if (prefs.username) {
            usernameInput.value = prefs.username;
            welcomeTitle.textContent = `Bienvenue, ${prefs.username}`;
        }
        if (prefs.accent) {
            accentColorInput.value = prefs.accent;
            document.documentElement.style.setProperty('--accent', prefs.accent);
        }
        if (prefs.opacity) {
            opacityInput.value = prefs.opacity;
            opacityInput.nextElementSibling && (opacityInput.nextElementSibling.textContent = prefs.opacity); // if we had a label
            document.documentElement.style.setProperty('--card-bg-opacity', prefs.opacity / 100);
        }
        if (prefs.wallpaper) {
            applyWallpaper(prefs.wallpaper);
        } else {
            // Null wallpaper means default/none
            videoBg.style.display = 'none';
            videoBg.src = '';
            document.body.style.backgroundImage = 'none';
        }

        // Refresh settings inputs to match new state
        sizeInput.value = localStorage.getItem('apphub_gridSize') || "140";
        updateSize(sizeInput.value);
    });

    function renderProfilesList() {
        profilesList.innerHTML = '';
        const names = profileManager.getProfileNames();
        if (names.length === 0) {
            profilesList.innerHTML = '<div style="opacity: 0.5; text-align: center; padding: 1rem; font-size: 0.9rem;">Aucun thème sauvegardé</div>';
            return;
        }

        names.forEach(name => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.justifyContent = 'space-between';
            item.style.background = 'rgba(255,255,255,0.05)';
            item.style.padding = '0.5rem';
            item.style.borderRadius = '6px';

            const label = document.createElement('span');
            label.textContent = name;
            label.style.fontWeight = 'bold';

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.gap = '0.5rem';

            const loadBtn = document.createElement('button');
            loadBtn.textContent = 'Charger';
            loadBtn.className = 'nav-btn'; // reuse class for style
            loadBtn.style.padding = '0.2rem 0.6rem';
            loadBtn.style.fontSize = '0.8rem';
            loadBtn.onclick = () => {
                if (confirm(`Charger le thème "${name}" ?`)) {
                    profileManager.loadProfile(name);
                    notifications.show("Thème chargé !", 'success');
                }
            };

            const delBtn = document.createElement('button');
            delBtn.textContent = '🗑️';
            delBtn.style.background = 'transparent';
            delBtn.style.border = 'none';
            delBtn.style.color = '#ff4444';
            delBtn.style.cursor = 'pointer';
            delBtn.onclick = () => {
                if (confirm(`Supprimer "${name}" ?`)) {
                    profileManager.deleteProfile(name);
                    renderProfilesList();
                    notifications.show('Profil supprimé.', 'info');
                }
            };

            actions.appendChild(loadBtn);
            actions.appendChild(delBtn);
            item.appendChild(label);
            item.appendChild(actions);
            profilesList.appendChild(item);
        });
    }

    // Profile UI Events
    saveProfileBtn.onclick = () => {
        const name = newProfileName.value.trim();
        if (!name) {
            notifications.show("Veuillez entrer un nom pour le thème.", 'warning');
            return;
        }
        if (profileManager.saveProfile(name)) {
            newProfileName.value = '';
            renderProfilesList();
            notifications.show(`Thème "${name}" sauvegardé !`, 'success');
        } else {
            notifications.show("Erreur lors de la sauvegarde.", 'error');
        }
    };

    // Initial Render of profiles
    renderProfilesList();


    // 4. User Preferences
    const prefs = {
        wallpaper: safeJsonParse('apphub_wallpaper', null),
        username: localStorage.getItem('apphub_username') || "Utilisateur",
        accent: localStorage.getItem('apphub_accent') || "#646cff",
        gridSize: localStorage.getItem('apphub_gridSize') || "140",
        opacity: localStorage.getItem('apphub_opacity') || "5"
    };

    // Apply Prefs
    usernameInput.value = prefs.username;
    welcomeTitle.textContent = `Bienvenue, ${prefs.username}`;

    accentColorInput.value = prefs.accent;
    document.documentElement.style.setProperty('--accent', prefs.accent);

    sizeInput.value = prefs.gridSize;
    updateSize(prefs.gridSize);

    opacityInput.value = prefs.opacity;
    document.documentElement.style.setProperty('--card-bg-opacity', prefs.opacity / 100);

    if (prefs.wallpaper) applyWallpaper(prefs.wallpaper);

    // --- App Loading & Rendering ---
    appGrid.innerHTML = '<div class="loading-apps" style="grid-column: 1/-1; text-align: center; padding: 2rem; opacity: 0.6;">Chargement des applications...</div>';


    // Load Apps
    const loadApps = async () => {
        try {
            const [stdApps, steamApps] = await Promise.all([
                window.electronAPI.getApps(),
                window.electronAPI.getSteamGames()
            ]);

            // Merge & Dedup
            const merged = [...stdApps, ...steamApps];
            const unique = new Map();
            merged.forEach(app => {
                const key = app.name.toLowerCase().trim();
                if (!unique.has(key)) {
                    unique.set(key, app);
                } else {
                    const existing = unique.get(key);
                    // Prefer Steam if available, or icon presence
                    if (app.type === 'steam' && existing.type !== 'steam') {
                        if (app.icon || !existing.icon) unique.set(key, app);
                    }
                }
            });
            allApps = Array.from(unique.values());
            renderApps();

            // 4. Spotlight & Search
            const spotlight = new SpotlightManager(allApps);

            // 5. Voice Assistant (Jarvis)
            const jarvis = new VoiceAssistant(spotlight);

        } catch (error) {
            console.error("Failed to load apps:", error);
            appGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ff6b6b; padding: 2rem;">Erreur lors du chargement des applications.</div>`;
        }
    };

    loadApps(); // Call the async function to load apps

    let currentCategory = 'all';

    function renderApps(query = '') {
        appGrid.innerHTML = '';

        // 1. Filter by Query
        let filtered = allApps.filter(app => app.name.toLowerCase().includes(query));

        // 2. Filter by Category
        if (currentCategory === 'favorites') {
            filtered = filtered.filter(app => favorites.includes(app.path));
        } else if (currentCategory === 'recent') {
            // Mock: Random 5 for now, or just show all
            // TODO: Implement real recent logic
            filtered = filtered.slice(0, 8);
        } else if (currentCategory === 'top') {
            // Mock: Random 5
            filtered = filtered.slice(0, 5);
        }

        // Always put favorites on top for 'all' view
        if (currentCategory === 'all') {
            const favs = filtered.filter(app => favorites.includes(app.path));
            const others = filtered.filter(app => !favorites.includes(app.path));
            filtered = [...favs, ...others];
        }

        if (filtered.length === 0) {
            appGrid.innerHTML = '<div class="no-results" style="grid-column: 1/-1; text-align: center; opacity: 0.5;">Aucune application trouvée</div>';
            return;
        }

        filtered.forEach(app => {
            const isFav = favorites.includes(app.path);
            const card = document.createElement('div');
            card.className = `app-card ${isFav ? 'favorite' : ''}`;
            card.innerHTML = `
                <img src="${app.icon || 'src/logo.png'}" alt="${app.name}" loading="lazy" class="app-icon-img">
                <div class="app-name">${app.name}</div>
                ${isFav ? '<div class="fav-badge">★</div>' : ''}
            `;

            card.onclick = () => window.electronAPI.launchApp(app.path);
            card.oncontextmenu = (e) => {
                e.preventDefault();
                currentRightClickedApp = app;
                contextMenu.style.top = `${e.clientY}px`;
                contextMenu.style.left = `${e.clientX}px`;
                contextMenu.style.display = 'block';
                menuToggleFav.textContent = isFav ? "Retirer des favoris" : "Ajouter aux favoris";
            };

            appGrid.appendChild(card);
        });
    }

    // --- Search ---
    searchBar.addEventListener('input', (e) => renderApps(e.target.value.toLowerCase()));

    if (clearSearchBtn) {
        clearSearchBtn.onclick = () => {
            searchBar.value = '';
            renderApps('');
            searchBar.focus();
        };
    }

    // --- Category Navigation ---
    const navBtns = document.querySelectorAll('.nav-btn[data-category]');
    navBtns.forEach(btn => {
        btn.onclick = () => {
            // Update Active State
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update Filter
            currentCategory = btn.dataset.category;

            // Update Header Title based on category
            const userName = localStorage.getItem('apphub_username') || "Utilisateur";
            switch (currentCategory) {
                case 'favorites':
                    welcomeTitle.textContent = "Mes Favoris ⭐";
                    break;
                case 'recent':
                    welcomeTitle.textContent = "Récemment ouverts 🕒";
                    break;
                case 'top':
                    welcomeTitle.textContent = "Les plus populaires 🔥";
                    break;
                case 'all':
                default:
                    welcomeTitle.textContent = `Bonjour, ${userName}`;
                    break;
            }

            renderApps(searchBar.value.toLowerCase());
        };
    });

    // --- Event Listeners ---

    // Toggle Drawer
    addWidgetBtn.onclick = () => {
        settingsDrawer.classList.remove('open'); // Close settings if open
        widgetDrawer.classList.add('open');
        // Auto-enable edit mode when opening drawer
        widgetManager.toggleEditMode(true);
    };

    closeDrawerBtn.onclick = () => {
        widgetDrawer.classList.remove('open');
        // Disable edit mode on close
        widgetManager.toggleEditMode(false);
    };

    // Settings
    settingsBtn.onclick = () => {
        widgetDrawer.classList.remove('open'); // Close widgets if open
        settingsDrawer.classList.add('open');
        // Init previews
        updatePreviews();
    };

    closeSettingsBtn.onclick = () => {
        settingsDrawer.classList.remove('open');
    };

    // Helper to update previews without saving
    function updatePreviews() {
        const accent = accentColorInput.value;
        const opacity = opacityInput.value;
        const size = sizeInput.value;

        // Accent Preview
        const accentPreview = document.getElementById('accent-preview');
        if (accentPreview) accentPreview.style.backgroundColor = accent;

        // Opacity Preview
        const opacityPreview = document.getElementById('opacity-preview');
        if (opacityPreview) {
            opacityPreview.style.backgroundColor = `rgba(255,255,255, ${opacity / 100})`;
        }

        // Size Value
        const sizeValue = document.getElementById('size-value');
        if (sizeValue) sizeValue.textContent = size;

        // Apply Live (Optional? User wanted "example aside", but live is better)
        // Let's apply live to CSS variables for immediate feedback on the background
        document.documentElement.style.setProperty('--accent', accent);
        document.documentElement.style.setProperty('--card-bg-opacity', opacity / 100);
        updateSize(size);
    }

    // Live Listeners
    accentColorInput.addEventListener('input', updatePreviews);
    opacityInput.addEventListener('input', updatePreviews);
    sizeInput.addEventListener('input', updatePreviews);

    // Save Settings
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    saveSettingsBtn.onclick = () => {
        localStorage.setItem('apphub_username', usernameInput.value);
        localStorage.setItem('apphub_accent', accentColorInput.value);
        localStorage.setItem('apphub_gridSize', sizeInput.value);
        localStorage.setItem('apphub_opacity', opacityInput.value);

        welcomeTitle.textContent = `Bienvenue, ${usernameInput.value}`;

        settingsDrawer.classList.remove('open');
        notifications.show('Paramètres sauvegardés !', 'success');
    };

    // Wallpaper
    function applyWallpaper(wp) {
        if (!wp) return;
        if (wp.type === 'video') {
            videoBg.src = wp.path;
            videoBg.style.display = 'block';
            document.body.style.backgroundImage = 'none';
            videoBg.play().catch(() => { });
        } else {
            videoBg.style.display = 'none';
            videoBg.src = '';
            document.body.style.setProperty('--bg-image', `url('${wp.path}?t=${Date.now()}')`);
        }
    }

    changeWallpaperBtn.onclick = async () => {
        changeWallpaperBtn.textContent = "Chargement...";
        try {
            const result = await window.electronAPI.selectWallpaper();
            if (result) {
                applyWallpaper(result);
                localStorage.setItem('apphub_wallpaper', JSON.stringify(result));
            }
        } catch (e) { alert("Erreur: " + e.message); }
        changeWallpaperBtn.textContent = "Choisir une image/vidéo...";
    };

    resetWallpaperBtn.onclick = () => {
        document.body.style.removeProperty('--bg-image');
        videoBg.style.display = 'none';
        videoBg.src = '';
        localStorage.removeItem('apphub_wallpaper');
    };

    // Helper: Update Size
    function updateSize(val) {
        document.documentElement.style.setProperty('--grid-item-min', `${val}px`);
        document.documentElement.style.setProperty('--icon-size', `${val * 0.4}px`);
    }

    // Context Menu
    document.addEventListener('click', () => contextMenu.style.display = 'none');

    menuLaunch.addEventListener('click', async () => {
        if (currentRightClickedApp) await window.electronAPI.launchApp(currentRightClickedApp.path);
    });

    menuToggleFav.addEventListener('click', () => {
        if (currentRightClickedApp) {
            const path = currentRightClickedApp.path;
            if (favorites.includes(path)) favorites = favorites.filter(p => p !== path);
            else favorites.push(path);
            localStorage.setItem('apphub_favorites', JSON.stringify(favorites));
            renderApps(searchBar.value.toLowerCase());
        }
    });

    // --- Config Modal Logic ---
    const wsModal = document.getElementById('workspace-modal');
    const wsTitle = document.getElementById('ws-modal-title');
    const wsLaunch = document.getElementById('ws-launch-rules');
    const wsKill = document.getElementById('ws-kill-rules');
    const wsSave = document.getElementById('ws-save-btn');
    const wsCancel = document.getElementById('ws-cancel-btn');

    // App Selector Elements
    const wsAppSearch = document.getElementById('ws-app-search');
    const wsAppList = document.getElementById('ws-app-list');

    let currentConfigWsId = null;

    function renderAppSelector(query = '') {
        wsAppList.innerHTML = '';
        if (!query) {
            wsAppList.style.display = 'none';
            return;
        }

        const filtered = allApps.filter(app => app.name.toLowerCase().includes(query.toLowerCase()));

        if (filtered.length === 0) {
            wsAppList.innerHTML = '<div style="padding:0.5rem; text-align:center; opacity:0.5; font-size:0.9rem;">Aucune application trouvée</div>';
            wsAppList.style.display = 'block';
            return;
        }

        filtered.forEach(app => {
            const item = document.createElement('div');
            item.style.padding = '0.5rem 1rem';
            item.style.cursor = 'pointer';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '0.8rem';
            item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            item.style.transition = 'background 0.2s';

            // Enable Drag
            item.draggable = true;
            item.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', app.path);
                e.dataTransfer.setData('application/x-app-name', app.name); // Not used but good for metadata
                e.dataTransfer.effectAllowed = 'copy';
            };

            item.onmouseover = () => item.style.background = 'rgba(255,255,255,0.1)';
            item.onmouseout = () => item.style.background = 'transparent';

            item.innerHTML = `
                <img src="${app.icon || 'src/logo.png'}" style="width:20px; height:20px; object-fit:contain;">
                <span style="font-size:0.9rem;">${app.name}</span>
            `;

            item.onclick = () => {
                // Add to textarea
                const currentVal = wsLaunch.value;
                const newline = currentVal.length > 0 && !currentVal.endsWith('\n') ? '\n' : '';
                wsLaunch.value += `${newline}${app.path}`;

                // Feedback
                notifications.show(`Ajouté : ${app.name}`, 'success');
                wsAppSearch.value = '';
                renderAppSelector(''); // Clear
            };

            wsAppList.appendChild(item);
        });

        wsAppList.style.display = 'block';
    }

    if (wsAppSearch) {
        wsAppSearch.addEventListener('input', (e) => renderAppSelector(e.target.value));
        wsAppSearch.addEventListener('focus', () => {
            if (wsAppSearch.value) renderAppSelector(wsAppSearch.value);
        });
        // Optional: Hide close on blur with delay? Let's keep it simple for now.
    }

    // Drag & Drop Logic for Textareas
    [wsLaunch, wsKill].forEach(el => {
        if (!el) return;
        el.ondragover = (e) => {
            e.preventDefault(); // Allow drop
            el.style.borderColor = 'var(--accent)';
        };
        el.ondragleave = () => {
            el.style.borderColor = 'var(--glass-border)';
        };
    });

    if (wsLaunch) {
        wsLaunch.ondrop = (e) => {
            e.preventDefault();
            wsLaunch.style.borderColor = 'var(--glass-border)';
            const path = e.dataTransfer.getData('text/plain');
            if (path) {
                const currentVal = wsLaunch.value;
                const newline = currentVal.length > 0 && !currentVal.endsWith('\n') ? '\n' : '';
                wsLaunch.value += `${newline}${path}`;
                notifications.show('Ajouté au lancement', 'success');
            }
        };
    }

    if (wsKill) {
        wsKill.ondrop = (e) => {
            e.preventDefault();
            wsKill.style.borderColor = 'var(--glass-border)';
            const path = e.dataTransfer.getData('text/plain');
            if (path) {
                // Extract executable name
                const exeName = path.split('\\').pop().split('/').pop();
                const currentVal = wsKill.value;
                const separator = currentVal.length > 0 && !currentVal.trim().endsWith(',') ? ', ' : '';
                wsKill.value += `${separator}${exeName}`;
                notifications.show(`Ajouté à la fermeture : ${exeName}`, 'success');
            }
        };
    }

    function openWorkspaceConfig(ws) {
        currentConfigWsId = ws.id;
        wsTitle.textContent = `Config: ${ws.name}`;

        // Load existing rules
        const rules = ws.rules || { launch: [], kill: [] };
        wsLaunch.value = (rules.launch || []).join('\n');
        wsKill.value = (rules.kill || []).join(', '); // Comma separated for kill

        // Reset Search
        if (wsAppSearch) {
            wsAppSearch.value = '';
            wsAppList.style.display = 'none';
        }

        wsModal.classList.add('open');
    }

    if (wsCancel) wsCancel.onclick = () => wsModal.classList.remove('open');

    if (wsSave) wsSave.onclick = () => {
        if (!currentConfigWsId) return;

        // Parse Inputs
        const launch = wsLaunch.value.split('\n').map(l => l.trim()).filter(l => l);
        const kill = wsKill.value.split(',').map(k => k.trim()).filter(k => k);

        // Save
        widgetManager.workspaceManager.updateRules(currentConfigWsId, { launch, kill });

        // Close
        wsModal.classList.remove('open');
        notifications.show('Règles mises à jour', 'success');
    };

    // Close modal when clicking outside
    window.onclick = (e) => {
        if (e.target === wsModal) wsModal.classList.remove('open');
        if (typeof createWsModal !== 'undefined' && e.target === createWsModal) createWsModal.classList.remove('open');
    };
});
