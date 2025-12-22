import React, { useState } from 'react';
import { Plus, Trash2, Circle as CircleIcon, Square } from 'lucide-react';

interface ColorPanelProps {
    colors: string[];
    gradients: any[]; // Fabric Gradient objects or definitions
    onColorAdd: (color: string) => void;
    onColorRemove: (index: number) => void;
    onGradientAdd: (gradient: any) => void;
    onGradientRemove: (index: number) => void;
    onApplyColor: (type: 'fill' | 'stroke', color: string) => void;
    onApplyGradient: (type: 'fill' | 'stroke', gradient: any) => void;
}

export const ColorPanel = ({
    colors,
    gradients,
    onColorAdd,
    onColorRemove,
    onGradientAdd,
    onGradientRemove,
    onApplyColor,
    onApplyGradient
}: ColorPanelProps) => {
    const [activeTab, setActiveTab] = useState<'solid' | 'gradient'>('solid');
    const [target, setTarget] = useState<'fill' | 'stroke'>('fill');

    // Solid State
    const [tempColor, setTempColor] = useState('#ff0000');

    // Gradient State
    const [gradType, setGradType] = useState<'linear' | 'radial'>('linear');
    const [gradAngle, setGradAngle] = useState(90); // Degrees (Linear only)
    const [stops, setStops] = useState<{ offset: number; color: string }[]>([
        { offset: 0, color: '#ffffff' },
        { offset: 1, color: '#000000' }
    ]);

    // Helpers
    const handleAddStop = () => {
        const newStop = { offset: 0.5, color: '#888888' };
        setStops([...stops, newStop].sort((a, b) => a.offset - b.offset));
    };

    const handleRemoveStop = (index: number) => {
        if (stops.length <= 2) return;
        const newStops = [...stops];
        newStops.splice(index, 1);
        setStops(newStops);
    };

    const updateStop = (index: number, field: 'offset' | 'color', value: any) => {
        const newStops = [...stops];
        newStops[index] = { ...newStops[index], [field]: value };
        if (field === 'offset') {
            newStops.sort((a, b) => a.offset - b.offset);
        }
        setStops(newStops);
    };

    const getGradientPreview = () => {
        const stopStr = stops.map(s => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ');
        if (gradType === 'radial') {
            return `radial-gradient(circle, ${stopStr})`;
        }
        return `linear-gradient(${gradAngle}deg, ${stopStr})`;
    };

    const createFabricGradient = () => {
        // Coords for percentage-based gradients (assuming object bounding box)
        let coords = { x1: 0, y1: 0, x2: 0, y2: 0, r1: 0, r2: 0 };

        if (gradType === 'linear') {
            // Simple approximation of angle to coords for a square unit box
            // Ideally we'd calculate intersection with unit square
            const rad = (gradAngle * Math.PI) / 180;
            // Center is 0.5, 0.5
            const cx = 0.5, cy = 0.5;
            const r = 0.5; // Half diagonal approx
            coords = {
                x1: cx - Math.cos(rad) * r, // Start
                y1: cy - Math.sin(rad) * r,
                x2: cx + Math.cos(rad) * r, // End
                y2: cy + Math.sin(rad) * r,
                r1: 0, r2: 0 // Unused for linear
            };
        } else {
            // Radial: Center to Edge
            coords = {
                x1: 0.5, y1: 0.5, // Center of gradient
                x2: 0.5, y2: 0.5, // Center of outer circle (same for standard radial)
                r1: 0,            // Inner radius
                r2: 0.5           // Outer radius (0.5 = 50% of width = edge)
            };
        }

        return {
            type: gradType,
            coords: coords,
            colorStops: stops,
            gradientUnits: 'percentage' // Crucial for relative sizing
        };
    };

    // Style
    const tabStyle = (active: boolean): React.CSSProperties => ({
        flex: 1,
        padding: '8px',
        textAlign: 'center',
        background: active ? 'var(--bg-panel)' : 'var(--bg-app)',
        borderBottom: active ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 600,
        color: active ? 'var(--text-primary)' : 'var(--text-muted)'
    });

    const labelStyle: React.CSSProperties = {
        fontSize: '11px',
        color: 'var(--text-muted)',
        marginBottom: '4px',
        display: 'block'
    };

    const inputStyle: React.CSSProperties = {
        background: 'var(--input-bg)',
        border: '1px solid var(--input-border)',
        color: 'var(--text-primary)',
        padding: '4px',
        borderRadius: '3px',
        fontSize: '12px',
        width: '100%'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-panel)' }}>

            {/* Target Switcher (Fill vs Stroke) */}
            <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
                <button
                    onClick={() => setTarget('fill')}
                    style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '4px',
                        border: target === 'fill' ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                        background: target === 'fill' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: target === 'fill' ? 'var(--accent-color)' : 'var(--text-primary)'
                    }}>
                    FILL
                </button>
                <button
                    onClick={() => setTarget('stroke')}
                    style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '4px',
                        border: target === 'stroke' ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                        background: target === 'stroke' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: target === 'stroke' ? 'var(--accent-color)' : 'var(--text-primary)'
                    }}>
                    STROKE
                </button>
            </div>

            {/* Mode Tabs */}
            <div style={{ display: 'flex' }}>
                <div style={tabStyle(activeTab === 'solid')} onClick={() => setActiveTab('solid')}>SOLIDS</div>
                <div style={tabStyle(activeTab === 'gradient')} onClick={() => setActiveTab('gradient')}>GRADIENTS</div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>

                {/* === SOLID MODE === */}
                {activeTab === 'solid' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Editor */}
                        <div>
                            <label style={labelStyle}>New Color</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="color"
                                    value={tempColor}
                                    onChange={(e) => setTempColor(e.target.value)}
                                    style={{ width: '40px', height: '32px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                                />
                                <input
                                    type="text"
                                    value={tempColor}
                                    onChange={(e) => setTempColor(e.target.value)}
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                                <button
                                    onClick={() => onColorAdd(tempColor)}
                                    title="Add to Palette"
                                    style={{
                                        background: 'var(--bg-app)', border: '1px solid var(--border-color)',
                                        borderRadius: '4px', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                    }}>
                                    <Plus size={16} />
                                </button>
                            </div>
                            <button
                                onClick={() => onApplyColor(target, tempColor)}
                                style={{
                                    marginTop: '8px', width: '100%', padding: '8px',
                                    background: 'var(--accent-color)', color: 'white',
                                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '12px'
                                }}>
                                APPLY TO SELECTION
                            </button>
                        </div>

                        {/* Palette Grid */}
                        <div>
                            <label style={labelStyle}>Palette</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                                {colors.map((c, i) => (
                                    <div
                                        key={i}
                                        className="group"
                                        style={{
                                            position: 'relative',
                                            aspectRatio: '1',
                                            background: c,
                                            borderRadius: '4px',
                                            border: '1px solid rgba(0,0,0,0.1)',
                                            cursor: 'pointer',
                                            overflow: 'hidden'
                                        }}
                                        onClick={() => {
                                            setTempColor(c);
                                            onApplyColor(target, c);
                                        }}
                                    >
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onColorRemove(i); }}
                                            style={{
                                                position: 'absolute', top: 0, right: 0, padding: '2px',
                                                background: 'rgba(0,0,0,0.5)', color: 'white',
                                                border: 'none', cursor: 'pointer', display: 'none'
                                            }}

                                        // Handling hover via CSS/group is tricky in inline styles, 
                                        // usually we just show it or add a separate delete mode.
                                        // For simplicity, shift-click to delete? Or just a small X.
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* === GRADIENT MODE === */}
                {activeTab === 'gradient' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Preview */}
                        <div style={{
                            height: '60px',
                            background: getGradientPreview(),
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)'
                        }} />

                        {/* Controls */}
                        <div>
                            <label style={labelStyle}>Type</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <button
                                    onClick={() => setGradType('linear')}
                                    style={{
                                        flex: 1, padding: '6px',
                                        background: gradType === 'linear' ? 'var(--accent-color)' : 'var(--input-bg)',
                                        color: gradType === 'linear' ? 'white' : 'var(--text-primary)',
                                        border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                                    }}>
                                    <Square size={14} /> Linear
                                </button>
                                <button
                                    onClick={() => setGradType('radial')}
                                    style={{
                                        flex: 1, padding: '6px',
                                        background: gradType === 'radial' ? 'var(--accent-color)' : 'var(--input-bg)',
                                        color: gradType === 'radial' ? 'white' : 'var(--text-primary)',
                                        border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                                    }}>
                                    <CircleIcon size={14} /> Radial
                                </button>
                            </div>

                            {gradType === 'linear' && (
                                <div style={{ marginBottom: '8px' }}>
                                    <label style={labelStyle}>Angle: {gradAngle}°</label>
                                    <input
                                        type="range" min="0" max="360"
                                        value={gradAngle}
                                        onChange={(e) => setGradAngle(parseInt(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            )}

                            {/* Stops */}
                            <label style={labelStyle}>Stops</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {stops.map((stop, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="color"
                                            value={stop.color}
                                            onChange={(e) => updateStop(i, 'color', e.target.value)}
                                            style={{ width: '24px', height: '24px', padding: 0, border: 'none', background: 'none' }}
                                        />
                                        <input
                                            type="range" min="0" max="1" step="0.01"
                                            value={stop.offset}
                                            onChange={(e) => updateStop(i, 'offset', parseFloat(e.target.value))}
                                            style={{ flex: 1 }}
                                        />
                                        <button
                                            onClick={() => handleRemoveStop(i)}
                                            disabled={stops.length <= 2}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: stops.length <= 2 ? 'default' : 'pointer', opacity: stops.length <= 2 ? 0.3 : 1 }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={handleAddStop}
                                    style={{
                                        marginTop: '4px', width: '100%', padding: '4px',
                                        background: 'var(--input-bg)', border: '1px dashed var(--border-color)',
                                        color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', borderRadius: '3px'
                                    }}>
                                    + Add Stop
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button
                                onClick={() => onGradientAdd(createFabricGradient())}
                                style={{
                                    flex: 1, padding: '8px',
                                    background: 'var(--bg-app)', border: '1px solid var(--border-color)',
                                    borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600
                                }}>
                                SAVE
                            </button>
                            <button
                                onClick={() => onApplyGradient(target, createFabricGradient())}
                                style={{
                                    flex: 2, padding: '8px',
                                    background: 'var(--accent-color)', color: 'white',
                                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600
                                }}>
                                APPLY
                            </button>
                        </div>

                        {/* Gradient Palette */}
                        <div style={{ marginTop: '16px' }}>
                            <label style={labelStyle}>Saved Gradients</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                {gradients.map((g, i) => {
                                    // Generate simple CSS preview for swatch
                                    // Limitation: Hard to perfectly map arbitrary Fabric gradient to CSS here without helper
                                    // We'll trust colorStops.
                                    let bg = '#ccc';
                                    if (g.colorStops) {
                                        const stopStr = g.colorStops.map((s: any) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ');
                                        bg = g.type === 'radial' ? `radial-gradient(circle, ${stopStr})` : `linear-gradient(135deg, ${stopStr})`;
                                    }

                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                aspectRatio: '1',
                                                background: bg,
                                                borderRadius: '50%', // Round for gradients to distinguish? or square
                                                border: '1px solid rgba(0,0,0,0.1)',
                                                cursor: 'pointer',
                                                position: 'relative'
                                            }}
                                            onClick={() => onApplyGradient(target, g)}
                                        >
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onGradientRemove(i); }}
                                                style={{
                                                    position: 'absolute', top: -2, right: -2,
                                                    background: 'white', borderRadius: '50%', border: '1px solid #ccc',
                                                    padding: '2px', cursor: 'pointer', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                <Trash2 size={8} color="red" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};
