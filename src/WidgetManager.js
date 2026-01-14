import { ClockWidget } from './widgets/ClockWidget.js';
import { WeatherWidget } from './widgets/WeatherWidget.js';
import { SystemWidget } from './widgets/SystemWidget.js';
import { DiskWidget } from './widgets/DiskWidget.js';
import { NotesWidget } from './widgets/NotesWidget.js';
import { TodoWidget } from './widgets/TodoWidget.js';
import { QuickLaunchWidget } from './widgets/QuickLaunchWidget.js';
import { CalendarWidget } from './widgets/CalendarWidget.js';
import { CalculatorWidget } from './widgets/CalculatorWidget.js';
import { MediaWidget } from './widgets/MediaWidget.js';

export class WidgetManager {
    constructor(gridElement) {
        this.grid = gridElement;
        this.widgets = [];
        this.activeWidgetInstances = new Map(); // id -> instance
        this.isEditMode = false;

        // Initial Load
        this.load();

        // Setup Sortable if available globally
        this.initSortable();
    }

    load() {
        try {
            const data = localStorage.getItem('apphub_widgets');
            this.widgets = data ? JSON.parse(data) : [
                { id: 'w1', type: 'time', size: 'small' },
                { type: 'disk', label: 'Espace Disque', icon: '💾', defaultSize: 'size-2x1' },
                { type: 'quick-launch', label: 'Raccourcis', icon: '🚀', defaultSize: 'size-2x1' },
                { type: 'calendar', label: 'Agenda', icon: '📅', defaultSize: 'size-2x2' }
            ];
        } catch (e) {
            this.widgets = [];
        }
    }

    save() {
        // We save the configuration of widgets (id, type, size, data)
        const toSave = this.widgets.map(w => {
            const instance = this.activeWidgetInstances.get(w.id);
            if (instance) {
                // Update data from instance if needed (though instance.data IS the ref usually)
                return {
                    id: w.id,
                    type: w.type,
                    size: instance.size, // Update with new size from instance
                    data: w.data
                };
            }

            return w;
        });
        this.widgets = toSave;
        localStorage.setItem('apphub_widgets', JSON.stringify(toSave));
    }

    createInstance(config) {
        const { id, type, size, data } = config;
        switch (type) {
            case 'time': return new ClockWidget(id, type, size, data, this);
            case 'weather': return new WeatherWidget(id, type, size, data, this);
            case 'system': return new SystemWidget(id, type, size, data, this);
            case 'disk': return new DiskWidget(id, type, size, data, this);
            case 'notes': return new NotesWidget(id, type, size, data, this);
            case 'todo': return new TodoWidget(id, type, size, data, this);
            case 'quicklaunch': return new QuickLaunchWidget(id, type, size, data, this);
            case 'calendar': return new CalendarWidget(id, type, size, data, this);
            case 'calculator': return new CalculatorWidget(id, type, size, data, this);
            case 'media': return new MediaWidget(id, type, size, data, this);
            default: return null;
        }
    }

    render() {
        // Clear Grid
        this.grid.innerHTML = '';

        // Cleanup old instances
        this.activeWidgetInstances.forEach(w => w.onRemove && w.onRemove());
        this.activeWidgetInstances.clear();

        this.widgets.forEach(config => {
            const instance = this.createInstance(config);
            if (instance) {
                this.activeWidgetInstances.set(config.id, instance);
                const el = instance.render();
                this.grid.appendChild(el);
            }
        });

        this.updateEditMode();
    }

    addWidget(type) {
        const newWidget = {
            id: 'w' + Date.now(),
            type: type,
            size: (type === 'media' ? 'large' : 'small'),
            data: {}
        };
        this.widgets.push(newWidget);
        this.save();
        this.render();
    }

    removeWidget(id) {
        this.widgets = this.widgets.filter(w => w.id !== id);
        this.save();
        this.render();
    }

    toggleEditMode(force) {
        this.isEditMode = (force !== undefined) ? force : !this.isEditMode;
        this.updateEditMode();
        return this.isEditMode;
    }

    updateEditMode() {
        if (this.isEditMode) this.grid.classList.add('edit-mode');
        else this.grid.classList.remove('edit-mode');
    }

    initSortable() {
        if (typeof Sortable !== 'undefined') {
            new Sortable(this.grid, {
                animation: 150,
                handle: '.widget', // In edit mode usually, but here always draggable by body
                disabled: false,
                ghostClass: 'sortable-ghost',
                onEnd: (evt) => {
                    const newOrderIds = Array.from(this.grid.children).map(el => el.dataset.id);
                    const reordered = [];
                    newOrderIds.forEach(id => {
                        const w = this.widgets.find(x => x.id === id);
                        if (w) reordered.push(w);
                    });
                    this.widgets = reordered;
                    this.save();
                }
            });
        }
    }
}
