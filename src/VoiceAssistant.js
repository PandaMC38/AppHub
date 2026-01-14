
export class VoiceAssistant {
    constructor(spotlightManager) {
        this.spotlight = spotlightManager;
        this.recognition = null;
        this.isListening = false;
        this.synthesis = window.speechSynthesis;

        // Command Keywords
        this.commands = {
            launch: ['lance', 'ouvre', 'démarrer', 'démarre', 'open', 'start'],
            media: ['musique', 'pause', 'play', 'stop', 'suivant', 'précédent', 'next'],
            time: ['heure', 'time', 'il est quelle heure'],
            greeting: ['bonjour', 'salut', 'hello', 'hey'],
            system: ['éteindre', 'redémarrer', 'veille']
        };

        this.init();
    }

    init() {
        if (!('webkitSpeechRecognition' in window)) {
            console.error("Speech Recognition not supported.");
            return;
        }

        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = true; // Keep listening
        this.recognition.interimResults = false;
        this.recognition.lang = 'fr-FR';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateUI(true);
            console.log("Jarvis: Listening...");
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateUI(false);
            if (this.isEnabled) {
                console.log("Jarvis: Autorestart...");
                this.recognition.start();
            } else {
                console.log("Jarvis: Disabled.");
                // Make sure UI shows disabled
                this.updateUI(false);
            }
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
            console.log("Jarvis heard:", transcript);
            this.processCommand(transcript);
        };

        // Create UI
        this.createUI();

        // Start immediately
        try {
            this.recognition.start();
        } catch (e) { console.log("Auto-start blocked, waiting for interaction"); }
    }

    createUI() {
        const container = document.createElement('div');
        container.id = 'voice-indicator';
        container.title = 'Cliquer pour désactiver/activer Jarvis';
        container.innerHTML = `
            <div class="voice-wave"></div>
            <div class="voice-icon">🎙️</div>
        `;
        document.body.appendChild(container);

        container.onclick = () => {
            this.toggle();
        };
    }

    toggle() {
        this.isEnabled = !this.isEnabled;
        const container = document.getElementById('voice-indicator');

        if (this.isEnabled) {
            this.speak("Jarvis activé");
            try { this.recognition.start(); } catch (e) { }
            container.classList.remove('disabled');
        } else {
            this.speak("Jarvis désactivé");
            this.recognition.stop();
            container.classList.add('disabled');
        }
    }

    updateUI(listening) {
        const el = document.getElementById('voice-indicator');
        if (el) {
            if (listening) el.classList.add('listening');
            else el.classList.remove('listening');

            // Sync disabled state visual
            if (!this.isEnabled) el.classList.add('disabled');
            else el.classList.remove('disabled');
        }
    }

    speak(text) {
        if (this.synthesis.speaking) this.synthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        utterance.rate = 1.1;
        // Try to pick a decent voice
        // const voices = this.synthesis.getVoices();
        // utterance.voice = voices.find(v => v.lang.includes('fr')) || null;
        this.synthesis.speak(utterance);
    }

    async processCommand(text) {
        // Feedback animation
        const el = document.getElementById('voice-indicator');
        el.classList.add('processing');
        setTimeout(() => el.classList.remove('processing'), 1000);

        // 1. Launch Apps
        if (this.commands.launch.some(cmd => text.startsWith(cmd))) {
            const appName = text.split(' ').slice(1).join(' '); // "lance chrome" -> "chrome"
            if (appName) {
                this.speak(`Lancement de ${appName}`);
                // Use Spotlight's search & launch capabilities
                // We need to access Spotlight's app list or simply search
                // Simplest: Find best match in spotlight's allApps if we can access it
                // Or perform a "search" via IPC if spotlight isn't fully exposed.
                // Assuming we can pass "allApps" to VoiceAssistant or spotlight manager exposes a "findApp" method.
                this.spotlight.launchBestMatch(appName);
            }
            return;
        }

        // 2. Media Control
        if (text.includes('pause') || text.includes('stop')) {
            window.electronAPI.controlMedia('play_pause');
            this.speak("Pause");
        } else if (text.includes('play') || text.includes('lecture') || text.includes('musique') || text.includes('reprends')) {
            window.electronAPI.controlMedia('play_pause');
            this.speak("Lecture");
        } else if (text.includes('suivant') || text.includes('prochaine')) {
            window.electronAPI.controlMedia('next');
            this.speak("Suivant");
        } else if (text.includes('précédent')) {
            window.electronAPI.controlMedia('prev');
            this.speak("Précédent");
        }

        // 3. Time
        else if (this.commands.time.some(cmd => text.includes(cmd))) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            this.speak(`Il est ${timeStr}`);
        }

        // 4. Greeting
        else if (this.commands.greeting.some(cmd => text.includes(cmd))) {
            this.speak("Bonjour ! Comment puis-je vous aider ?");
        }

        // 5. System
        else if (text.includes('éteindre') && text.includes('pc')) {
            this.speak("Arrêt du système dans 3 secondes.");
            setTimeout(() => window.electronAPI.executeSystemCommand('shutdown'), 3000);
        }
    }
}
