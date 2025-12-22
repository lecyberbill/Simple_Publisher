// Basic SVG Paths for Shapes
import { OPEN_ICONIC_SHAPES } from './oi_shapes';

export const SHAPES = [
    ...OPEN_ICONIC_SHAPES,
    // --- Symbols ---
    {
        id: 'heart',
        name: 'Cœur',
        category: 'Symboles',
        path: 'M 248.078 376.536 C 117.493 255.438 41.523 189.658 41.523 111.905 C 41.523 46.591 90.72 5.093 153.284 5.093 C 189.696 5.093 223.363 21.053 248.078 49.967 C 272.793 21.053 306.46 5.093 342.871 5.093 C 405.436 5.093 454.633 46.591 454.633 111.905 C 454.633 189.658 378.663 255.438 248.078 376.536 Z',
        viewBox: '0 0 496 397',
        fill: '#E91E63'
    },
    {
        id: 'star',
        name: 'Étoile',
        category: 'Symboles',
        path: 'M 250 5 L 308 185 L 495 185 L 344 295 L 401 475 L 250 365 L 99 475 L 156 295 L 5 185 L 192 185 Z',
        viewBox: '0 0 500 500',
        fill: '#FFEB3B'
    },
    {
        id: 'cloud',
        name: 'Nuage',
        category: 'Symboles',
        path: 'M 350 200 C 350 144.77 305.23 100 250 100 C 238.45 100 227.42 102.01 217.15 105.72 C 206.57 65.59 170.04 36 127 36 C 73.15 36 29 76.53 23.46 128.53 C 9.77 131.79 0 143.99 0 159 C 0 176.67 14.33 191 32 191 L 350 191 C 367.67 191 382 176.67 382 159 C 382 143.99 372.23 131.79 358.54 128.53 C 353 76.53 308.85 36 255 36 C 211.96 36 175.43 65.59 164.85 105.72 C 154.58 102.01 143.55 100 132 100 C 76.77 100 32 144.77 32 200 C 32 255.23 76.77 300 132 300 L 250 300 C 305.23 300 350 255.23 350 200 Z',
        viewBox: '-10 -10 420 350',
        fill: '#B3E5FC'
    },
    {
        id: 'bolt',
        name: 'Éclair',
        category: 'Symboles',
        path: 'M 350 200 L 200 200 L 250 50 L 50 250 L 200 250 L 150 400 Z',
        viewBox: '0 0 400 450',
        fill: '#FFC107'
    },
    {
        id: 'bubble',
        name: 'Bulle',
        category: 'Symboles',
        path: 'M 250 450 C 111.93 450 0 349.26 0 225 C 0 100.74 111.93 0 250 0 C 388.07 0 500 100.74 500 225 C 500 349.26 388.07 450 250 450 Z M 250 400 L 400 500 L 350 400 Z',
        viewBox: '0 0 500 500',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2
    },

    // --- Geometric ---
    {
        id: 'hexagon',
        name: 'Hexagone',
        category: 'Géométrie',
        path: 'M 450 250 L 375 379.9 L 225 379.9 L 150 250 L 225 120.1 L 375 120.1 Z',
        viewBox: '0 0 600 500',
        fill: '#4CAF50'
    },
    {
        id: 'octagon',
        name: 'Octogone',
        category: 'Géométrie',
        path: 'M 165 400 L 65 300 L 65 160 L 165 60 L 305 60 L 405 160 L 405 300 L 305 400 Z',
        viewBox: '0 0 470 460',
        fill: '#FF5722'
    },
    {
        id: 'trapezoid',
        name: 'Trapèze',
        category: 'Géométrie',
        path: 'M 100 350 L 0 450 L 500 450 L 400 350 Z',
        viewBox: '0 0 500 500',
        fill: '#9C27B0'
    },

    // --- Arrows (Classic) ---
    {
        id: 'arrow_right',
        name: 'Flèche D',
        category: 'Flèches',
        path: 'M 100 200 L 300 200 L 300 100 L 500 250 L 300 400 L 300 300 L 100 300 Z',
        viewBox: '0 0 600 500',
        fill: '#607D8B'
    },
    {
        id: 'arrow_left',
        name: 'Flèche G',
        category: 'Flèches',
        path: 'M 500 200 L 300 200 L 300 100 L 100 250 L 300 400 L 300 300 L 500 300 Z',
        viewBox: '0 0 600 500',
        fill: '#607D8B'
    },



    // --- Flowchart ---
    {
        id: 'flow_process',
        name: 'Processus',
        category: 'Flowchart',
        path: 'M 50 150 L 450 150 L 450 350 L 50 350 Z',
        viewBox: '0 0 500 500',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2
    },
    {
        id: 'flow_decision',
        name: 'Décision',
        category: 'Flowchart',
        path: 'M 250 100 L 450 250 L 250 400 L 50 250 Z',
        viewBox: '0 0 500 500',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2
    },
    {
        id: 'flow_document',
        name: 'Document',
        category: 'Flowchart',
        path: 'M 50 100 L 450 100 L 450 350 C 400 400, 300 300, 250 350 C 200 400, 100 300, 50 350 Z',
        viewBox: '0 0 500 500',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2
    },

    // --- Fun / Déco ---
    {
        id: 'pacman',
        name: 'Pacman',
        category: 'Déco',
        path: 'M 250 250 L 450 150 A 250 250 0 1 0 450 350 Z',
        viewBox: '0 0 500 500',
        fill: '#FFEB3B'
    },
    {
        id: 'puzzle',
        name: 'Puzzle',
        category: 'Déco',
        path: 'M 100 100 L 200 100 A 50 50 0 0 1 300 100 L 400 100 L 400 200 A 50 50 0 0 0 400 300 L 400 400 L 300 400 A 50 50 0 0 1 200 400 L 100 400 L 100 300 A 50 50 0 0 0 100 200 Z',
        viewBox: '0 0 500 500',
        fill: '#2196F3'
    },

    {
        id: 'ghost',
        name: 'Fantôme',
        category: 'Déco',
        path: 'M 250 50 C 150 50 100 150 100 250 L 100 450 L 150 400 L 200 450 L 250 400 L 300 450 L 350 400 L 400 450 L 400 250 C 400 150 350 50 250 50 M 200 200 A 20 20 0 1 1 200 201 M 300 200 A 20 20 0 1 1 300 201',
        viewBox: '0 0 500 500',
        fill: '#90CAF9'
    },


];

// Map Lucide icons to useful categories
export const ICONS = {
    'Communication': ['MessageCircle', 'Mail', 'Phone', 'Send', 'Bell', 'ThumbsUp', 'Heart'],
    'Interface': ['Home', 'User', 'Settings', 'Search', 'Menu', 'X', 'Check', 'Plus', 'Trash', 'Share'],
    'Arrows': ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ChevronRight', 'ChevronLeft'],
    'Nature': ['Sun', 'Moon', 'Cloud', 'Zap', 'Droplets', 'Flame'],
    'Social': ['Facebook', 'Instagram', 'Twitter', 'Linkedin', 'Youtube', 'Globe'],
    'Media': ['Play', 'Pause', 'Music', 'Video', 'Camera', 'Image'],
    'Devices': ['Monitor', 'Smartphone', 'Tablet', 'Laptop', 'Watch', 'Printer'],
    'Business': ['Briefcase', 'DollarSign', 'CreditCard', 'PieChart', 'BarChart', 'TrendingUp']
};
