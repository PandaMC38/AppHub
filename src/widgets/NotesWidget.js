import { Widget } from './Widget.js';

export class NotesWidget extends Widget {
    renderContent(container) {
        container.classList.add('widget-notes');
        const textarea = document.createElement('textarea');
        textarea.placeholder = "Ecrivez vos notes ici...";
        textarea.value = this.data?.text || '';

        textarea.addEventListener('input', () => {
            this.data.text = textarea.value;
            this.manager.save();
        });

        container.appendChild(textarea);
    }
}
