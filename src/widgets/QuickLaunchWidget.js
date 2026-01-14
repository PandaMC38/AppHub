import { Widget } from './Widget.js';

export class QuickLaunchWidget extends Widget {
    renderContent(container) {
        container.classList.add('widget-quicklaunch');
        container.innerHTML = `<div class="quick-grid"></div><button class="quick-add-btn">+</button>`;
        this.initQuickLaunch(container);
    }

    initQuickLaunch(container) {
        if (!this.data.links) this.data.links = [
            { name: 'Google', url: 'https://google.com', icon: '🔍' },
            { name: 'YouTube', url: 'https://youtube.com', icon: '📺' }
        ];

        const grid = container.querySelector('.quick-grid');
        const addBtn = container.querySelector('.quick-add-btn');

        const renderList = () => {
            grid.innerHTML = '';
            this.data.links.forEach((link, index) => {
                const item = document.createElement('div');
                item.className = 'quick-item';
                item.innerHTML = `
                    <div class="quick-icon">${link.icon}</div>
                    <div class="quick-label">${link.name}</div>
                    <div class="quick-del">×</div>
                 `;

                item.onclick = () => {
                    window.electronAPI.launchApp(link.url);
                };

                item.querySelector('.quick-del').onclick = (e) => {
                    e.stopPropagation();
                    this.data.links.splice(index, 1);
                    this.manager.save();
                    renderList();
                };

                grid.appendChild(item);
            });
        };

        addBtn.onclick = async (e) => {
            e.stopPropagation(); // prevent drag

            // Re-using the logic from original main.js but implemented here
            const name = await this.showPrompt("Nom du raccourci :", "Ex: Google");
            if (!name) return;
            const url = await this.showPrompt("URL ou Chemin d'accès :", "https://...");
            if (!url) return;
            const icon = await this.showPrompt("Emoji (ex: 🚀) :", "🚀") || '🔗';

            this.data.links.push({ name, url, icon });
            this.manager.save();
            renderList();
        };

        renderList();
    }

    showPrompt(title, placeholder) {
        return new Promise(resolve => {
            const backdrop = document.createElement('div');
            backdrop.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.7); z-index: 9999;
                display: flex; align-items: center; justify-content: center;
            `;

            const box = document.createElement('div');
            box.style.cssText = `
                background: #1a1a1a; padding: 20px; border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                width: 300px; display: flex; flex-direction: column; gap: 10px;
            `;

            const label = document.createElement('label');
            label.textContent = title;
            label.style.fontWeight = 'bold';

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = placeholder || '';
            input.style.cssText = `
                background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                border-radius: 6px; padding: 8px; color: white; width: 100%; box-sizing: border-box;
            `;

            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 10px; justify-content: flex-end;';

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Annuler';
            cancelBtn.style.cssText = 'background: transparent; border: none; color: #aaa; cursor: pointer;';

            const okBtn = document.createElement('button');
            okBtn.textContent = 'OK';
            okBtn.style.cssText = 'background: #646cff; border: none; color: white; padding: 6px 14px; border-radius: 6px; cursor: pointer;';

            const close = (val) => {
                document.body.removeChild(backdrop);
                resolve(val);
            };

            cancelBtn.onclick = () => close(null);
            okBtn.onclick = () => close(input.value);
            input.onkeydown = (e) => {
                if (e.key === 'Enter') close(input.value);
                if (e.key === 'Escape') close(null);
            };

            btnContainer.appendChild(cancelBtn);
            btnContainer.appendChild(okBtn);
            box.appendChild(label);
            box.appendChild(input);
            box.appendChild(btnContainer);
            backdrop.appendChild(box);
            document.body.appendChild(backdrop);
            input.focus();
        });
    }
}
