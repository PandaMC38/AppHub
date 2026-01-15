export class NotificationManager {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 3000, action = null) {
        const notification = document.createElement('div');
        notification.className = `notification-toast ${type}`;

        // Icon based on type
        let icon = '🔔';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
        if (type === 'warning') icon = '⚠️';

        let actionHtml = '';
        if (action && action.label) {
            actionHtml = `<button class="notif-action-btn">${action.label}</button>`;
        }

        notification.innerHTML = `
            <div class="notif-content-wrapper" style="display:flex; align-items:center; gap: 10px;">
                <div class="notif-icon">${icon}</div>
                <div class="notif-content">${message}</div>
                ${actionHtml}
            </div>
            <div class="notif-progress"></div>
        `;

        this.container.appendChild(notification);

        if (action && action.callback) {
            const btn = notification.querySelector('.notif-action-btn');
            if (btn) {
                btn.onclick = (e) => {
                    e.stopPropagation(); // Prevent dismissing toast immediately if we want
                    action.callback();
                    this.remove(notification);
                };
            }
        }

        // Animate In
        requestAnimationFrame(() => {
            notification.classList.add('visible');
            const progress = notification.querySelector('.notif-progress');
            if (progress) {
                progress.style.transitionDuration = `${duration}ms`;
                progress.style.width = '0%';
            }
        });

        // Auto Remove
        const timeoutId = setTimeout(() => {
            this.remove(notification);
        }, duration);

        // Click to dismiss layout (unless clicked button)
        notification.onclick = (e) => {
            if (!e.target.classList.contains('notif-action-btn')) {
                clearTimeout(timeoutId);
                this.remove(notification);
            }
        };
    }

    remove(notification) {
        notification.classList.remove('visible');
        notification.addEventListener('transitionend', () => {
            notification.remove();
        });
    }
}
