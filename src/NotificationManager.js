export class NotificationManager {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification-toast ${type}`;

        // Icon based on type
        let icon = '🔔';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
        if (type === 'warning') icon = '⚠️';

        notification.innerHTML = `
            <div class="notif-icon">${icon}</div>
            <div class="notif-content">${message}</div>
            <div class="notif-progress"></div>
        `;

        this.container.appendChild(notification);

        // Animate In
        requestAnimationFrame(() => {
            notification.classList.add('visible');
            notification.querySelector('.notif-progress').style.transitionDuration = `${duration}ms`;
            notification.querySelector('.notif-progress').style.width = '0%';
        });

        // Auto Remove
        setTimeout(() => {
            this.remove(notification);
        }, duration);

        // Click to dismiss
        notification.onclick = () => this.remove(notification);
    }

    remove(notification) {
        notification.classList.remove('visible');
        notification.addEventListener('transitionend', () => {
            notification.remove();
        });
    }
}
