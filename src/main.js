// Imports removed for vanilla compatibility: style.css is loaded in HTML, Sortable is loaded via script tag.
// import './style.css';
// import Sortable from 'sortablejs';

document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const grid = document.getElementById('app-grid');
    const favoritesGrid = document.getElementById('favorites-grid');
    const favoritesSection = document.getElementById('favorites-section');
    const topAppsGrid = document.getElementById('top-apps-grid');
    const topAppsSection = document.getElementById('top-apps-section');
    const searchBar = document.getElementById('search-bar');
    const contextMenu = document.getElementById('context-menu');
    const menuLaunch = document.getElementById('menu-launch');
    const menuToggleFav = document.getElementById('menu-toggle-fav');

    // Dashboard Controls
    const editModeBtn = document.getElementById('edit-mode-btn');
    const addWidgetBtn = document.getElementById('add-widget-btn');

    // Widget Library
    const libModal = document.getElementById('widget-library-modal');
    const closeLibBtn = document.getElementById('close-lib-btn');
    const libItems = document.querySelectorAll('.lib-item');

    // Header
    const welcomeTitle = document.querySelector('header h1');

    // Widgets
    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date');
    const ramEl = document.getElementById('ram-usage');
    const videoBg = document.getElementById('video-bg'); // Added missing reference

    // Settings
    const settingsBtn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const closeModal = document.getElementById('close-settings-btn');
    const changeWallpaperBtn = document.getElementById('change-wallpaper-btn');
    const resetWallpaperBtn = document.getElementById('reset-wallpaper-btn');

    // New Settings Inputs
    const usernameInput = document.getElementById('username-input');
    const accentColorInput = document.getElementById('accent-color-input');
    const sizeInput = document.getElementById('size-input');
    const opacityInput = document.getElementById('opacity-input');

    // --- Helper for Safe Loading ---
    function safeJsonParse(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error(`Error parsing ${key}:`, e);
            return defaultValue;
        }
    }

    // State
    let allApps = [];
    let favorites = safeJsonParse('apphub_favorites', []);
    let appStats = safeJsonParse('apphub_stats', {});
    let activeWidgets = safeJsonParse('apphub_widgets', [
        { id: 'w1', type: 'time', size: 'small' },
        { id: 'w2', type: 'weather', size: 'small' },
        { id: 'w3', type: 'system', size: 'small' }
    ]);

    let currentRightClickedApp = null;
    let draggedItem = null;
    let currentCategory = 'all'; // Defined early to avoid access before init
    let renderedApps = []; // Defined early to avoid access before init

    // --- Init Preferences ---
    const prefs = {
        wallpaper: safeJsonParse('apphub_wallpaper', null),
        username: localStorage.getItem('apphub_username') || "Utilisateur",
        accent: localStorage.getItem('apphub_accent') || "#646cff",
        gridSize: localStorage.getItem('apphub_gridSize') || "140",
        opacity: localStorage.getItem('apphub_opacity') || "5"
    };

    // Apply Prefs
    // Wallpaper handled later by applyWallpaper


    // Apply defaults to inputs
    usernameInput.value = prefs.username;
    welcomeTitle.textContent = `Bienvenue, ${prefs.username}`;

    accentColorInput.value = prefs.accent;
    document.documentElement.style.setProperty('--accent', prefs.accent);

    sizeInput.value = prefs.gridSize;
    updateSize(prefs.gridSize);

    opacityInput.value = prefs.opacity;
    document.documentElement.style.setProperty('--card-bg-opacity', prefs.opacity / 100);


    // --- Sidebar Toggle ---
    const sidebar = document.querySelector('.sidebar');
    const layout = document.querySelector('.app-layout');

    // Create Toggle Button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'sidebar-toggle';
    toggleBtn.innerHTML = '◀';
    toggleBtn.title = "Replier le menu";
    sidebar.prepend(toggleBtn);

    toggleBtn.onclick = () => {
        sidebar.classList.toggle('collapsed');
        if (sidebar.classList.contains('collapsed')) {
            toggleBtn.innerHTML = '▶';
        } else {
            toggleBtn.innerHTML = '◀';
        }
    };

    // --- Dynamic Widgets System ---
    // activeWidgets moved to top state
    let isEditMode = false;

    // UI Elements
    const dashboardGrid = document.getElementById('widgets-area');

    // Init Drag & Drop
    // Init Drag & Drop
    if (typeof Sortable !== 'undefined') {
        try {
            new Sortable(dashboardGrid, {
                animation: 150,
                handle: '.widget',
                disabled: false,
                ghostClass: 'sortable-ghost',
                onEnd: function (evt) {
                    const newOrderIds = Array.from(dashboardGrid.children).map(el => el.dataset.id);
                    const reordered = [];
                    newOrderIds.forEach(id => {
                        const w = activeWidgets.find(x => x.id === id);
                        if (w) reordered.push(w);
                    });
                    activeWidgets = reordered;
                    saveWidgets();
                }
            });
        } catch (err) {
            console.warn("Sortable init failed:", err);
        }
    } else {
        console.warn("SortableJS not loaded. Drag & Drop disabled.");
    }

    function saveWidgets() {
        localStorage.setItem('apphub_widgets', JSON.stringify(activeWidgets));
    }

    function renderWidgets() {
        // Don't wipe innerHTML if we want to preserve DOM for drag? 
        // Actually for simplicity, we wipe. But dragging triggers onEnd which saves order.
        // It's fine.

        dashboardGrid.innerHTML = '';
        activeWidgets.forEach(widget => {
            const el = document.createElement('div');
            el.dataset.id = widget.id; // Critical for reordering
            el.className = `widget span-${widget.size === 'large' ? '2' : (widget.size === 'row' ? 'row' : '1')}`;
            if (widget.type === 'media') el.classList.add('row-layout');

            // Edit Controls
            const controls = document.createElement('div');
            controls.className = 'widget-controls';
            controls.innerHTML = `
                <button class="widget-btn btn-resize" title="Taille">📐</button>
                <button class="widget-btn btn-delete" title="Supprimer">✖️</button>
            `;

            controls.querySelector('.btn-delete').onclick = (e) => {
                e.stopPropagation(); // Prevent drag start maybe?
                activeWidgets = activeWidgets.filter(w => w.id !== widget.id);
                saveWidgets();
                renderWidgets();
            };

            controls.querySelector('.btn-resize').onclick = (e) => {
                e.stopPropagation();
                const sizes = ['small', 'large', 'row'];
                let currentIdx = sizes.indexOf(widget.size || 'small');
                widget.size = sizes[(currentIdx + 1) % sizes.length];
                saveWidgets();
                renderWidgets();
            };

            el.appendChild(controls);

            // Content Container
            const content = document.createElement('div');
            content.className = 'widget-content';

            // Widget Content Generation
            switch (widget.type) {
                case 'time':
                    content.innerHTML = `<div id="clock-${widget.id}" style="font-size: 2.5rem; font-weight:800; line-height:1;">--:--</div><div id="date-${widget.id}" style="opacity:0.6;">...</div>`;
                    startClock(widget.id);
                    break;
                case 'weather':
                    content.innerHTML = `<div class="widget-icon" style="font-size:2.5rem;">⛅</div><div class="weather-info"><div id="weather-temp-${widget.id}" style="font-size:1.5rem; font-weight:bold;">--°C</div><div id="weather-desc-${widget.id}" style="opacity:0.7;">Chargement...</div></div>`;
                    content.style.textAlign = 'center';
                    updateWeather(widget.id);
                    break;
                case 'media':
                    content.innerHTML = `
                        <div class="media-icon" style="font-size:2rem; background:rgba(255,255,255,0.1); padding:0.8rem; border-radius:50%;">🎵</div>
                        <div class="media-info" style="flex:1;">
                            <div style="font-weight:700;">Aucune lecture</div>
                            <div style="opacity:0.6; font-size:0.8rem;">Deezer / Spotify</div>
                        </div>
                        <div class="media-controls">
                            <button style="border:none;background:none;color:white;font-size:1.5rem;cursor:pointer;">⏮️</button>
                            <button style="border:none;background:none;color:white;font-size:1.5rem;cursor:pointer;">⏯️</button>
                            <button style="border:none;background:none;color:white;font-size:1.5rem;cursor:pointer;">⏭️</button>
                        </div>`;
                    // Visual only for prototype
                    break;
                case 'system':
                    content.innerHTML = `<div class="sys-label" style="text-transform:uppercase; letter-spacing:2px; opacity:0.5;">RAM</div><div class="sys-value" id="ram-${widget.id}" style="font-size:2.5rem; font-weight:800; color:var(--accent);">--%</div>`;
                    startSystemStats(widget.id);
                    break;

                case 'calculator':
                    content.innerHTML = `
                        <div class="calc-display" id="calc-display-${widget.id}">0</div>
                        <div class="calc-grid">
                            <button class="calc-btn op">C</button>
                            <button class="calc-btn op">/</button>
                            ... (abbreviated for search match safety, see below)
                        </div>`;
                    // Actually, cleaner to replace the whole block or just append cases.
                    // Since the tool replaces chunks, I'll match the end of calculator case.
                    break;
                case 'notes':
                    content.classList.add('widget-notes');
                    content.innerHTML = `<textarea placeholder="Ecrivez vos notes ici...">${widget.data?.text || ''}</textarea>`;
                    initNotes(widget, content);
                    break;
                case 'todo':
                    content.classList.add('widget-todo');
                    content.innerHTML = `
                        <div class="todo-input-container">
                            <input type="text" class="todo-input" placeholder="Nouvelle tâche...">
                            <button class="todo-add-btn">+</button>
                        </div>
                        <ul class="todo-list"></ul>
                    `;
                    initTodo(widget, content);
                    break;
                case 'disk':
                    content.classList.add('widget-disk');
                    content.innerHTML = `<div class="disk-loading">Chargement...</div>`;
                    initDiskSpace(widget, content);
                    break;
                case 'quicklaunch':
                    content.classList.add('widget-quicklaunch');
                    content.innerHTML = `<div class="quick-grid"></div><button class="quick-add-btn">+</button>`;
                    initQuickLaunch(widget, content);
                    break;
            }

            el.appendChild(content);
            dashboardGrid.appendChild(el);
        });

        // Apply Edit Mode Style
        if (isEditMode) dashboardGrid.classList.add('edit-mode');
        else dashboardGrid.classList.remove('edit-mode');
    }

    // --- Widget Logic Functions ---
    function startClock(id) {
        const update = () => {
            const elC = document.getElementById(`clock-${id}`);
            const elD = document.getElementById(`date-${id}`);
            if (!elC) return;
            const now = new Date();
            elC.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            elD.textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
        };
        update();
        setInterval(update, 1000);
    }

    async function startSystemStats(id) {
        const update = async () => {
            const el = document.getElementById(`ram-${id}`);
            if (!el) return;
            try {
                const stats = await window.electronAPI.getSystemStats();
                el.textContent = `${stats.memUsage}%`;
            } catch (e) { }
        };
        update();
        setInterval(update, 3000);
    }

    async function updateWeather(id) {
        // ... (reuse logic, simplified for brevity)
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current_weather=true`);
            const data = await response.json();
            const elT = document.getElementById(`weather-temp-${id}`);
            const elD = document.getElementById(`weather-desc-${id}`);
            if (elT) {
                elT.textContent = `${Math.round(data.current_weather.temperature)}°C`;
                elD.textContent = "Paris"; // Simple city name
            }
        } catch (e) { }
    }

    function initCalculator(id, container) {
        const display = container.querySelector(`#calc-display-${id}`);
        const buttons = container.querySelectorAll('.calc-btn');
        let current = '';

        buttons.forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation(); // Prevent drag
                const val = btn.textContent;

                if (val === 'C') {
                    current = '';
                } else if (val === 'DEL') {
                    current = current.toString().slice(0, -1);
                } else if (val === '=') {
                    try {
                        // Safe eval equivalent
                        // eslint-disable-next-line no-new-func
                        current = Function('"use strict";return (' + current + ')')();
                    } catch {
                        current = 'Error';
                    }
                } else {
                    current += val;
                }
                display.textContent = current || '0';
            };
        });
    }

    function initNotes(widget, container) {
        const textarea = container.querySelector('textarea');
        if (!textarea) return;

        textarea.value = widget.data?.text || '';

        textarea.addEventListener('input', () => {
            if (!widget.data) widget.data = {};
            widget.data.text = textarea.value;
            saveWidgets();
        });
    }

    function initTodo(widget, container) {
        const input = container.querySelector('.todo-input');
        const addBtn = container.querySelector('.todo-add-btn');
        const list = container.querySelector('.todo-list');

        if (!widget.data) widget.data = {};
        if (!widget.data.tasks) widget.data.tasks = [];

        const render = () => {
            list.innerHTML = '';
            widget.data.tasks.forEach((task, index) => {
                const li = document.createElement('li');
                li.className = task.done ? 'done' : '';
                li.innerHTML = `
                    <span class="todo-text">${task.text}</span>
                    <button class="todo-del-btn">×</button>
                `;

                // Toggle Done
                li.querySelector('.todo-text').onclick = () => {
                    task.done = !task.done;
                    saveWidgets();
                    render();
                };

                // Delete
                li.querySelector('.todo-del-btn').onclick = (e) => {
                    e.stopPropagation();
                    widget.data.tasks.splice(index, 1);
                    saveWidgets();
                    render();
                };

                list.appendChild(li);
            });
        };

        const addTask = () => {
            const text = input.value.trim();
            if (text) {
                widget.data.tasks.push({ text, done: false });
                input.value = '';
                saveWidgets();
                render();
            }
        };

        addBtn.onclick = addTask;
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });

        render();
    }

    async function initDiskSpace(widget, container) {
        try {
            const disks = await window.electronAPI.getDiskSpace();
            if (!disks || disks.length === 0) {
                container.innerHTML = '<div style="opacity:0.6; font-size:0.9rem;">Aucun disque trouvé</div>';
                return;
            }

            // If widget size is small, maybe just show C: or the first one?
            // For now, list all but compact.
            let html = '';
            disks.forEach(d => {
                // Color based on percent
                let color = 'var(--accent)';
                if (d.percent > 80) color = '#ffeb3b'; // yellow
                if (d.percent > 90) color = '#ff5252'; // red

                html += `
                <div class="disk-row">
                    <div class="disk-info">
                        <span style="font-weight:bold;">${d.drive}</span>
                        <span style="font-size:0.8rem; opacity:0.7;">${d.free} Go libres</span>
                    </div>
                    <div class="disk-bar-bg">
                        <div class="disk-bar-fill" style="width:${d.percent}%; background:${color};"></div>
                    </div>
                </div>`;
            });
            container.innerHTML = `<div class="disk-list">${html}</div>`;
        } catch (e) {
            console.error(e);
            container.innerHTML = '<div class="error">Erreur</div>';
        }
    }

    function initQuickLaunch(widget, container) {
        if (!widget.data) widget.data = {};
        if (!widget.data.links) widget.data.links = [
            { name: 'Google', url: 'https://google.com', icon: '🔍' },
            { name: 'YouTube', url: 'https://youtube.com', icon: '📺' }
        ];

        const grid = container.querySelector('.quick-grid');
        const addBtn = container.querySelector('.quick-add-btn');

        const render = () => {
            grid.innerHTML = '';
            widget.data.links.forEach((link, index) => {
                const item = document.createElement('div');
                item.className = 'quick-item';
                item.innerHTML = `
                    <div class="quick-icon">${link.icon}</div>
                    <div class="quick-label">${link.name}</div>
                    <div class="quick-del">×</div>
                 `;

                item.onclick = () => {
                    window.electronAPI.launchApp(link.url);
                };

                item.querySelector('.quick-del').onclick = (e) => {
                    e.stopPropagation();
                    widget.data.links.splice(index, 1);
                    saveWidgets();
                    render();
                };

                grid.appendChild(item);
            });
        };

        addBtn.onclick = async (e) => {
            e.stopPropagation(); // prevent drag

            // Custom helper to show a modal
            const showPrompt = (title, placeholder) => {
                return new Promise(resolve => {
                    const backdrop = document.createElement('div');
                    backdrop.style.cssText = `
                        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                        background: rgba(0,0,0,0.7); z-index: 9999;
                        display: flex; align-items: center; justify-content: center;
                    `;

                    const box = document.createElement('div');
                    box.style.cssText = `
                        background: #1a1a1a; padding: 20px; border-radius: 12px;
                        border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                        width: 300px; display: flex; flex-direction: column; gap: 10px;
                    `;

                    const label = document.createElement('label');
                    label.textContent = title;
                    label.style.fontWeight = 'bold';

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.placeholder = placeholder || '';
                    input.style.cssText = `
                        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 6px; padding: 8px; color: white; width: 100%; box-sizing: border-box;
                    `;
                    input.focus();

                    const btnContainer = document.createElement('div');
                    btnContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 10px; justify-content: flex-end;';

                    const cancelBtn = document.createElement('button');
                    cancelBtn.textContent = 'Annuler';
                    cancelBtn.style.cssText = 'background: transparent; border: none; color: #aaa; cursor: pointer;';

                    const okBtn = document.createElement('button');
                    okBtn.textContent = 'OK';
                    okBtn.style.cssText = 'background: #646cff; border: none; color: white; padding: 6px 14px; border-radius: 6px; cursor: pointer;';

                    const close = (val) => {
                        document.body.removeChild(backdrop);
                        resolve(val);
                    };

                    cancelBtn.onclick = () => close(null);
                    okBtn.onclick = () => close(input.value);
                    input.onkeydown = (e) => {
                        if (e.key === 'Enter') close(input.value);
                        if (e.key === 'Escape') close(null);
                    };

                    btnContainer.appendChild(cancelBtn);
                    btnContainer.appendChild(okBtn);
                    box.appendChild(label);
                    box.appendChild(input);
                    box.appendChild(btnContainer);
                    backdrop.appendChild(box);
                    document.body.appendChild(backdrop);
                    input.focus();
                });
            };

            const name = await showPrompt("Nom du raccourci :", "Ex: Google");
            if (!name) return;
            const url = await showPrompt("URL ou Chemin d'accès :", "https://...");
            if (!url) return;
            const icon = await showPrompt("Emoji (ex: 🚀) :", "🚀") || '🔗';

            widget.data.links.push({ name, url, icon });
            saveWidgets();
            render();
        };

        render();
    }

    // --- Event Listeners ---
    editModeBtn.onclick = () => {
        isEditMode = !isEditMode;
        if (isEditMode) {
            libModal.classList.add('open');
            editModeBtn.style.color = 'var(--accent)';
        } else {
            libModal.classList.remove('open');
            editModeBtn.style.color = 'white';
        }
        renderWidgets();
    };

    // addWidgetBtn.onclick = () => libModal.classList.add('open'); // Removed
    closeLibBtn.onclick = () => {
        libModal.classList.remove('open');
        isEditMode = false; // Exit edit mode when closing drawer
        editModeBtn.style.color = 'white';
        renderWidgets();
    };

    libItems.forEach(item => {
        item.onclick = () => {
            const type = item.dataset.type;
            activeWidgets.push({
                id: 'w' + Date.now(),
                type: type,
                size: (type === 'media' ? 'large' : 'small')
            });
            saveWidgets();
            renderWidgets();
            libModal.classList.remove('open');
        };
    });

    // Initial Render
    renderWidgets();

    // Load Apps
    const mainGrid = document.getElementById('app-grid');
    mainGrid.innerHTML = '<div class="loading-apps" style="grid-column: 1/-1; text-align: center; padding: 2rem; opacity: 0.6;">Chargement des applications...</div>';

    try {
        // Add a small delay to ensure UI updates if scan is too fast? No, not needed.
        allApps = await window.electronAPI.getApps();
        renderAll();
    } catch (error) {
        console.error("Failed to load apps:", error);
        mainGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ff6b6b; padding: 2rem;">Erreur lors du chargement des applications.<br><small>${error.message}</small></div>`;
    }

    searchBar.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        renderAll(query);
    });

    document.addEventListener('click', () => {
        contextMenu.style.display = 'none';
    });

    // --- Helper Functions ---
    function isFavorite(appPath) { return favorites.includes(appPath); }

    function toggleFavorite(appPath) {
        if (isFavorite(appPath)) {
            favorites = favorites.filter(path => path !== appPath);
        } else {
            favorites.push(appPath);
        }
        localStorage.setItem('apphub_favorites', JSON.stringify(favorites));
        renderAll(searchBar.value.toLowerCase());
    }

    async function launchApp(appPath) {
        appStats[appPath] = (appStats[appPath] || 0) + 1;
        localStorage.setItem('apphub_stats', JSON.stringify(appStats));
        await window.electronAPI.launchApp(appPath);
        renderAll(searchBar.value.toLowerCase());
    }

    function updateSize(val) {
        document.documentElement.style.setProperty('--grid-item-min', `${val}px`);
        document.documentElement.style.setProperty('--icon-size', `${val * 0.4}px`);
    }

    // --- Settings Events ---
    // --- Settings Events ---
    // Toggle class instead of display for slide animation
    settingsBtn.onclick = () => {
        modal.classList.add('open');
    };

    closeModal.onclick = () => {
        modal.classList.remove('open');
    };

    // Save Button Logic
    document.getElementById('save-settings-btn').onclick = () => {
        modal.classList.remove('open');
        // Optional: show a small toast notification?
    };

    // Close when clicking outside (on the main app) - tricky with side panel overlay logic
    // Actually, with side panel replacing the modal, we usually want a backdrop. 
    // The CSS for .modal covers right side only. 
    // Let's rely on close button or add a backdrop div. 
    // For now, simpler: user clicks close button.
    window.onclick = (event) => {
        if (event.target == modal) modal.classList.remove('open');
    };

    function applyWallpaper(wallpaperData) {
        // Handle legacy string (base64) or new object
        let src, type;
        if (typeof wallpaperData === 'string') {
            // Legacy support
            src = wallpaperData;
            type = src.startsWith('data:video') ? 'video' : 'image';
        } else if (wallpaperData && wallpaperData.path) {
            src = wallpaperData.path;
            type = wallpaperData.type || 'image';
        } else {
            return;
        }

        if (type === 'video') {
            // Video
            videoBg.src = src;
            videoBg.style.display = 'block';
            document.body.style.backgroundImage = 'none';
            videoBg.play().catch(e => console.error("Video play error", e));
        } else {
            // Image
            videoBg.style.display = 'none';
            videoBg.src = '';
            document.body.style.setProperty('--bg-image', `url('${src}')`);
        }
    }

    if (prefs.wallpaper) applyWallpaper(prefs.wallpaper);

    changeWallpaperBtn.onclick = async () => {
        changeWallpaperBtn.textContent = "Chargement...";
        try {
            const result = await window.electronAPI.selectWallpaper();
            // result is { path: "file://...", type: "image"|"video" }
            if (result) {
                applyWallpaper(result);
                localStorage.setItem('apphub_wallpaper', JSON.stringify(result));
            }
        } catch (e) {
            console.error("Handler error", e);
            alert("Erreur lors du chargement: " + e.message);
        }
        changeWallpaperBtn.textContent = "Choisir une image/vidéo...";
    };

    resetWallpaperBtn.onclick = () => {
        document.body.style.removeProperty('--bg-image');
        videoBg.style.display = 'none';
        videoBg.src = '';
        localStorage.removeItem('apphub_wallpaper');
    };

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


    // --- Context Menu ---
    // --- Context Menu ---
    menuLaunch.addEventListener('click', async (e) => {
        // e.stopPropagation(); // Stop document click from hiding immediately? No, we want it to hide.
        if (currentRightClickedApp) {
            console.log("Launching from context menu:", currentRightClickedApp.path);
            await launchApp(currentRightClickedApp.path);
        }
    });

    menuToggleFav.addEventListener('click', (e) => {
        if (currentRightClickedApp) {
            toggleFavorite(currentRightClickedApp.path);
            contextMenu.style.display = 'none'; // Force hide after action
        }
    });

    // --- Drag & Drop ---
    function handleDragStart(e) {
        draggedItem = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.path);
        setTimeout(() => this.style.opacity = '0.4', 0);
    }
    function handleDragOver(e) {
        if (e.preventDefault) e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }
    function handleDragEnter(e) { this.classList.add('over'); }
    function handleDragLeave(e) { this.classList.remove('over'); }
    function handleDrop(e) {
        e.stopPropagation();
        if (draggedItem !== this) {
            const sourcePath = draggedItem.dataset.path;
            const targetPath = this.dataset.path;
            const sourceIndex = favorites.indexOf(sourcePath);
            const targetIndex = favorites.indexOf(targetPath);
            if (sourceIndex > -1 && targetIndex > -1) {
                favorites.splice(sourceIndex, 1);
                favorites.splice(targetIndex, 0, sourcePath);
                localStorage.setItem('apphub_favorites', JSON.stringify(favorites));
                renderAll(searchBar.value.toLowerCase());
            }
        }
        return false;
    }
    function handleDragEnd(e) {
        this.style.opacity = '1';
        [].forEach.call(document.querySelectorAll('.app-card'), function (col) {
            col.classList.remove('over');
        });
    }

    // --- Tabs & Sidebar Navigation ---
    const navBtns = document.querySelectorAll('.nav-btn');
    // let currentCategory = 'all'; // Removed (moved to top)

    navBtns.forEach(btn => {
        // Skip settings (id based)
        if (btn.id === 'settings-btn') return;

        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            renderAll(searchBar.value.toLowerCase());
        });
    });

    // --- Render ---
    // let renderedApps = []; // Moved to top

    function createAppCard(app) {
        const card = document.createElement('div');
        card.className = 'app-card';
        card.dataset.path = app.path;

        const getFallbackHtml = () => {
            const hue = app.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
            return `<div class="app-icon" style="background: hsl(${hue}, 70%, 60%)">${app.name.substring(0, 2).toUpperCase()}</div>`;
        };

        let iconHtml;
        if (app.icon) {
            iconHtml = `<img src="${app.icon}" class="app-icon-img" alt="${app.name}" draggable="false" onerror="this.onerror=null; this.parentNode.innerHTML='<div class=\\'app-icon\\' style=\\'background: hsl(${app.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360}, 70%, 60%)\\' >${app.name.substring(0, 2).toUpperCase()}</div>' " />`;
        } else {
            iconHtml = getFallbackHtml();
        }

        card.innerHTML = `${iconHtml}<div class="app-name">${app.name}</div>`;

        card.addEventListener('click', async () => {
            await launchApp(app.path);
        });

        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            currentRightClickedApp = app;
            menuToggleFav.textContent = isFavorite(app.path) ? "Retirer des favoris" : "Ajouter aux favoris ⭐";
            contextMenu.style.display = 'block';
            contextMenu.style.left = `${e.pageX}px`;
            contextMenu.style.top = `${e.pageY}px`;
        });
        return card;
    }

    function renderAll(query = '') {
        // Filter by Query
        let filtered = allApps.filter(app => app.name.toLowerCase().includes(query));

        // Filter by Category
        if (currentCategory === 'favorites') {
            filtered = filtered.filter(app => isFavorite(app.path));
        } else if (currentCategory === 'top') {
            // Sort by usage count
            filtered = filtered.filter(app => (appStats[app.path] || 0) > 0);
            filtered.sort((a, b) => (appStats[b.path] || 0) - (appStats[a.path] || 0));
        } else if (currentCategory === 'recent') {
            const recents = JSON.parse(localStorage.getItem('apphub_recents')) || [];
            // Filter apps that are in recents list
            filtered = filtered.filter(app => recents.includes(app.path));
            // Sort by index in recents
            filtered.sort((a, b) => recents.indexOf(a.path) - recents.indexOf(b.path));
        } else {
            // All: Favorites first then Alphabetical
            filtered.sort((a, b) => {
                const favA = isFavorite(a.path);
                const favB = isFavorite(b.path);
                if (favA && !favB) return -1;
                if (!favA && favB) return 1;
                return a.name.localeCompare(b.name);
            });
        }

        renderedApps = filtered; // Update for keyboard nav

        const mainGrid = document.getElementById('app-grid');
        mainGrid.innerHTML = '';

        // Removed old section headers hiding logic as HTML changed

        filtered.forEach((app, index) => {
            const card = createAppCard(app);
            card.dataset.index = index; // For keyboard nav
            mainGrid.appendChild(card);
        });

        // Empty State
        if (filtered.length === 0) {
            mainGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; opacity: 0.5; padding: 2rem;">Aucune application trouvée.</div>`;
        }
    }

    // --- Keyboard Navigation ---
    let focusIndex = -1;

    document.addEventListener('keydown', (e) => {
        // Ignore if modal open
        if (modal.classList.contains('open')) return;

        // Search Focus
        const activeTag = document.activeElement.tagName.toLowerCase();
        if (e.key.length === 1 &&
            document.activeElement !== searchBar &&
            activeTag !== 'input' &&
            activeTag !== 'textarea' &&
            !e.ctrlKey && !e.altKey && !e.metaKey) {
            searchBar.focus();
            return;
        }

        if (document.activeElement === searchBar) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                e.preventDefault();
                searchBar.blur();
                focusIndex = 0;
                updateFocus();
            }
            return;
        }

        const cols = getGridColumns();

        switch (e.key) {
            case 'ArrowRight':
                focusIndex = Math.min(focusIndex + 1, renderedApps.length - 1);
                updateFocus();
                e.preventDefault();
                break;
            case 'ArrowLeft':
                focusIndex = Math.max(focusIndex - 1, 0);
                updateFocus();
                e.preventDefault();
                break;
            case 'ArrowDown':
                focusIndex = Math.min(focusIndex + cols, renderedApps.length - 1);
                updateFocus();
                e.preventDefault();
                break;
            case 'ArrowUp':
                focusIndex = Math.max(focusIndex - cols, 0);
                updateFocus();
                e.preventDefault();
                break;
            case 'Enter':
                if (focusIndex >= 0 && renderedApps[focusIndex]) {
                    launchApp(renderedApps[focusIndex].path);
                }
                break;
        }
    });

    function getGridColumns() {
        const grid = document.getElementById('app-grid');
        if (!grid.children.length) return 1;
        const gridWidth = grid.offsetWidth;
        const cardWidth = grid.children[0].offsetWidth; // approximates
        // gap is 2rem = 32px roughly
        // CSS Grid logic is complex, but roughly:
        const colCount = Math.floor(gridWidth / (cardWidth + 24));
        return Math.max(1, colCount);
    }

    function updateFocus() {
        const cards = document.querySelectorAll('.app-card');
        cards.forEach(c => c.classList.remove('focused'));

        if (focusIndex >= 0 && cards[focusIndex]) {
            const card = cards[focusIndex];
            card.classList.add('focused');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
});
