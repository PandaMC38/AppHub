
// AppHub Frontend Entry Point
// Now refactored to use WidgetManager

import { WidgetManager } from './WidgetManager.js';
import { ProfileManager } from './ProfileManager.js';

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
    const editModeBtn = document.getElementById('edit-mode-btn');
    const libModal = document.getElementById('widget-library-modal');
    const closeLibBtn = document.getElementById('close-lib-btn');
    const libItems = document.querySelectorAll('.lib-item');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');

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

    // 2. Widget Manager
    const widgetManager = new WidgetManager(gridEl);
    widgetManager.render();

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
                    alert("Thème chargé !");
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
            alert("Veuillez entrer un nom pour le thème.");
            return;
        }
        if (profileManager.saveProfile(name)) {
            newProfileName.value = '';
            renderProfilesList();
            alert(`Thème "${name}" sauvegardé !`);
        } else {
            alert("Erreur lors de la sauvegarde.");
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
    } catch (error) {
        console.error("Failed to load apps:", error);
        appGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ff6b6b; padding: 2rem;">Erreur lors du chargement des applications.</div>`;
    }

    function renderApps(query = '') {
        appGrid.innerHTML = '';

        // Separate favorites
        const favApps = allApps.filter(app => favorites.includes(app.path));
        const regularApps = allApps.filter(app => !favorites.includes(app.path));

        const filtered = [...favApps, ...regularApps].filter(app => app.name.toLowerCase().includes(query));

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

    // --- Event Listeners ---

    // Edit Mode
    editModeBtn.onclick = () => {
        const isActive = widgetManager.toggleEditMode();
        if (isActive) {
            libModal.classList.add('open');
            editModeBtn.style.color = 'var(--accent)';
        } else {
            libModal.classList.remove('open');
            editModeBtn.style.color = 'white';
        }
    };

    closeLibBtn.onclick = () => {
        libModal.classList.remove('open');
        widgetManager.toggleEditMode(false);
        editModeBtn.style.color = 'white';
    };

    // Add Widget
    libItems.forEach(item => {
        item.onclick = () => {
            widgetManager.addWidget(item.dataset.type);
            libModal.classList.remove('open');
        };
    });

    // Settings
    settingsBtn.onclick = () => {
        settingsModal.classList.add('open');
        // Init previews
        updatePreviews();
    };

    closeSettingsBtn.onclick = () => {
        settingsModal.classList.remove('open');
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

        settingsModal.classList.remove('open');
        alert('Paramètres sauvegardés !');
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
});
