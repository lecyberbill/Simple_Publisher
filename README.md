# Simple Publisher

A simple, beginner-friendly, and offline-first Desktop Publishing (PAO) application built with Electron, React, and Fabric.js.

> [!TIP]
> **Nouveau sur Simple Publisher ?** Consultez notre [Guide Utilisateur](file:///d:/image_to_text/Simple_PAO/GUIDE_UTILISATEUR.md) | **New to Simple Publisher?** Check out our [User Guide](file:///d:/image_to_text/Simple_PAO/USER_GUIDE.md)
>
> 🚀 **Envie de voir le futur du projet ?** Découvrez notre [Feuille de Route](file:///d:/image_to_text/Simple_PAO/ROADMAP.md) !

## 🚀 Key Features

### 🎨 Drawing & Illustration
- **Advanced Brush Tool**: Custom textures and pattern scaling (Dot, HLine, VLine, Square, Diamond).
- **Bezier Pen Tool**: Professional path creation with interactive handles.
- **Pencil Tool**: Natural freehand drawing.
- **Shape System**: Dynamic shapes including Rectangles, Circles, Triangles, Stars, and QR Codes.
- **Path Editing**: Double-click to edit vertices, convert points between Line and Bezier curves.

### ✍️ Typography & Text
- **Rich Text Support**: Custom fonts, alignment, and formatting.
- **Tabulation System**: Advanced ruler with tab stops support.
- **Text Transformations**: Uppercase conversion and styling.

### 🛠 Object Management
- **Grouping & Selection**: Combined objects into groups, multi-selection support.
- **Layer System**: Visibility toggle, locking, and depth reordering.
- **Image Cropping**: Nondestructive interactive cropping tool.
- **Alignment Tools**: Align objects to the page (Left, Center, Right, Top, Middle, Bottom).

### ⌨️ Productivity
- **Global Keyboard Shortcuts**: 
  - `Ctrl + N` : New / `Ctrl + S` : Save / `Ctrl + O` : Open
  - `Ctrl + Z / Y` : Undo / Redo
  - `Ctrl + C / V / X` : Copy / Paste / Cut
  - `Ctrl + G / Shift + G` : Group / Ungroup
  - `Ctrl + A` : Select All
  - `Ctrl + 0` : Fit to Screen
  - `V / H / P / B` : Selection, Hand, Pen, and Brush tools
- **Context Menu**: Right-click actions for quick access to object operations.

### 💾 File & Export
- **Project Saving**: Save and load custom `.pub` formatted projects.
- **Export Formats**: Support for High-Resolution **PNG** and Vector **PDF**.

## 🛠 Tech Stack
- **Electron**: Desktop shell and system integration.
- **React**: Modern component-based UI.
- **Fabric.js (v6)**: High-performance canvas engine.
- **Vite**: Rapid development and bundling.
- **TypeScript**: Robust type safety.

## 📦 Installation & Setup

1. **Prerequisites**: Install [Node.js](https://nodejs.org/) (version 16 or higher).
2. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run in development**:
   ```bash
   npm run dev:electron
   ```

3. **Build for production**:
   ```bash
   npm run build:electron
   ```

## 📜 License
MIT
