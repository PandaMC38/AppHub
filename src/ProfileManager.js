export class ProfileManager {
    constructor(widgetManager, applyPrefsCallback) {
        this.widgetManager = widgetManager;
        this.applyPrefs = applyPrefsCallback;
        this.profiles = this.loadProfilesFromStorage();
    }

    loadProfilesFromStorage() {
        try {
            const data = localStorage.getItem('apphub_profiles');
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    }

    saveProfilesToStorage() {
        localStorage.setItem('apphub_profiles', JSON.stringify(this.profiles));
    }

    getProfileNames() {
        return Object.keys(this.profiles);
    }

    saveProfile(name) {
        if (!name) return false;

        // Force WidgetManager to save current state to localStorage first
        this.widgetManager.save();

        const profile = {
            widgets: JSON.parse(localStorage.getItem('apphub_widgets') || '[]'),
            wallpaper: JSON.parse(localStorage.getItem('apphub_wallpaper') || 'null'),
            accent: localStorage.getItem('apphub_accent') || '#646cff',
            opacity: localStorage.getItem('apphub_opacity') || '5',
            username: localStorage.getItem('apphub_username') || 'Utilisateur'
        };

        this.profiles[name] = profile;
        this.saveProfilesToStorage();
        return true;
    }

    loadProfile(name) {
        const profile = this.profiles[name];
        if (!profile) return false;

        // Restore to LocalStorage
        localStorage.setItem('apphub_widgets', JSON.stringify(profile.widgets));
        localStorage.setItem('apphub_wallpaper', JSON.stringify(profile.wallpaper));
        localStorage.setItem('apphub_accent', profile.accent);
        localStorage.setItem('apphub_opacity', profile.opacity);
        // username is optional to restore, maybe user wants to keep it? Let's restore it for now.
        localStorage.setItem('apphub_username', profile.username);

        // Update UI
        // 1. Widgets
        this.widgetManager.load();
        this.widgetManager.render();

        // 2. Preferences (Color, Wallpaper, etc.)
        if (this.applyPrefs) {
            this.applyPrefs({
                wallpaper: profile.wallpaper,
                accent: profile.accent,
                opacity: profile.opacity,
                username: profile.username
            });
        }
        return true;
    }

    deleteProfile(name) {
        if (this.profiles[name]) {
            delete this.profiles[name];
            this.saveProfilesToStorage();
            return true;
        }
        return false;
    }
}
