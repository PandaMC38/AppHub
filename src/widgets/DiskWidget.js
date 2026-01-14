import { Widget } from './Widget.js';

export class DiskWidget extends Widget {
    renderContent(container) {
        // Must add class for styling
        container.classList.add('widget-disk');
        container.innerHTML = `<div class="disk-loading">Chargement...</div>`;
        this.initDiskSpace(container);
    }

    async initDiskSpace(container) {
        try {
            const disks = await window.electronAPI.getDiskSpace();
            if (!disks || disks.length === 0) {
                container.innerHTML = '<div style="opacity:0.6; font-size:0.9rem;">Aucun disque trouvé</div>';
                return;
            }

            let html = '';
            disks.forEach(d => {
                let color = 'var(--accent)';
                if (d.percent > 80) color = '#ffeb3b';
                if (d.percent > 90) color = '#ff5252';

                html += `
                <div class="disk-row">
                    <div class="disk-info">
                        <span style="font-weight:bold;">${d.drive}</span>
                        <span style="font-size:0.8rem; opacity:0.7;">${d.free} Go libres</span>
                    </div>
                    <div class="disk-bar-bg">
                        <div class="disk-bar-fill" style="width:${d.percent}%; background:${color};"></div>
                    </div>
                </div>`;
            });
            container.innerHTML = `<div class="disk-list">${html}</div>`;
        } catch (e) {
            console.error(e);
            container.innerHTML = '<div class="error">Erreur</div>';
        }
    }
}
