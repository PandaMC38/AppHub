export class Widget {
    constructor(id, type, size, data = {}, manager) {
        this.id = id;
        this.type = type;
        this.size = size || 'small';
        this.data = data;
        this.manager = manager; // Reference to WidgetManager to trigger saves
        this.element = null;
    }

    render() {
        // Create container
        const el = document.createElement('div');
        el.dataset.id = this.id;
        el.dataset.type = this.type;
        el.className = `widget span-${this.getSpanClass()}`;
        if (this.type === 'media') el.classList.add('row-layout');

        // Controls
        const controls = document.createElement('div');
        controls.className = 'widget-controls';
        controls.innerHTML = `
            <button class="widget-btn btn-resize" title="Taille">📐</button>
            <button class="widget-btn btn-delete" title="Supprimer">✖️</button>
        `;

        // Event Listeners for Controls
        controls.querySelector('.btn-delete').onclick = (e) => {
            e.stopPropagation();
            this.manager.removeWidget(this.id);
        };

        controls.querySelector('.btn-resize').onclick = (e) => {
            e.stopPropagation();
            this.cycleSize();
        };

        el.appendChild(controls);

        // Content
        const content = document.createElement('div');
        content.className = 'widget-content';
        this.renderContent(content);
        el.appendChild(content);

        this.element = el;
        return el;
    }

    getSpanClass() {
        if (this.size === 'large') return '2';
        if (this.size === 'row') return 'row';
        return '1';
    }

    cycleSize() {
        const sizes = ['small', 'large', 'row'];
        let currentIdx = sizes.indexOf(this.size);
        this.size = sizes[(currentIdx + 1) % sizes.length];
        this.manager.save();
        this.manager.render(); // Re-render logic handled by manager usually
    }

    renderContent(container) {
        // Should be overridden by subclasses
        container.innerHTML = 'Widget Content';
    }

    onRemove() {
        // Cleanup timers etc.
    }
}
