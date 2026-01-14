import { Widget } from './Widget.js';

export class ClockWidget extends Widget {
    constructor(id, type, size, data, manager) {
        super(id, type, size, data, manager);
        this.interval = null;
    }

    renderContent(container) {
        container.innerHTML = `
            <div id="clock-${this.id}" style="font-size: 2.5rem; font-weight:800; line-height:1;">--:--</div>
            <div id="date-${this.id}" style="opacity:0.6;">...</div>
        `;
        this.startClock();
    }

    startClock() {
        const update = () => {
            const elC = this.element?.querySelector(`#clock-${this.id}`);
            const elD = this.element?.querySelector(`#date-${this.id}`);
            if (!elC) return;
            const now = new Date();
            elC.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            elD.textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
        };
        update(); // Immediate
        this.interval = setInterval(update, 1000);
    }

    onRemove() {
        if (this.interval) clearInterval(this.interval);
    }
}
