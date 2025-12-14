# Proposition de Fonctionnalités Minimales Viables (MVP) - Simple PAO

## 1. Vision du Produit
Un outil de PAO (Publication Assistée par Ordinateur) ultra-simplifié, conçu pour que "n'importe qui puisse créer un flyer en 5 minutes", sans formation ni connexion internet. L'accent est mis sur la **liberté visuelle** (glisser-déposer) plutôt que sur la structure rigide (comme dans Word).

## 2. Fonctionnalités du MVP

### A. Interface Utilisateur (UI) "Zen"
*   **Zone de Travail Centrée** : Une représentation visuelle claire de la feuille (A4 par défaut) au centre.
*   **Barre d'Outils Latérale (Simplifiée)** : Uniquement les outils essentiels (Texte, Image, Forme).
*   **Panneau de Propriétés Contextuel** : N'affiche que les options pertinentes pour l'objet sélectionné (ex: taille de police pour du texte, bordure pour une image).
*   **Mode "Débutant"** : Masquage des options avancées (calques, alignements complexes) par défaut.

### B. Manipulation & Édition
*   **Système Drag & Drop Fluide** : Positionnement libre des éléments sur la page.
*   **Outils de Base** :
    *   **Texte** : Titres, paragraphes simples. Choix de polices intégrées (Google Fonts téléchargées localement).
    *   **Images** : Import depuis le disque dur. Redimensionnement (resize) et recadrage (crop) basique.
    *   **Formes** : Rectangles, cercles, lignes pour structurer la mise en page.
*   **Guides Intelligents (Snapping)** : Aides visuelles automatiques pour aligner les objets (centre, bords) sans effort.

### C. Gestion de Contenu
*   **Modèles (Templates)** : 3 à 5 modèles intégrés "prêts à l'emploi" (Flyer Vide-grenier, Affiche Soirée, Brochure Association).
*   **Système de Fichiers** :
    *   Sauvegarde au format propriétaire (`.spao` - JSON) pour rééditer plus tard.
    *   Sauvegarde automatique locale pour éviter la perte de données.

### D. Exportation & Rendu
*   **Export PDF Haute Qualité** : Utilisation du moteur d'impression de Chromium pour générer des fichiers prêts à imprimer.
*   **Export Image** : PNG/JPG pour le partage rapide (réseaux sociaux).

### E. Aide Intégrée
*   **Tutoriel de Premier Lancement** : 3 écrans expliquant les bases.
*   **Infobulles "Au survol"** : Chaque bouton explique clairement ce qu'il fait en une phrase simple.

---

## 3. Architecture Technique Proposée

Pour respecter la contrainte **100% Offline** et **Electron/Node.js**, voici l'architecture recommandée :

### Stack Technique
*   **Core** : Electron (Dernière version stable).
*   **Frontend Framework** : HTML5 / CSS3 / Vanilla JS (ou une librairie légère comme **Vue.js** ou **React** si besoin de gestion d'état complexe, mais Vanilla/Lit est préférable pour la légèreté).
*   **Moteur de Rendu Graphique (Canvas)** : **Fabric.js** (ou Konva.js).
    *   *Pourquoi ?* Fabric.js excelle dans la manipulation d'objets (rotations, redimensionnement, groupement) sur un canvas HTML5, imitant parfaitement des outils comme Canva mais en local.
*   **Backend (Main Process)** : Node.js pour file system (fs), dialogs natifs, et orchestration de l'export PDF.

### Structure des Données
*   Format de fichier `.spao` : Un fichier JSON contenant la sérialisation du canvas Fabric.js (coordonnées, textes, chemins d'images convertis en Base64 ou liens relatifs packagés).

### Stratégie Offline
*   **Ressources Embarquées** : Toutes les polices, icônes (SVG) et images de templates seront packagées DANS l'installateur de l'application. Aucun CDN.
*   **Dépendances** : Utilisation stricte de dépendances `dependencies` (pas de `dev` au runtime) et bundling rigoureux.
