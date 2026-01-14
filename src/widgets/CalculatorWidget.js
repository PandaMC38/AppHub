import { Widget } from './Widget.js';

export class CalculatorWidget extends Widget {
    renderContent(container) {
        // Need to ensure the CSS handles the grid layout for calculator
        container.innerHTML = `
            <div class="calc-display" id="calc-display-${this.id}">0</div>
            <div class="calc-grid">
                <button class="calc-btn op">C</button>
                <button class="calc-btn op">/</button>
                <button class="calc-btn op">*</button>
                <button class="calc-btn op">DEL</button>
                <button class="calc-btn">7</button>
                <button class="calc-btn">8</button>
                <button class="calc-btn">9</button>
                <button class="calc-btn op">-</button>
                <button class="calc-btn">4</button>
                <button class="calc-btn">5</button>
                <button class="calc-btn">6</button>
                <button class="calc-btn op">+</button>
                <button class="calc-btn">1</button>
                <button class="calc-btn">2</button>
                <button class="calc-btn">3</button>
                <button class="calc-btn eq" style="grid-row: span 2;">=</button>
                <button class="calc-btn zero" style="grid-column: span 2;">0</button>
                <button class="calc-btn">.</button>
            </div>`;
        this.initCalculator(container);
    }

    initCalculator(container) {
        const display = container.querySelector(`#calc-display-${this.id}`);
        const buttons = container.querySelectorAll('.calc-btn');
        let current = '';

        buttons.forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const val = btn.textContent;

                if (val === 'C') {
                    current = '';
                } else if (val === 'DEL') {
                    current = current.toString().slice(0, -1);
                } else if (val === '=') {
                    try {
                        // eslint-disable-next-line no-new-func
                        current = Function('"use strict";return (' + current + ')')();
                    } catch {
                        current = 'Error';
                    }
                } else {
                    current += val;
                }
                display.textContent = current || '0';
            };
        });
    }
}
