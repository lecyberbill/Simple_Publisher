import React from 'react';
import * as fabric from 'fabric';
import {
    ArrowUpToLine, ArrowDownToLine, FoldVertical,
    Bold, Italic, Underline, Strikethrough,
    Type, Ban, Trash2,
    MoveUp, MoveDown, BringToFront, SendToBack,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Image as ImageIcon,
    Superscript, Subscript, CaseUpper,
    Minus, Square
} from 'lucide-react';

interface PropertiesPanelProps {
    selectedObject: fabric.Object | null;
    systemFonts: string[];
    onPropertyChange: (property: string, value: any) => void;
    onAction: (action: string) => void;
    isCropping?: boolean;
    onStartCrop?: () => void;
    onApplyCrop?: () => void;
    onCancelCrop?: () => void;
}

export const PropertiesPanel = ({ selectedObject, systemFonts, onPropertyChange, onAction, isCropping, onStartCrop, onApplyCrop, onCancelCrop }: PropertiesPanelProps) => {

    const PX_PER_MM = 3.779527559;

    const renderSectionHeader = (title: string) => (
        <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom: '8px',
            marginTop: '16px',
            letterSpacing: '0.5px'
        }}>
            {title}
        </div>
    );


    // If we are cropping, show specialized crop panel regardless of selection
    if (isCropping) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {renderSectionHeader('Crop Mode')}
                <div style={{ padding: '8px', flex: 1 }}>
                    <div style={{ fontSize: '11px', color: 'var(--accent-color)', textAlign: 'center', padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px', marginBottom: '16px' }}>
                        Adjust the white overlay rectangle to frame your image.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button
                            onClick={onApplyCrop}
                            style={{
                                padding: '10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: 'var(--accent-color)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}
                        >
                            <ImageIcon size={16} /> Apply Crop
                        </button>
                        <button
                            onClick={onCancelCrop}
                            style={{
                                padding: '10px',
                                fontSize: '12px',
                                background: 'var(--input-bg)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!selectedObject) {
        return (
            <div style={{
                padding: '20px',
                color: 'var(--text-muted)',
                textAlign: 'center',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
            }}>
                <Ban size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                <div>No selection</div>
                <div style={{ fontSize: '11px', marginTop: '5px' }}>Click an object to edit properties</div>
            </div>
        );
    }

    const type = selectedObject.type;
    const isText = type === 'i-text' || type === 'text' || type === 'textbox';

    // Helper to ensure valid Hex for input type="color"
    const getHexColor = (color: any): string => {
        if (!color || color === 'transparent') return '#000000';
        if (typeof color === 'string') {
            if (color.startsWith('#') && color.length === 7) return color;
            // Handle rgb(), named colors, etc. via Fabric
            try {
                return '#' + new fabric.Color(color).toHex();
            } catch (e) {
                return '#000000';
            }
        }
        return '#000000';
    };

    // Helper to reading property (handling selection styles vs object styles)
    const getPropertyValue = (key: string, defaultVal: any) => {
        if (isText && (selectedObject as any).isEditing) {
            const styles = (selectedObject as any).getSelectionStyles();
            // If cursor just placed (no range), styles might be empty or inherit.
            // Usually getSelectionStyles returns an array.
            if (styles && styles.length > 0 && styles[0][key] !== undefined) {
                return styles[0][key];
            }
            // Fallback to object property if simpler
            return (selectedObject as any)[key] ?? defaultVal;
        }
        return (selectedObject as any)[key] ?? defaultVal;
    };

    // Helper for locale-safe numbers
    const safeParseFloat = (val: string, fallback = 0) => {
        const num = parseFloat(val.replace(',', '.'));
        return isNaN(num) ? fallback : num;
    };

    const safeParseInt = (val: string, fallback = 0) => {
        const num = parseInt(val, 10);
        return isNaN(num) ? fallback : num;
    };


    const renderInputRow = (label: string, input: React.ReactNode) => (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{
                width: '80px',
                fontSize: '12px',
                color: 'var(--text-secondary)'
            }}>{label}</label>
            <div style={{ flex: 1 }}>{input}</div>
        </div>
    );

    const inputStyle: React.CSSProperties = {
        width: '100%',
        background: 'var(--input-bg)',
        border: '1px solid var(--input-border)',
        color: 'var(--text-primary)',
        padding: '4px 8px',
        borderRadius: '2px',
        fontSize: '12px',
        outline: 'none'
    };

    const iconButtonStyle: React.CSSProperties = {
        flex: 1,
        padding: '6px',
        background: 'var(--input-bg)',
        border: '1px solid var(--input-border)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer'
    };

    return (
        <div style={{ padding: '16px', color: 'var(--text-primary)', height: '100%', overflowY: 'auto' }}>

            {/* Context Header */}
            <div style={{
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <div style={{
                    padding: '4px',
                    background: 'var(--accent-color)',
                    borderRadius: '4px',
                    display: 'flex'
                }}>
                    {isText ? <Type size={14} /> : <div style={{ width: 14, height: 14, border: '2px solid white' }} />}
                </div>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>
                    {isText ? 'Text Component' : 'Shape / Image'}
                </span>
            </div>

            {/* Text Specific Context */}
            {isText && (
                <>
                    {renderSectionHeader('Typography')}

                    <div style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
                        <select
                            style={{ ...inputStyle, flex: 2 }}
                            value={getPropertyValue('fontFamily', 'Arial')}
                            onChange={(e) => onPropertyChange('fontFamily', e.target.value)}
                        >
                            {systemFonts.map(font => <option key={font} value={font} style={{ fontFamily: font, fontSize: '14px' }}>{font}</option>)}
                        </select>
                        <input
                            type="number"
                            min="1"
                            style={{ ...inputStyle, flex: 1 }}
                            value={getPropertyValue('fontSize', 24)}
                            onChange={(e) => onPropertyChange('fontSize', safeParseInt(e.target.value, 1))}
                            title="Font Size"
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                        <button
                            onClick={() => onPropertyChange('fontWeight', getPropertyValue('fontWeight', 'normal') === 'bold' ? 'normal' : 'bold')}
                            style={{
                                ...iconButtonStyle,
                                background: getPropertyValue('fontWeight', 'normal') === 'bold' ? 'var(--accent-color)' : 'var(--input-bg)',
                            }}>
                            <Bold size={14} />
                        </button>
                        <button
                            onClick={() => onPropertyChange('fontStyle', getPropertyValue('fontStyle', 'normal') === 'italic' ? 'normal' : 'italic')}
                            style={{
                                ...iconButtonStyle,
                                background: getPropertyValue('fontStyle', 'normal') === 'italic' ? 'var(--accent-color)' : 'var(--input-bg)',
                            }}>
                            <Italic size={14} />
                        </button>
                        <button
                            onClick={() => onPropertyChange('underline', !getPropertyValue('underline', false))}
                            style={{
                                ...iconButtonStyle,
                                background: getPropertyValue('underline', false) ? 'var(--accent-color)' : 'var(--input-bg)',
                            }}>
                            <Underline size={14} />
                        </button>
                        <button
                            onClick={() => onPropertyChange('linethrough', !getPropertyValue('linethrough', false))}
                            style={{
                                ...iconButtonStyle,
                                background: getPropertyValue('linethrough', false) ? 'var(--accent-color)' : 'var(--input-bg)',
                            }}>
                            <Strikethrough size={14} />
                        </button>
                        {getPropertyValue('underline', false) && (
                            <input
                                type="number"
                                step="1"
                                style={{ ...inputStyle, width: '50px' }}
                                value={getPropertyValue('underlineOffset', 0)}
                                onChange={(e) => onPropertyChange('underlineOffset', safeParseInt(e.target.value, 0))}
                                title="Position du soulignement"
                            />
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                        <button onClick={() => onPropertyChange('textAlign', 'left')} style={iconButtonStyle}><AlignLeft size={14} /></button>
                        <button onClick={() => onPropertyChange('textAlign', 'center')} style={iconButtonStyle}><AlignCenter size={14} /></button>
                        <button onClick={() => onPropertyChange('textAlign', 'right')} style={iconButtonStyle}><AlignRight size={14} /></button>
                        <button onClick={() => onPropertyChange('textAlign', 'justify')} style={iconButtonStyle}><AlignJustify size={14} /></button>
                    </div>

                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                        <button
                            onClick={() => onPropertyChange('verticalAlign', 'top')}
                            style={{ ...iconButtonStyle, background: getPropertyValue('verticalAlign', 'top') === 'top' ? 'var(--accent-color)' : 'var(--input-bg)' }}
                            title="Align Top"
                        >
                            <ArrowUpToLine size={14} />
                        </button>
                        <button
                            onClick={() => onPropertyChange('verticalAlign', 'middle')}
                            style={{ ...iconButtonStyle, background: getPropertyValue('verticalAlign', 'top') === 'middle' ? 'var(--accent-color)' : 'var(--input-bg)' }}
                            title="Align Middle"
                        >
                            <FoldVertical size={14} />
                        </button>
                        <button
                            onClick={() => onPropertyChange('verticalAlign', 'bottom')}
                            style={{ ...iconButtonStyle, background: getPropertyValue('verticalAlign', 'top') === 'bottom' ? 'var(--accent-color)' : 'var(--input-bg)' }}
                            title="Align Bottom"
                        >
                            <ArrowDownToLine size={14} />
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <div>
                            <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Line H.</label>
                            <input
                                type="number"
                                step="0.1"
                                style={inputStyle}
                                value={getPropertyValue('lineHeight', 1.16)}
                                onChange={(e) => onPropertyChange('lineHeight', safeParseFloat(e.target.value, 1.16))}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Spacing</label>
                            <input
                                type="number"
                                step="10"
                                style={inputStyle}
                                value={getPropertyValue('charSpacing', 0)}
                                onChange={(e) => onPropertyChange('charSpacing', safeParseInt(e.target.value, 0))}
                            />
                        </div>
                    </div>



                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                        <button
                            title="Superscript"
                            onClick={() => {
                                const currentDelta = getPropertyValue('deltaY', 0);
                                if (currentDelta < 0) {
                                    // Remove superscript
                                    onPropertyChange('deltaY', 0);
                                    onPropertyChange('fontSize', getPropertyValue('fontSize', 24) / 0.6);
                                } else {
                                    // Apply superscript
                                    const fontSize = getPropertyValue('fontSize', 24);
                                    onPropertyChange('deltaY', -(fontSize * 0.4));
                                    onPropertyChange('fontSize', fontSize * 0.6);
                                }
                            }}
                            style={iconButtonStyle}
                        >
                            <Superscript size={14} />
                        </button>
                        <button
                            title="Subscript"
                            onClick={() => {
                                const currentDelta = getPropertyValue('deltaY', 0);
                                if (currentDelta > 0) {
                                    // Remove subscript
                                    onPropertyChange('deltaY', 0);
                                    onPropertyChange('fontSize', getPropertyValue('fontSize', 24) / 0.6);
                                } else {
                                    // Apply subscript
                                    const fontSize = getPropertyValue('fontSize', 24);
                                    onPropertyChange('deltaY', fontSize * 0.2);
                                    onPropertyChange('fontSize', fontSize * 0.6);
                                }
                            }}
                            style={iconButtonStyle}
                        >
                            <Subscript size={14} />
                        </button>
                        <button
                            title="Uppercase"
                            onClick={() => onAction('uppercase')}
                            style={iconButtonStyle}
                        >
                            <CaseUpper size={14} />
                        </button>
                    </div>



                </>
            )}

            {/* Appearance Section */}
            {renderSectionHeader('Appearance')}

            {renderInputRow('Opacity',
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="range" min="0" max="1" step="0.1" value={selectedObject.opacity || 1} onChange={(e) => onPropertyChange('opacity', safeParseFloat(e.target.value))} style={{ flex: 1 }} />
                    <span style={{ fontSize: '12px', width: '30px', textAlign: 'right' }}>{Math.round((selectedObject.opacity || 1) * 100)}%</span>
                </div>
            )}

            {renderInputRow('Fill',
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="color" value={getHexColor(getPropertyValue('fill', '#000000'))} onChange={(e) => onPropertyChange('fill', e.target.value)} style={{ width: '30px', height: '24px', padding: 0, border: 'none', background: 'none' }} />
                    <input type="text" value={getPropertyValue('fill', '#000000')} onChange={(e) => onPropertyChange('fill', e.target.value)} style={inputStyle} />
                </div>
            )}

            {/* Stroke */}
            {renderInputRow(isText ? 'Text Stroke' : 'Border',
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="color" value={getHexColor(getPropertyValue('stroke', '#000000'))} onChange={(e) => onPropertyChange('stroke', e.target.value)} style={{ width: '30px', height: '24px', padding: 0, border: 'none', background: 'none' }} />
                    <input type="text" value={getPropertyValue('stroke', '#000000')} onChange={(e) => onPropertyChange('stroke', e.target.value)} style={{ ...inputStyle, width: '70px' }} />
                    <input
                        type="number"
                        min="0"
                        value={getPropertyValue('strokeWidth', 0)}
                        onChange={(e) => {
                            const val = safeParseFloat(e.target.value);
                            onPropertyChange('strokeWidth', val);
                            // If setting width > 0 and no color set, default to black
                            if (val > 0 && !getPropertyValue('stroke', '')) {
                                onPropertyChange('stroke', '#000000');
                            }
                        }}
                        style={{ ...inputStyle, width: '40px' }}
                        placeholder="Width"
                    />
                </div>
            )}

            {/* Line Style (Dashed/Solid) */}
            {getPropertyValue('strokeWidth', 0) > 0 && renderInputRow('Style de trait',
                <select
                    value={JSON.stringify(getPropertyValue('strokeDashArray', null))}
                    onChange={(e) => {
                        const val = e.target.value === 'null' ? null : JSON.parse(e.target.value);
                        onPropertyChange('strokeDashArray', val);
                    }}
                    style={inputStyle}
                >
                    <option value="null">Plein</option>
                    <option value="[10,5]">Tirets</option>
                    <option value="[2,2]">Pointillés</option>
                </select>
            )}

            {/* Transform Section */}
            {isText && (
                <>
                    {/* Advanced Text (Stroke, Background) */}
                    {renderSectionHeader('Bloc style')}
                    {renderInputRow('Background',
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="color" value={getHexColor(getPropertyValue('backgroundColor', '')) || '#ffffff'} onChange={(e) => onPropertyChange('backgroundColor', e.target.value)} style={{ width: '30px', height: '24px', padding: 0, border: 'none', background: 'none' }} />
                            <button onClick={() => onPropertyChange('backgroundColor', '')} style={{ border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '10px', padding: '0 4px' }}>Clear</button>
                        </div>
                    )}
                    {renderInputRow('Padding',
                        <input
                            type="number"
                            step="1"
                            min="0"
                            style={inputStyle}
                            value={getPropertyValue('padding', 0)}
                            onChange={(e) => onPropertyChange('padding', safeParseInt(e.target.value, 0))}
                        />
                    )}
                    {renderInputRow('Outline',
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="color" value={getHexColor(getPropertyValue('boxBorderColor', '#000000'))} onChange={(e) => onPropertyChange('boxBorderColor', e.target.value)} style={{ width: '30px', height: '24px', padding: 0, border: 'none', background: 'none' }} />
                            <input type="text" value={getPropertyValue('boxBorderColor', '#000000')} onChange={(e) => onPropertyChange('boxBorderColor', e.target.value)} style={{ ...inputStyle, width: '70px' }} />
                            <input
                                type="number"
                                step="1"
                                min="0"
                                style={{ ...inputStyle, width: '40px' }}
                                value={getPropertyValue('boxBorderWidth', 0)}
                                onChange={(e) => {
                                    const val = safeParseFloat(e.target.value);
                                    onPropertyChange('boxBorderWidth', val);
                                    // If setting width > 0 and no color set, default to black
                                    if (val > 0 && !getPropertyValue('boxBorderColor', '')) {
                                        onPropertyChange('boxBorderColor', '#000000');
                                    }
                                }}
                                title="Outline Width"
                            />
                        </div>
                    )}
                </>
            )}

            {renderSectionHeader('Transform (mm)')}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>X (mm)</label>
                    <input type="number" step="0.1" style={inputStyle}
                        value={Math.round(((selectedObject.left || 0) / PX_PER_MM) * 10) / 10}
                        onChange={(e) => onPropertyChange('left', safeParseFloat(e.target.value) * PX_PER_MM)}
                    />
                </div>
                <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Y (mm)</label>
                    <input type="number" step="0.1" style={inputStyle}
                        value={Math.round(((selectedObject.top || 0) / PX_PER_MM) * 10) / 10}
                        onChange={(e) => onPropertyChange('top', safeParseFloat(e.target.value) * PX_PER_MM)}
                    />
                </div>
                <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>W (mm)</label>
                    <input type="number" step="0.1" style={inputStyle}
                        value={Math.round((((selectedObject.width || 0) * (selectedObject.scaleX || 1)) / PX_PER_MM) * 10) / 10}
                        onChange={(e) => {
                            const newWidthMM = safeParseFloat(e.target.value);
                            const newWidthPx = newWidthMM * PX_PER_MM;
                            if (selectedObject.width && selectedObject.width > 0) {
                                onPropertyChange('scaleX', newWidthPx / selectedObject.width);
                            }
                        }}
                    />
                </div>
                <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>H (mm)</label>
                    <input type="number" step="0.1" style={inputStyle}
                        value={Math.round((((selectedObject.height || 0) * (selectedObject.scaleY || 1)) / PX_PER_MM) * 10) / 10}
                        onChange={(e) => {
                            const newHeightMM = safeParseFloat(e.target.value);
                            const newHeightPx = newHeightMM * PX_PER_MM;
                            if (selectedObject.height && selectedObject.height > 0) {
                                onPropertyChange('scaleY', newHeightPx / selectedObject.height);
                            }
                        }}
                    />
                </div>
            </div>

            {/* Origin Anchor */}
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Point de Référence</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 16px)', gap: '2px' }}>
                    {['top', 'center', 'bottom'].map(y =>
                        ['left', 'center', 'right'].map(x => {
                            const isActive = (selectedObject.originX || 'left') === x && (selectedObject.originY || 'top') === y;
                            return (
                                <div
                                    key={`${x} -${y} `}
                                    onClick={() => onPropertyChange('origin', { originX: x, originY: y })}
                                    style={{
                                        width: '16px', height: '16px',
                                        background: isActive ? 'var(--accent-color)' : 'var(--input-bg)',
                                        border: isActive ? '1px solid var(--accent-color)' : '1px solid var(--input-border)',
                                        cursor: 'pointer',
                                        borderRadius: '2px',
                                        position: 'relative'
                                    }}
                                    title={`Origin: ${y} -${x} `}
                                >
                                    {isActive && <div style={{
                                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                        width: '4px', height: '4px', background: 'white', borderRadius: '50%'
                                    }} />}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {renderInputRow('Rotation',
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="range" min="0" max="360" value={selectedObject.angle || 0} onChange={(e) => onPropertyChange('angle', safeParseFloat(e.target.value))} style={{ flex: 1 }} />
                    <span style={{ fontSize: '12px', width: '30px', textAlign: 'right' }}>{Math.round(selectedObject.angle || 0)}°</span>
                </div>
            )}

            {/* Corner Radius for Rectangles */}
            {selectedObject.type === 'rect' && (
                renderInputRow('Arrondi',
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={(selectedObject as any).rx || 0}
                            onChange={(e) => {
                                const val = safeParseFloat(e.target.value);
                                onPropertyChange('rx', val);
                                onPropertyChange('ry', val);
                            }}
                            style={{ flex: 1 }}
                        />
                        <input
                            type="number"
                            min="0"
                            value={(selectedObject as any).rx || 0}
                            onChange={(e) => {
                                const val = safeParseFloat(e.target.value);
                                onPropertyChange('rx', val);
                                onPropertyChange('ry', val);
                            }}
                            style={{ ...inputStyle, width: '40px' }}
                        />
                    </div>
                )
            )}

            {/* Path Specific Controls */}
            {selectedObject.type === 'path' && (
                <>
                    {renderSectionHeader('Chemin (Path)')}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexDirection: 'column' }}>
                        <button
                            onClick={() => {
                                const pathObj = selectedObject as any; // Cast to access path
                                if (!pathObj.path) return;

                                const path = pathObj.path as any[];
                                const lastCmd = path[path.length - 1];
                                const isClosed = lastCmd[0] === 'Z' || lastCmd[0] === 'z';

                                let newPath;
                                if (isClosed) {
                                    // Open: Remove last 'Z' command
                                    newPath = path.slice(0, -1);
                                } else {
                                    // Close: Append 'Z'
                                    newPath = [...path, ['Z']];
                                }

                                // Apply
                                // Note: We use onPropertyChange to ensure history is saved and UI updates
                                onPropertyChange('path', newPath);

                                // Bonus: If closing and no fill, suggest a fill so user sees it
                                if (!isClosed) {
                                    const currentFill = getPropertyValue('fill', '');
                                    if (!currentFill || currentFill === 'transparent') {
                                        onPropertyChange('fill', '#cccccc');
                                    }
                                }
                            }}
                            style={{
                                padding: '8px',
                                background: 'var(--input-bg)',
                                border: '1px solid var(--input-border)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            {(selectedObject as any).path?.some((c: any) => c[0] === 'Z' || c[0] === 'z')
                                ? <><Minus size={14} /> Ouvrir la forme</>
                                : <><Square size={14} /> Fermer la forme</>
                            }
                        </button>

                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Double-cliquez sur la forme pour éditer les points.
                        </div>
                    </div>
                </>
            )}





            {/* Drop Shadow Section */}
            {renderSectionHeader('Ombre Portée')}
            <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                        type="checkbox"
                        checked={!!selectedObject.shadow}
                        onChange={(e) => {
                            if (e.target.checked) {
                                // Enable Shadow
                                onPropertyChange('shadow', new fabric.Shadow({ color: '#000000', blur: 10, offsetX: 5, offsetY: 5 }));
                            } else {
                                // Disable Shadow
                                onPropertyChange('shadow', null);
                            }
                        }}
                        style={{ marginRight: '8px' }}
                    />
                    <label style={{ fontSize: '12px', color: 'var(--text-primary)' }}>Activer l'ombre</label>
                </div>

                {selectedObject.shadow && (
                    <div style={{ paddingLeft: '8px', borderLeft: '2px solid var(--border-color)' }}>
                        {/* Shadow Color */}
                        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Couleur</label>
                            <input
                                type="color"
                                value={(selectedObject.shadow as fabric.Shadow).color || '#000000'}
                                onChange={(e) => {
                                    const s = selectedObject.shadow as fabric.Shadow;
                                    onPropertyChange('shadow', new fabric.Shadow({ ...s, color: e.target.value }));
                                }}
                                style={{ border: 'none', background: 'transparent', height: '20px', width: '30px', cursor: 'pointer' }}
                            />
                        </div>

                        {/* Blur */}
                        {renderInputRow('Flou',
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="range" min="0" max="50"
                                    value={(selectedObject.shadow as fabric.Shadow).blur || 0}
                                    onChange={(e) => {
                                        const s = selectedObject.shadow as fabric.Shadow;
                                        onPropertyChange('shadow', new fabric.Shadow({ ...s, blur: safeParseFloat(e.target.value) }));
                                    }}
                                    style={{ flex: 1 }}
                                />
                                <span style={{ fontSize: '11px', width: '25px', textAlign: 'right' }}>{(selectedObject.shadow as fabric.Shadow).blur}</span>
                            </div>
                        )}

                        {/* Offset X */}
                        {renderInputRow('Dist. X',
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="range" min="-50" max="50"
                                    value={(selectedObject.shadow as fabric.Shadow).offsetX || 0}
                                    onChange={(e) => {
                                        const s = selectedObject.shadow as fabric.Shadow;
                                        onPropertyChange('shadow', new fabric.Shadow({ ...s, offsetX: safeParseFloat(e.target.value) }));
                                    }}
                                    style={{ flex: 1 }}
                                />
                                <span style={{ fontSize: '11px', width: '25px', textAlign: 'right' }}>{(selectedObject.shadow as fabric.Shadow).offsetX}</span>
                            </div>
                        )}

                        {/* Offset Y */}
                        {renderInputRow('Dist. Y',
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="range" min="-50" max="50"
                                    value={(selectedObject.shadow as fabric.Shadow).offsetY || 0}
                                    onChange={(e) => {
                                        const s = selectedObject.shadow as fabric.Shadow;
                                        onPropertyChange('shadow', new fabric.Shadow({ ...s, offsetY: safeParseFloat(e.target.value) }));
                                    }}
                                    style={{ flex: 1 }}
                                />
                                <span style={{ fontSize: '11px', width: '25px', textAlign: 'right' }}>{(selectedObject.shadow as fabric.Shadow).offsetY}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Text Specific Context */}


            {/* Image Crop Section */}
            {type === 'image' && (
                <>
                    {renderSectionHeader('Crop & Frame')}
                    {isCropping && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--accent-color)', textAlign: 'center', padding: '4px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px' }}>
                                Adjust the white rectangle over the image.
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={onApplyCrop}
                                    style={{
                                        flex: 1,
                                        padding: '6px',
                                        fontSize: '11px',
                                        background: 'var(--accent-color)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Apply
                                </button>
                                <button
                                    onClick={onCancelCrop}
                                    style={{
                                        flex: 1,
                                        padding: '6px',
                                        fontSize: '11px',
                                        background: 'var(--input-bg)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Image Crop Trigger */}
            {type === 'image' && (
                <>
                    {!isCropping && (
                        <button
                            onClick={onStartCrop}
                            style={{
                                width: '100%',
                                padding: '8px',
                                fontSize: '11px',
                                background: 'var(--input-bg)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            <ImageIcon size={14} /> Crop Image
                        </button>
                    )}
                </>
            )}


            {/* Arrangement */}
            {renderSectionHeader('Arrange')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <button onClick={() => onAction('bringToFront')} title="Bring to Front" style={iconButtonStyle}>
                    <BringToFront size={14} /> <span style={{ marginLeft: 4, fontSize: 10 }}>Front</span>
                </button>
                <button onClick={() => onAction('sendToBack')} title="Send to Back" style={iconButtonStyle}>
                    <SendToBack size={14} /> <span style={{ marginLeft: 4, fontSize: 10 }}>Back</span>
                </button>
                <button onClick={() => onAction('bringForward')} title="Bring Forward" style={iconButtonStyle}>
                    <MoveUp size={14} /> <span style={{ marginLeft: 4, fontSize: 10 }}>Up</span>
                </button>
                <button onClick={() => onAction('sendBackwards')} title="Send Backward" style={iconButtonStyle}>
                    <MoveDown size={14} /> <span style={{ marginLeft: 4, fontSize: 10 }}>Down</span>
                </button>
            </div>

            <button
                onClick={() => onAction('delete')}
                style={{
                    marginTop: '20px',
                    width: '100%',
                    padding: '8px',
                    background: '#3e2020',
                    color: '#ff6b6b',
                    border: '1px solid #5c3030',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}>
                <Trash2 size={14} /> Delete Object
            </button>

        </div >
    );
};
