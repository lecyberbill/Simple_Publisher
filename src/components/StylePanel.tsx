import React, { useState } from 'react';
import * as fabric from 'fabric';
import { Plus, Trash2, Type, Square, Palette } from 'lucide-react';

export interface SavedStyle {
    id: string;
    name: string;
    type: 'text' | 'shape' | 'both';
    properties: any;
    previewColor?: string;
}

interface StylePanelProps {
    styles: SavedStyle[];
    onAddStyle: (name: string) => void;
    onApplyStyle: (style: SavedStyle) => void;
    onRemoveStyle: (id: string) => void;
    selectedObject: fabric.Object | null;
}

export const StylePanel: React.FC<StylePanelProps> = ({ styles, onAddStyle, onApplyStyle, onRemoveStyle, selectedObject }) => {
    const [newStyleName, setNewStyleName] = useState('');

    const handleAdd = () => {
        if (newStyleName.trim()) {
            onAddStyle(newStyleName);
            setNewStyleName('');
        }
    };

    return (
        <div style={{ padding: '15px', color: 'var(--text-primary)' }}>
            <h3 style={{ marginTop: 0, fontSize: '14px', marginBottom: '15px' }}>DOC STYLES</h3>

            {/* Creation Area */}
            <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
                <input
                    type="text"
                    value={newStyleName}
                    onChange={(e) => setNewStyleName(e.target.value)}
                    placeholder="New style name..."
                    style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)'
                    }}
                />
                <button
                    onClick={handleAdd}
                    disabled={!selectedObject || !newStyleName.trim()}
                    title={!selectedObject ? "Select an object first" : "Save current style"}
                    style={{
                        background: 'var(--accent-color)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        padding: '6px 10px',
                        cursor: (selectedObject && newStyleName.trim()) ? 'pointer' : 'not-allowed',
                        opacity: (selectedObject && newStyleName.trim()) ? 1 : 0.5
                    }}
                >
                    <Plus size={16} />
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {styles.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', border: '1px dashed var(--border-color)', borderRadius: '4px' }}>
                        No styles saved.<br />Select an object and save its style!
                    </div>
                )}

                {styles.map(style => (
                    <div key={style.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        background: 'var(--bg-canvas)',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        gap: '10px'
                    }}>
                        {/* Preview Icon */}
                        <div
                            onClick={() => onApplyStyle(style)}
                            style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                background: style.previewColor || '#ccc',
                                border: '1px solid rgba(0,0,0,0.1)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {style.type === 'text' ? <Type size={14} color="#fff" style={{ mixBlendMode: 'difference' }} /> : null}
                        </div>

                        <div
                            onClick={() => onApplyStyle(style)}
                            style={{ flex: 1, fontSize: '13px', cursor: 'pointer', userSelect: 'none' }}
                        >
                            {style.name}
                        </div>

                        <button
                            onClick={() => onRemoveStyle(style.id)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '4px'
                            }}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
