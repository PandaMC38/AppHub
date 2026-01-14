import { Widget } from './Widget.js';

export class WeatherWidget extends Widget {
    renderContent(container) {
        container.innerHTML = `
            <div class="widget-icon" style="font-size:2.5rem;">⛅</div>
            <div class="weather-info">
                <div id="weather-temp-${this.id}" style="font-size:1.5rem; font-weight:bold;">--°C</div>
                <div id="weather-desc-${this.id}" style="opacity:0.7;">Chargement...</div>
            </div>
        `;
        container.style.textAlign = 'center';
        this.updateWeather();
    }

    async updateWeather() {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current_weather=true`);
            const data = await response.json();
            const elT = this.element?.querySelector(`#weather-temp-${this.id}`);
            const elD = this.element?.querySelector(`#weather-desc-${this.id}`);
            if (elT) {
                elT.textContent = `${Math.round(data.current_weather.temperature)}°C`;
                elD.textContent = "Paris";
            }
        } catch (e) {
            console.error(e);
        }
    }
}
