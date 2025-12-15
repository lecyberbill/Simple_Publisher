# Simple Publisher (Desktop Publishing)

A simple, offline-first Desktop Publishing application built with Electron, React, and Fabric.js.

## Features

- **Offline First**: Works completely without an internet connection.
- **System Fonts**: Access and use fonts installed on your local machine.
- **Canvas Editing**: Drag, drop, resize, and modify objects (Text, Shapes).
- **Properties Panel**: Real-time editing of object properties (Color, Font Family, etc.).
- **Export**: (Planned) Export your designs to Image or PDF.

## Tech Stack

- **Electron**: For the desktop application shell.
- **React**: For the user interface.
- **Vite**: For fast development and building.
- **Fabric.js**: For the interactive canvas.
- **TypeScript**: For type safety.

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

To start the application in development mode (React Dev Server + Electron):

```bash
npm run dev:electron
```

### Building

To build the application for production:

```bash
npm run build:electron
```

The output will be in the `dist_electron` folder (or similar, depending on configuration).

## License

MIT
