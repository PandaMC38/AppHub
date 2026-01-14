
// AppHub Frontend Entry Point
// Now refactored to use WidgetManager

import { WidgetManager } from './WidgetManager.js';

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
    widgetManager.render(); // Initial Render

    // 3. User Preferences
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
    settingsBtn.onclick = () => settingsModal.classList.add('open');
    closeSettingsBtn.onclick = () => settingsModal.classList.remove('open');
    document.getElementById('save-settings-btn').onclick = () => settingsModal.classList.remove('open');

    // Preferences Inputs
    usernameInput.addEventListener('input', (e) => {
        const val = e.target.value;
        welcomeTitle.textContent = val ? `Bienvenue, ${val}` : 'Bienvenue';
        localStorage.setItem('apphub_username', val);
    });

    accentColorInput.addEventListener('input', (e) => {
        const val = e.target.value;
        document.documentElement.style.setProperty('--accent', val);
        localStorage.setItem('apphub_accent', val);
    });

    sizeInput.addEventListener('input', (e) => {
        const val = e.target.value;
        updateSize(val);
        localStorage.setItem('apphub_gridSize', val);
    });

    opacityInput.addEventListener('input', (e) => {
        const val = e.target.value;
        document.documentElement.style.setProperty('--card-bg-opacity', val / 100);
        localStorage.setItem('apphub_opacity', val);
    });

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
