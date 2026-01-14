import { Widget } from './Widget.js';

export class TodoWidget extends Widget {
    renderContent(container) {
        container.classList.add('widget-todo');
        container.innerHTML = `
            <div class="todo-input-container">
                <input type="text" class="todo-input" placeholder="Nouvelle tâche...">
                <button class="todo-add-btn">+</button>
            </div>
            <ul class="todo-list"></ul>
        `;
        this.initTodo(container);
    }

    initTodo(container) {
        const input = container.querySelector('.todo-input');
        const addBtn = container.querySelector('.todo-add-btn');
        const list = container.querySelector('.todo-list');

        if (!this.data.tasks) this.data.tasks = [];

        const renderList = () => {
            list.innerHTML = '';
            this.data.tasks.forEach((task, index) => {
                const li = document.createElement('li');
                li.className = task.done ? 'done' : '';
                li.innerHTML = `
                    <span class="todo-text">${task.text}</span>
                    <button class="todo-del-btn">×</button>
                `;

                // Toggle Done
                li.querySelector('.todo-text').onclick = () => {
                    task.done = !task.done;
                    this.manager.save();
                    renderList();
                };

                // Delete
                li.querySelector('.todo-del-btn').onclick = (e) => {
                    e.stopPropagation();
                    this.data.tasks.splice(index, 1);
                    this.manager.save();
                    renderList();
                };

                list.appendChild(li);
            });
        };

        const addTask = () => {
            const text = input.value.trim();
            if (text) {
                this.data.tasks.push({ text, done: false });
                input.value = '';
                this.manager.save();
                renderList();
            }
        };

        addBtn.onclick = addTask;
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });

        renderList();
    }
}
