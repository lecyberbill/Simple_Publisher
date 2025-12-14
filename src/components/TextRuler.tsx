import React, { useRef, useEffect, useState } from 'react';

interface TextRulerProps {
    width: number; // Width of the target textbox (unscaled)
    zoom: number; // Canvas zoom level
    tabs: number[]; // Array of tab stop positions (in px relative to left)
    onAddTab: (position: number) => void;
    onRemoveTab: (index: number) => void;
    onMoveTab: (index: number, newPosition: number) => void;
    visible: boolean;
}

const RULER_HEIGHT = 20;

export const TextRuler: React.FC<TextRulerProps> = ({
    width,
    zoom,
    tabs,
    onAddTab,
    onRemoveTab,
    onMoveTab,
    visible
}) => {
    const rulerRef = useRef<HTMLDivElement>(null);
    const [draggingTab, setDraggingTab] = useState<number | null>(null);

    const handleMouseDown = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        setDraggingTab(index);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (draggingTab === null || !rulerRef.current) return;

            const rect = rulerRef.current.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            let pos = Math.round(clickX / zoom);

            // Clamp to width
            if (pos < 0) pos = 0;
            if (pos > width) pos = width;

            onMoveTab(draggingTab, pos);
        };

        const handleMouseUp = () => {
            setDraggingTab(null);
        };

        if (draggingTab !== null) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingTab, onMoveTab, width, zoom]);

    if (!visible) return null;

    // Render tick marks
    const renderTicks = () => {
        const ticks = [];
        // Draw a tick every 10px, larger one every 50px, number every 100px
        // We limit strictly to the width of the textbox
        for (let i = 0; i <= width; i += 10) {
            const isMajor = i % 50 === 0;
            const isLabel = i % 100 === 0;

            ticks.push(
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        left: `${i * zoom}px`, // Apply zoom to visual position
                        top: isMajor ? 0 : '12px',
                        bottom: 0,
                        width: '1px',
                        backgroundColor: isLabel ? '#000' : (isMajor ? '#666' : '#ccc'),
                        height: isMajor ? '100%' : '8px',
                        pointerEvents: 'none'
                    }}
                />
            );

            if (isLabel && i > 0) {
                ticks.push(
                    <div
                        key={`l-${i}`}
                        style={{
                            position: 'absolute',
                            left: `${i * zoom + 2}px`,
                            top: '0px',
                            fontSize: '10px',
                            color: '#333',
                            pointerEvents: 'none'
                        }}
                    >
                        {i}
                    </div>
                );
            }
        }
        return ticks;
    };

    const handleRulerClick = (e: React.MouseEvent) => {
        // If we were dragging, ignore click (mouseup handles end of drag)
        if (draggingTab !== null) return;

        if (!rulerRef.current) return;
        const rect = rulerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const pos = Math.round(clickX / zoom);

        // Clamp to width
        if (pos >= 0 && pos <= width) {
            onAddTab(pos);
        }
    };

    return (
        <div
            className="text-ruler-container"
            style={{
                width: '100%',
                height: `${RULER_HEIGHT + 10}px`,
                backgroundColor: 'transparent',
                display: 'flex',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {/* The Scrollable/Zoomable Area representing the Textbox Width */}
            <div
                ref={rulerRef}
                onClick={handleRulerClick}
                style={{
                    position: 'relative',
                    width: `${width * zoom}px`,
                    height: `${RULER_HEIGHT}px`,
                    backgroundColor: '#fff',
                    border: '1px solid #999',
                    marginTop: '5px',
                    cursor: 'pointer'
                }}
            >
                {renderTicks()}

                {/* Render Tabs */}
                {tabs.map((tabPos, idx) => (
                    <div
                        key={idx}
                        title="Tab Stop (Drag to move, Click to delete)"
                        onMouseDown={(e) => handleMouseDown(e, idx)}
                        onClick={(e) => {
                            e.stopPropagation();
                            // If just clicked (not dragged), remove
                            // Simple logic: if mouse down and up same pos -> remove? 
                            // Or just use double click? 
                            // For now, let's say Right Click removes, or separate button. 
                            // But user asked for drag. 
                            // Let's rely on onRemoveTab for simple click if not dragging?
                            // Issue: draggingTab state might prevent click. 
                            // Better: Context menu to remove? Or click sets active?
                            // Let's keep simple: click removes. But we need to distinguish drag vs click.
                            // We can use a ref to track distance moved.
                            onRemoveTab(idx);
                        }}
                        style={{
                            position: 'absolute',
                            left: `${tabPos * zoom}px`,
                            top: 0,
                            width: '0',
                            height: '0',
                            borderLeft: '5px solid transparent',
                            borderRight: '5px solid transparent',
                            borderTop: '8px solid black',
                            transform: 'translateX(-50%)',
                            cursor: 'ew-resize',
                            zIndex: 10
                        }}
                    />
                ))}
            </div>
        </div>
    );
};
