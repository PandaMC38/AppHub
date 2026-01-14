import { Widget } from './Widget.js';

export class MediaWidget extends Widget {
    constructor(id, type, size, data, manager) {
        super(id, type, size, data, manager);
        this.currentInfo = null;
        this.unsubscribe = null;
    }

    renderContent(container) {
        // Basic Structure
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '1.5rem';

        container.innerHTML = `
            <div id="media-cover-${this.id}" class="media-icon" style="
                width: 80px; 
                height: 80px; 
                background: rgba(255,255,255,0.1); 
                border-radius: 12px; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                font-size: 2.5rem;
                background-size: cover;
                background-position: center;
                flex-shrink: 0;
            ">🎵</div>
            
            <div class="media-info" style="flex:1; min-width: 0;">
                <div id="media-title-${this.id}" style="font-weight:700; font-size:1.1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">En attente...</div>
                <div id="media-artist-${this.id}" style="opacity:0.6; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Lancez de la musique !</div>
            </div>
            
            <div class="media-controls" style="display:flex; gap:0.5rem;">
                <button id="btn-prev-${this.id}" class="media-btn">⏮️</button>
                <button id="btn-play-${this.id}" class="media-btn" style="font-size:1.8rem;">⏯️</button>
                <button id="btn-next-${this.id}" class="media-btn">⏭️</button>
            </div>
        `;

        // Style helper
        const style = document.createElement('style');
        style.textContent = `
            .media-btn {
                background: rgba(255,255,255,0.1);
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                color: white;
                font-size: 1.2rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: 0.2s;
            }
            .media-btn:hover {
                background: var(--accent);
                transform: scale(1.1);
            }
        `;
        container.appendChild(style);

        // Bind Events
        container.querySelector(`#btn-prev-${this.id}`).onclick = () => window.electronAPI.controlMedia('prev');
        container.querySelector(`#btn-play-${this.id}`).onclick = () => window.electronAPI.controlMedia('playpause');
        container.querySelector(`#btn-next-${this.id}`).onclick = () => window.electronAPI.controlMedia('next');

        // Start listening
        this.startListening();
    }

    startListening() {
        // Prevent double subscription
        if (this.unsubscribe) return;

        // Callback handler
        window.electronAPI.onMediaUpdate((info) => {
            if (!this.element) return; // Widget removed
            this.updateUI(info);
        });

        // Initial Trigger (backend might not send immediately if polling)
        window.electronAPI.controlMedia('status');
    }

    updateUI(info) {
        if (!info || info.status === 'Closed') {
            this.setEmptyState();
            return;
        }

        const titleEl = this.element.querySelector(`#media-title-${this.id}`);
        const artistEl = this.element.querySelector(`#media-artist-${this.id}`);
        const coverEl = this.element.querySelector(`#media-cover-${this.id}`);
        const playBtn = this.element.querySelector(`#btn-play-${this.id}`);

        if (titleEl) titleEl.textContent = info.title || "Inconnu";
        if (artistEl) artistEl.textContent = info.artist || "Inconnu";

        if (playBtn) {
            playBtn.textContent = (info.status === 'Playing') ? '⏸️' : '▶️';
        }

        if (coverEl) {
            if (info.thumbnail) {
                // If the thumbnail is base64
                coverEl.style.backgroundImage = `url('data:image/png;base64,${info.thumbnail}')`;
                coverEl.textContent = '';
            } else {
                coverEl.style.backgroundImage = 'none';
                coverEl.textContent = '🎵';
            }
        }
    }

    setEmptyState() {
        const titleEl = this.element.querySelector(`#media-title-${this.id}`);
        const artistEl = this.element.querySelector(`#media-artist-${this.id}`);
        const coverEl = this.element.querySelector(`#media-cover-${this.id}`);

        if (titleEl) titleEl.textContent = "En attente...";
        if (artistEl) artistEl.textContent = "Lancez de la musique !";
        if (coverEl) {
            coverEl.style.backgroundImage = 'none';
            coverEl.textContent = '🎵';
        }
    }

    onRemove() {
        // Cleanup IPC listeners if possible? 
        // Electron ipcRenderer.on listeners are persistent unless removed.
        // Usually we need removeListener, but contextBridge limitations make it hard to pass the exact function reference back.
        // For now, we rely on the check `if (!this.element) return;` in the callback to stop logic execution.
    }
}
