import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';

interface CanvasAreaProps {
    onCanvasReady: (canvas: fabric.Canvas) => void;
    onSelectionChange?: (selectedObject: fabric.Object | null) => void;
    children?: React.ReactNode;
}

export const CanvasArea = ({ onCanvasReady, onSelectionChange, children }: CanvasAreaProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasEl = useRef<HTMLCanvasElement>(null);
    const canvasInstance = useRef<fabric.Canvas | null>(null);

    // Initialize Canvas (Run once)
    useEffect(() => {
        if (!canvasEl.current || !containerRef.current) return;

        // Create canvas with initial size (will resize immediately)
        const newCanvas = new fabric.Canvas(canvasEl.current, {
            height: containerRef.current.clientHeight,
            width: containerRef.current.clientWidth,
            backgroundColor: '#e0e0e0', // Workspace Gray
            preserveObjectStacking: true,
            fireRightClick: true,  // Enable right click events (mouse:down with button 3)
            stopContextMenu: true, // Prevent native browser context menu
        });

        canvasInstance.current = newCanvas;

        // Notify parent
        if (onCanvasReady) {
            onCanvasReady(newCanvas);
        }

        // Resize Observer
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (canvasInstance.current) {
                    canvasInstance.current.setDimensions({ width, height });
                    canvasInstance.current.requestRenderAll();
                    // Notify App component to re-center
                    // @ts-ignore
                    canvasInstance.current.fire('resize', { width, height });
                }
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        console.log("CanvasArea: MOUNTED / INITIALIZED");

        return () => {
            console.log("CanvasArea: UNMOUNTING / DISPOSING");
            resizeObserver.disconnect();
            if (canvasInstance.current) {
                canvasInstance.current.dispose();
                canvasInstance.current = null;
            }
        };
    }, []); // Run only once

    // Update Event Listeners
    useEffect(() => {
        const canvas = canvasInstance.current;
        if (!canvas) return;

        const handleSelection = () => {
            const activeObject = canvas.getActiveObject();
            if (onSelectionChange) {
                onSelectionChange(activeObject || null);
            }
        };

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', handleSelection);

        return () => {
            canvas.off('selection:created', handleSelection);
            canvas.off('selection:updated', handleSelection);
            canvas.off('selection:cleared', handleSelection);
        };
    }, [onSelectionChange]);


    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%', // Take full available space
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Render custom controls (Ruler) above the canvas */}
            {children && <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 100, width: '100%' }}>{children}</div>}

            <canvas ref={canvasEl} />
        </div>
    );
};
