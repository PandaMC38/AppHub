<div align="center">

  <img src="src/logo.png" alt="AppHub Logo" width="120" height="120" />

  # 🚀 AppHub
  **Votre Espace de Travail Ultime / Your Ultimate Workspace**

  [![Version](https://img.shields.io/badge/version-1.1.0-blue.svg?style=for-the-badge)](https://github.com/PandaMC38/AppHub)
  [![License](https://img.shields.io/badge/license-ISC-green.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)
  [![Electron](https://img.shields.io/badge/Electron-29.1.0-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-5.0.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

  <p align="center">
    <b>Un Dashboard de Productivité Moderne pour Windows</b><br>
    Centralisez vos applications, surveillez votre système et organisez votre vie numérique avec élégance.
    <br><br>
    <a href="#-français">🇫🇷 Documentation en Français</a> •
    <a href="#-english">🇬🇧 English Documentation</a>
  </p>
</div>

---

## 🇫🇷 Français

### 🌟 Introduction
**AppHub** (Super-Productivité) n'est pas qu'un simple lanceur d'applications. C'est une refonte complète de votre expérience bureau sur Windows. Conçu pour éliminer le désordre visuel, il regroupe vos outils essentiels dans une interface fluide, animée et entièrement personnalisable.

> [!NOTE]
> AppHub utilise **Electron** pour l'intégration système profonde (fichiers, performances) et **Vite** pour une interface utilisateur ultra-rapide.

### ✨ Fonctionnalités Avancées

#### 🧩 Écosystème de Widgets
AppHub intègre un système de grille dynamique (Grid Layout) permettant de placer et redimensionner vos widgets à volonté.

| Widget | Description | Détails Techniques |
| :--- | :--- | :--- |
| **🎵 Média Universel** | Contrôle Spotify, Deezer, YouTube Music, etc. | Utilise l'API Windows (SMTC) native. Affiche titre, artiste et pochette. |
| **⏱️ Horloge & Date** | Affichage élégant de l'heure locale. | Mise à jour en temps réel (1s). Format `fr-FR`. |
| **☁️ Météo Live** | Température et conditions actuelles. | Connecté à l'API **Open-Meteo**. Géolocalisation par défaut (Paris). |
| **💻 Moniteur Système** | Utilisation RAM & CPU en direct. | Utilise `os.freemem()` via IPC natif pour une précision parfaite. |
| **💾 Espace Disque** | Jauges visuelles de stockage. | Scanne les disques physiques via **PowerShell** pour des données exactes. |
| **📝 Notes** | Bloc-notes persistant. | Sauvegarde automatique dans le `localStorage`. |
| **✅ To-Do** | Gestionnaire de tâches simple. | Ajout/Suppression rapide. Persistance des données. |
| **🚀 Quick Launch** | Raccourcis Web/Dossiers. | Supporte les URLs et les chemins locaux. Icônes Emojis. |
| **🖩 Calculatrice** | Pour les calculs rapides. | Interface intégrée, pas de fenêtre séparée. |

#### 📂 Lanceur d'Applications Intelligent
Le cœur d'AppHub est son moteur de scan.
- **Scan Récursif** : Analyse vos dossiers *Start Menu* (Utilisateur & Système) pour trouver tous vos programmes.
- **Extraction d'Icônes** : Récupère les icônes haute résolution `.exe` originales via Electron.
- **Recherche Instantanée** : Filtrez des centaines d'apps en millisecondes.
- **Menu Contextuel** : Clic-droit pour gérer les Favoris ou lancer en mode Admin.

#### 🔍 Spotlight Search (Command Palette)
Une barre de commande universelle (**`Ctrl + Space`**) style "Raycast" ou "macOS".
- **Lanceur Ultra-Rapide** : Ouvrez apps, fichiers et recherches web.
- **Calculatrice Intégrée** : Tapez un calcul (`12*5+10`) et voyez le résultat instantanément.
- **Contrôle Système** : Eteindre, Redémarrer, Veille via commandes texte.

#### 🎨 Personnalisation Totale
- **Mode Édition (Drag & Drop)** : Organisez votre grille comme sur un smartphone.
- **Redimensionnement Avancé** : Menu de sélection de taille (1x1, 1x2, 2x1, 2x2, 3x1, 3x2, 4x1, 4x2) pour une flexibilité totale.
- **Système de Thèmes** : Changez la couleur d'accentuation (Accent Color) et l'opacité des cartes.
- **Fonds d'écran Vivants** : Support natif des fichiers `.mp4` pour des arrière-plans vidéo, ou images classiques.
- **Store de Thèmes (Presets)** : Sauvegardez et chargez instantanément vos configurations complètes (Widgets + Couleurs + Fond d'écran). Ex: "Mode Travail", "Gaming", "Soirée".
- **Interface de Paramètres Moderne** : Menu centré avec prévisualisation en direct des couleurs et de la transparence.

---

### 🛠️ Installation & Démarrage Facile

L'installation a été simplifiée au maximum. Vous n'avez pas besoin de taper des lignes de commande complexes.

#### Prérequis
- **Node.js** : Doit être installé sur votre ordinateur. [Télécharger Node.js](https://nodejs.org/) (Version LTS recommandée).

#### Instructions
1. **Télécharger/Cloner le projet** sur votre ordinateur.
2. Double-cliquez sur le fichier **`AppHub_Silent.vbs`** (à la racine du dossier).
   - *Le script va automatiquement installer les fichiers nécessaires lors du premier lancement.*
   - *Une fois prêt, l'application se lancera.*
3. **C'est tout !**
   - Un **raccourci** sera automatiquement créé sur votre Bureau pour les prochains lancements.

> [!IMPORTANT]
> Si vous souhaitez développer ou modifier le code, vous pouvez toujours utiliser `npm install` et `npm run dev` manuellement.

---

### 🧠 Architecture Technique ("Sous le Capot")

AppHub est construit sur une architecture **biprocessus** sécurisée et modulaire :

#### 1. Processus Principal (`electron/main.js`)
Gère le système d'exploitation.
- **Handlers Modulaires** : Code découpé en modules (`electron/handlers/*.js`) pour la clarté.
- **IPC Handlers** : Écoute les demandes du frontend (ex: `get-disk-space`, `media-control`).
- **PowerShell Integration** : Scripts dédiés (`electron/scripts/`) pour interagir avec Windows (SMTC, Disques).
- **File System** : Lit le disque pour trouver les applications et gérer les wallpapers.

#### 2. Processus de Rendu (`src/main.js` & `src/widgets/`)
L'interface utilisateur.
- **Architecture Orientée Objet** : Chaque widget est une classe (`src/widgets/*.js`) héritant d'une classe de base.
- **WidgetManager** : Gère le cycle de vie, la sauvegarde et le rendu des widgets.
- **Vanilla JS + Vite** : Pas de framework lourd pour une performance maximale.
- **CSS Variables** : Gestion dynamique des thèmes.

#### 📂 Arborescence des Fichiers Clés
```
AppHub/
├── electron/
│   ├── handlers/      # Logique métier (AppScanner, MediaHandler...)
│   ├── scripts/       # Scripts PowerShell (MediaControl...)
│   ├── main.js        # Point d'entrée Backend
│   └── preload.js     # Pont sécurisé (ContextBridge)
├── src/
│   ├── widgets/       # Classes des Widgets (Clock, Media, Weather...)
│   ├── WidgetManager.js # Gestionnaire des widgets
│   ├── main.js        # Point d'entrée Frontend
│   ├── style.css      # Design System
│   └── logo.png       # Assets
├── index.html         # Template HTML
├── AppHub_Silent.vbs  # Lanceur silencieux & Installateur auto
└── package.json       # Dépendances
```

---

<br><br>

## 🇬🇧 English

### 🌟 Overview
**AppHub** is not just an app launcher. It's a complete overhaul of your Windows desktop experience. Designed to eliminate visual clutter, it unifies your essential tools into one fluid, animated, and fully customizable interface.

### ✨ Key Features

#### 🧩 Widget Ecosystem
A dynamic grid allowing you to place and resize widgets at will.

- **🎵 Universal Media**: Controls various players (Spotify, YouTube, etc.) via Windows SMTC.
- **⏱️ Clock & Date**: Elegant time display.
- **☁️ Live Weather**: Real-time temperature and conditions (Open-Meteo API).
- **💻 System Monitor**: RAM usage tracking via native IPC.
- **💾 Disk Space**: Visual storage gauges scanning physical drives.
- **📝 Notes & Tasks**: Persistent notepad and To-Do list.
- **🚀 Quick Launch**: Custom shortcuts for URLs/Folders with Emoji support.

#### 📂 Smart App Launcher
- **Recursive Scan**: Deep scans your Start Menu to find every installed program.
- **High-Res Icons**: Extracts original `.exe` icons.
- **Instant Search**: Millisecond-fast filtering.

#### 🔍 Spotlight Search (Command Palette)
A universal command bar (**`Ctrl + Space`**) similar to "Raycast" or "macOS".
- **Blazing Fast Launcher**: Open apps, files, and web searches.
- **Integrated Calculator**: Type a math expression (`12*5+10`) to see the result instantly.
- **System Control**: Shutdown, Restart, Sleep via text commands.

#### 🎨 Customization
- **Drag & Drop**: Reorder widgets effortlessly.
- **Advanced Resizing**: Size selection menu (1x1, 1x2, 2x1, 2x2, 3x1, 3x2, 4x1, 4x2) for complete flexibility.
- **Live Wallpapers**: Native `.mp4` video background support.
- **Theme Store (Presets)**: Save and load full configurations (Widgets + Colors + Wallpaper) instantly.
- **Modern Settings UI**: Centered modal with live previews for color and opacity changes.

---

### 🛠️ Easy Installation & Setup

Installation is streamlined for ease of use. No command line required for normal usage.

#### Prerequisites
- **Node.js**: Must be installed. [Download Node.js](https://nodejs.org/).

#### Instructions
1. **Download/Clone the project** to your PC.
2. Double-click on **`AppHub_Silent.vbs`** (in the root folder).
   - *The script will automatically install necessary dependencies on the first run.*
   - *Once ready, the app will launch.*
3. **That's it!**
   - A **shortcut** will automatically be created on your Desktop for future use.

> [!IMPORTANT]
> If you are a developer, you can still use `npm install` and `npm run dev` manually.

---

### 🧠 Under the Hood

AppHub uses a secure **dual-process** modular architecture:

- **Main Process**: Handles OS interactions via modular handlers (`electron/handlers`) and PowerShell scripts.
- **Renderer Process**: Lightweight Vanilla JS + Vite. Using Object-Oriented Widgets (`src/widgets/*.js`) and a `WidgetManager` for scalability.

---

<div align="center">
  <sub>Made with ❤️ by PandaMC38 using Electron & Vite.</sub>
</div>