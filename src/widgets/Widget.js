export class Widget {
    constructor(id, type, size, data = {}, manager) {
        this.id = id;
        this.type = type;

        // Migrate legacy sizes
        if (size === 'small') size = '1x1';
        else if (size === 'large') size = '2x1';
        else if (size === 'row') size = '4x1';

        this.size = size || '1x1';
        this.data = data;
        this.manager = manager;
        this.element = null;

        // Default allowed sizes (can be overridden by subclasses)
        this.allowedSizes = ['1x1', '2x1', '1x2', '2x2', '4x1', '4x2'];
    }

    render() {
        // Create container
        const el = document.createElement('div');
        el.dataset.id = this.id;
        el.dataset.type = this.type;
        // Use new size classes
        el.className = `widget size-${this.size}`;
        if (this.type === 'media') el.classList.add('row-layout');

        // Controls
        const controls = document.createElement('div');
        controls.className = 'widget-controls';
        controls.innerHTML = `
            <button class="widget-btn btn-resize" title="Taille (${this.size})">📐</button>
            <button class="widget-btn btn-delete" title="Supprimer">✖️</button>
        `;

        // Event Listeners for Controls
        controls.querySelector('.btn-delete').onclick = (e) => {
            e.stopPropagation();
            this.manager.removeWidget(this.id);
        };

        // Toggle Resize Menu
        controls.querySelector('.btn-resize').onclick = (e) => {
            e.stopPropagation();
            this.toggleResizeMenu(e.currentTarget);
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

    toggleResizeMenu(btn) {
        // Remove existing menu if any
        const existing = document.querySelector('.resize-menu');
        if (existing) {
            existing.remove();
            // If we clicked the same button, just toggle off
            if (existing.dataset.widgetId === this.id) return;
        }

        const menu = document.createElement('div');
        menu.className = 'resize-menu';
        menu.dataset.widgetId = this.id;

        // Position helper
        // We append to body to avoid clipping issues with overflow:hidden on widgets
        document.body.appendChild(menu);

        // Populate sizes
        this.allowedSizes.forEach(size => {
            const item = document.createElement('button');
            item.className = `resize-menu-item ${this.size === size ? 'active' : ''}`;
            item.innerHTML = `<span>${size}</span>`;
            item.onclick = (e) => {
                e.stopPropagation();
                this.setSize(size);
                menu.remove();
            };
            menu.appendChild(item);
        });

        // Compute Position relative to button
        const rect = btn.getBoundingClientRect();
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left}px`;

        // Close on click outside
        const closeHandler = (e) => {
            if (!menu.contains(e.target) && e.target !== btn) {
                menu.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    }

    setSize(newSize) {
        this.size = newSize;
        this.manager.save();
        this.manager.render();
    }

    renderContent(container) {
        // Should be overridden by subclasses
        container.innerHTML = 'Widget Content';
    }

    onRemove() {
        // Cleanup timers etc.
    }
}
