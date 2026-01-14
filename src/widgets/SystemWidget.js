import { Widget } from './Widget.js';

export class SystemWidget extends Widget {
    constructor(id, type, size, data, manager) {
        super(id, type, size, data, manager);
        this.interval = null;
    }

    renderContent(container) {
        container.innerHTML = `
            <div class="sys-label" style="text-transform:uppercase; letter-spacing:2px; opacity:0.5;">RAM</div>
            <div class="sys-value" id="ram-${this.id}" style="font-size:2.5rem; font-weight:800; color:var(--accent);">--%</div>
        `;
        this.startSystemStats();
    }

    async startSystemStats() {
        const update = async () => {
            const el = this.element?.querySelector(`#ram-${this.id}`);
            if (!el) return;
            try {
                const stats = await window.electronAPI.getSystemStats();
                el.textContent = `${stats.memUsage}%`;
            } catch (e) { }
        };
        update();
        this.interval = setInterval(update, 3000);
    }

    onRemove() {
        if (this.interval) clearInterval(this.interval);
    }
}
