# Journal des Modifications (Changelog)

Tous les changements notables de ce projet seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère à la [Gestion sémantique de version](https://semver.org/spec/v2.0.0.html).

## [À venir]

## [1.2.0] - 2026-01-15

### UX & Ergonomie (Suite à l'Audit)
- **Mode Édition Intelligent** : Le mode modification (tremblement des widgets) est désormais synchronisé avec le panneau latéral. Il s'active à l'ouverture et se désactive automatiquement à la fermeture ("Invisible Design").
- **Validation UX** : Validation complète du flux de configuration des Workspaces (Recherche + Drag & Drop) et du système d'annulation (Toast Undo).
- **Score Audit** : Atteinte d'un score "Excellent" (9.5/10) après correction des points de friction critiques.

## [1.1.0] - 2026-01-15

### Ajouté
- **Détection des Applications Microsoft Store (UWP)** :
  - Support natif pour détecter et lancer les applications du Microsoft Store (Calculatrice, Photos, etc.).
  - Extraction automatique des icônes haute résolution pour ces applications.
  - Prise en charge des jeux **Xbox Game Pass**, y compris ceux installés sur des disques externes.
- **Smart Workspaces** :
  - Amélioration de la gestion des espaces de travail.
  - Correction de bugs critiques empêchant la création ou le chargement correct des workspaces.
  - Optimisation de l'interface utilisateur pour la gestion des widgets par espace.

### Corrigé
- Résolution des problèmes d'affichage d'icônes pour certaines applications système.
- Amélioration de la stabilité générale lors du scan des applications.
