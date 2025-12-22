import React, { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { SHAPES, ICONS } from '../assets/library';
import { Search, Shapes, Smile, X } from 'lucide-react';

interface AssetLibraryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onAddShape: (shape: any) => void;
    onAddIcon: (iconName: string) => void;
}

export const AssetLibraryPanel: React.FC<AssetLibraryPanelProps> = ({ isOpen, onClose, onAddShape, onAddIcon }) => {
    const [activeTab, setActiveTab] = useState<'shapes' | 'icons'>('shapes');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeIconCategory, setActiveIconCategory] = useState<string>('Communication');
    const [activeShapeCategory, setActiveShapeCategory] = useState<string>('Symboles');

    // Extract Shape Categories
    const shapeCategories = useMemo(() => {
        // @ts-ignore
        const cats = Array.from(new Set(SHAPES.map(s => s.category || 'Autres')));
        return cats.sort();
    }, []);

    // Filter Symbols
    const filteredShapes = useMemo(() => {
        return SHAPES.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
            // @ts-ignore
            const matchesCategory = (s.category || 'Autres') === activeShapeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, activeShapeCategory]);

    if (!isOpen) return null;

    const renderShapes = () => (
        <div>
            {/* Categories Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '10px', paddingBottom: '0' }}>
                {shapeCategories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveShapeCategory(cat)}
                        style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            border: 'none',
                            background: activeShapeCategory === cat ? 'var(--accent-color)' : 'var(--bg-panel)',
                            color: activeShapeCategory === cat ? '#fff' : 'var(--text-primary)',
                            fontSize: '11px', whiteSpace: 'nowrap', cursor: 'pointer'
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '10px' }}>
                {filteredShapes.map((shape: any) => (
                    <button
                        key={shape.id}
                        onClick={() => onAddShape(shape)}
                        title={shape.name}
                        style={{
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '8px',
                            aspectRatio: '1',
                            cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <svg viewBox={shape.viewBox} width="32" height="32" style={{ fill: shape.fill || 'transparent', stroke: shape.stroke || 'none', strokeWidth: shape.strokeWidth || 0 }}>
                            {/* @ts-ignore */}
                            <path d={shape.path} transform={shape.transform || ''} style={{ transformOrigin: 'center', transform: shape.rotation ? `rotate(${shape.rotation}deg)` : undefined }} />
                        </svg>
                        <span style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                            {shape.name}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderIcons = () => {
        // Get icons for current category
        // @ts-ignore
        const currentIconNames = ICONS[activeIconCategory] || [];

        // Filter by search
        const displayIcons = currentIconNames.filter((name: string) => name.toLowerCase().includes(searchTerm.toLowerCase()));

        return (
            <div>
                {/* Categories Pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '10px', paddingBottom: '0' }}>
                    {Object.keys(ICONS).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveIconCategory(cat)}
                            style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                border: 'none',
                                background: activeIconCategory === cat ? 'var(--accent-color)' : 'var(--bg-panel)',
                                color: activeIconCategory === cat ? '#fff' : 'var(--text-primary)',
                                fontSize: '11px', whiteSpace: 'nowrap', cursor: 'pointer'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: '10px' }}>
                    {displayIcons.map((name: string) => {
                        // @ts-ignore
                        const IconComponent = LucideIcons[name];
                        if (!IconComponent) return null;

                        return (
                            <button
                                key={name}
                                onClick={() => onAddIcon(name)}
                                title={name}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid transparent',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-panel)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <IconComponent size={24} color="var(--text-primary)" />
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div style={{
            position: 'absolute', // Relative to Main Layout Container? Or Fixed?
            // "Drawer" style: typically absolute within the main container
            left: '50px', // Assuming Toolbar width is ~50px
            top: 0, bottom: 0,
            width: '280px',
            background: 'var(--bg-app)',
            borderRight: '1px solid var(--border-color)',
            zIndex: 100,
            display: 'flex', flexDirection: 'column',
            boxShadow: '4px 0 10px rgba(0,0,0,0.1)'
        }}>
            {/* Header */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', padding: '6px 8px 6px 28px', borderRadius: '4px',
                            border: '1px solid var(--border-color)', background: 'var(--bg-panel)',
                            color: 'var(--text-primary)', fontSize: '12px'
                        }}
                    />
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <X size={16} color="var(--text-muted)" />
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                <button
                    onClick={() => setActiveTab('shapes')}
                    style={{
                        flex: 1, padding: '10px', background: 'none', border: 'none',
                        borderBottom: activeTab === 'shapes' ? '2px solid var(--accent-color)' : '2px solid transparent',
                        color: activeTab === 'shapes' ? 'var(--text-primary)' : 'var(--text-muted)',
                        cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                >
                    <Shapes size={14} /> Formes
                </button>
                <button
                    onClick={() => setActiveTab('icons')}
                    style={{
                        flex: 1, padding: '10px', background: 'none', border: 'none',
                        borderBottom: activeTab === 'icons' ? '2px solid var(--accent-color)' : '2px solid transparent',
                        color: activeTab === 'icons' ? 'var(--text-primary)' : 'var(--text-muted)',
                        cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                >
                    <Smile size={14} /> Icônes
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {activeTab === 'shapes' ? renderShapes() : renderIcons()}
            </div>
        </div>
    );
};
