import { Widget } from './Widget.js';

export class CalendarWidget extends Widget {
    constructor(id, x, y, size = 'size-2x2', data = {}, onDelete) {
        super(id, x, y, size, data, onDelete);
        this.type = 'calendar';
        this.title = 'Agenda';
        this.icon = '📅';
        this.events = [];
        this.icsUrl = data.icsUrl || '';

        // Auto-refresh every 30 mins
        this.refreshInterval = setInterval(() => this.loadEvents(), 30 * 60 * 1000);
    }

    renderContent(container) {
        container.innerHTML = '';
        container.className = 'widget-content calendar-content';

        if (!this.icsUrl) {
            this.renderConfig(container);
        } else {
            this.renderEvents(container);
            // Initial load if empty
            if (this.events.length === 0) this.loadEvents();
        }
    }

    renderConfig(container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'calendar-config';
        wrapper.innerHTML = `
            <div class="cal-placeholder">
                <div class="cal-icon-large">📅</div>
                <p>Collez votre lien iCal (ICS) secrète ici :</p>
                <input type="text" placeholder="https://calendar.google.com/..." class="cal-input">
                <button class="cal-save-btn">Valider</button>
                <p class="cal-help">Google Calendar > Paramètres > Intégrer > "Adresse secrète au format iCal"</p>
            </div>
        `;

        const input = wrapper.querySelector('input');
        const btn = wrapper.querySelector('button');

        btn.onclick = () => {
            const url = input.value.trim();
            if (url) {
                this.icsUrl = url;
                this.save();
                this.renderContent(container);
                this.loadEvents();
            }
        };

        container.appendChild(wrapper);
    }

    renderEvents(container) {
        if (this.events.length === 0) {
            container.innerHTML = `
                <div class="cal-loading">
                    <div class="cal-spinner"></div>
                    <p>Chargement des événements...</p>
                    <button class="cal-config-btn" title="Changer l'URL">⚙️</button>
                </div>
            `;
        } else {
            const list = document.createElement('div');
            list.className = 'event-list';

            // Config button overlay
            const configBtn = document.createElement('button');
            configBtn.className = 'cal-config-btn-overlay';
            configBtn.textContent = '⚙️';
            configBtn.title = "Changer l'URL du calendrier";
            configBtn.onclick = () => {
                if (confirm("Changer l'URL du calendrier ?")) {
                    this.icsUrl = '';
                    this.events = [];
                    this.save();
                    this.renderContent(this.element.querySelector('.widget-content'));
                }
            };
            container.appendChild(configBtn);

            this.events.forEach(ev => {
                const dateObj = new Date(ev.start);
                const day = dateObj.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
                const time = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                const item = document.createElement('div');
                item.className = 'event-item';
                item.innerHTML = `
                    <div class="event-date">
                        <span class="ev-day">${day}</span>
                        <span class="ev-time">${time}</span>
                    </div>
                    <div class="event-details">
                        <div class="ev-title">${ev.title}</div>
                        ${ev.location ? `<div class="ev-loc">📍 ${ev.location}</div>` : ''}
                    </div>
                `;
                list.appendChild(item);
            });
            container.appendChild(list);
        }
    }

    async loadEvents() {
        if (!this.icsUrl) return;

        try {
            const events = await window.electronAPI.getCalendarEvents(this.icsUrl);
            this.events = events || [];

            // Re-render if widget is still attached
            const container = this.element.querySelector('.widget-content');
            if (container && this.icsUrl) { // Check icsUrl again to ensure we didn't reset in meantime
                // If empty after fetch
                if (this.events.length === 0) {
                    container.innerHTML = `<div class="cal-empty">Pas d'événements prévus 🎉<br><button class="cal-reset-link" style="margin-top:10px;background:var(--glass-bg);border:1px solid var(--glass-border);color:white;cursor:pointer;padding:5px 10px;border-radius:4px;">Changer lien</button></div>`;
                    const btn = container.querySelector('.cal-reset-link');
                    if (btn) btn.onclick = () => { this.icsUrl = ''; this.save(); this.renderContent(container); };
                } else {
                    // Clear loading state and render real events
                    container.innerHTML = '';
                    this.renderEvents(container);
                }
            }
        } catch (e) {
            console.error("Failed to load events", e);
            const container = this.element.querySelector('.widget-content');
            if (container) {
                container.innerHTML = `<div class="cal-error">Erreur de chargement <br> <small>Vérifiez l'URL</small></div>`;
                setTimeout(() => {
                    this.icsUrl = '';
                    this.save();
                    this.renderContent(container);
                }, 3000);
            }
        }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            data: { icsUrl: this.icsUrl }
        };
    }
}
