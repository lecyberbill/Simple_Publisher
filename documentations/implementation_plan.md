# Plan d'Implémentation - Simple PAO

## Objectif
Mettre en place une architecture robuste et modulaire pour une application de PAO Desktop, capable d'évoluer (multi-pages, calques) tout en restant simple à utiliser.

## Architecture Modulaire & Évolutive

Pour répondre au besoin de modularité (futurs calques, multi-pages), nous utiliserons **React** avec **Vite**. Cela permet de découper l'interface en composants isolés et de gérer l'état de l'application (pages, objets) de manière prévisible.

### Structure du State (Zustand ou Context)
Le modèle de données sera conçu dès le départ pour le multi-pages :
```typescript
interface DocumentState {
  pages: Array<{
    id: string;
    canvasObjects: any[]; // Données sérialisées de Fabric.js
    thumbnail: string;
  }>;
  activePageIndex: number;
  selectedObjectIds: string[];
  // ...
}
```
*Le MVP n'utilisera que `pages[0]`, mais la structure sera prête.*

## Accès aux Polices Système (System Fonts)

Electron ne donne pas accès direct aux polices système depuis le navigateur (Renderer) pour des raisons de sécurité, et l'API native du web est limitée.
**Stratégie :**
1.  **Main Process (Node.js)** : Utiliser une librairie comme `font-list` ou `system-font-families` au démarrage pour scanner les polices installées sur l'OS.
2.  **IPC Bridge** : Envoyer cette liste au Renderer lors du lancement.
3.  **Renderer** : Charger dynamiquement ces noms de polices dans Fabric.js.
    *   *Note* : Pour que le rendu soit correct, Electron doit parfois être configuré pour autoriser l'accès aux fichiers de polices locaux, ou nous devrons charger un aperçu CSS.

## Plan de Développement (Phase 1)

### Etape 1 : Initialisation "Clean"
- [ ] Setup Electron + Vite + React + TypeScript.
- [ ] Configuration de ESLint/Prettier pour la qualité du code.
- [ ] Mise en place du **IPC Bridge** sécurisé (Context Isolation activé).

### Etape 2 : Cœur Graphique (CanvasManager)
- [ ] Création d'un composant `CanvasArea` encapsulant **Fabric.js**.
- [ ] Gestion du redimensionnement automatique (Responsive Canvas).
- [ ] Abstraction des méthodes Fabric (ex: `addText`, `addRect`) pour ne pas coupler toute l'app à la librairie directement.

### Etape 3 : Gestion des Polices
- [ ] Implémentation de la fonction `getSystemFonts` dans le Main Process.
- [ ] Création du sélecteur de police dans l'UI qui consomme cette liste.

### Etape 4 : UI de Base "Zen"
- [ ] Barre d'outils flottante ou latérale (gauche).
- [ ] Panneau de propriétés (droite) qui réagit à la sélection.
