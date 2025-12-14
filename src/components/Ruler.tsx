import React, { useEffect, useRef } from 'react';
import * as fabric from 'fabric';

interface RulerProps {
    orientation: 'horizontal' | 'vertical';
    canvas: fabric.Canvas | null;
    width?: number;
    height?: number;
    onMouseDown?: (e: React.MouseEvent) => void;
}

export const Ruler: React.FC<RulerProps> = ({ orientation, canvas, onMouseDown }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!canvas || !canvasRef.current || !containerRef.current) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Redraw function
        const draw = () => {
            if (!canvasRef.current || !containerRef.current || !canvas) return;

            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;

            // Handle High DPI
            const dpr = window.devicePixelRatio || 1;
            canvasRef.current.width = width * dpr;
            canvasRef.current.height = height * dpr;
            ctx.scale(dpr, dpr);
            canvasRef.current.style.width = `${width}px`;
            canvasRef.current.style.height = `${height}px`;

            // Clear
            ctx.fillStyle = '#f0f0f0'; // Ruler background
            ctx.fillRect(0, 0, width, height);
            ctx.strokeStyle = '#999';
            ctx.fillStyle = '#666';
            ctx.font = '10px sans-serif';
            ctx.beginPath();

            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            const zoom = canvas.getZoom();
            const panX = vpt[4];
            const panY = vpt[5];

            const PX_PER_MM = 3.779527559; // 96 DPI / 25.4

            // Logic: Iterate millimeters
            // Screen Pixel = (MM * PX_PER_MM * zoom) + Pan

            const startPixel = 0;
            const endPixel = orientation === 'horizontal' ? width : height;

            // Determine range in MM
            // MM = (Pixel - Pan) / (Zoom * PX_PER_MM)
            const startMM = (startPixel - (orientation === 'horizontal' ? panX : panY)) / (zoom * PX_PER_MM);
            const endMM = (endPixel - (orientation === 'horizontal' ? panX : panY)) / (zoom * PX_PER_MM);

            // Determine visibility threshold
            // 1mm at screen = PX_PER_MM * zoom
            const pxPerMMResult = PX_PER_MM * zoom;

            // Step sizes for loop
            let majorStep = 10; // 1cm

            // If zoomed out a lot, show fewer numbers
            if (pxPerMMResult < 2) majorStep = 50; // 5cm
            if (pxPerMMResult < 0.5) majorStep = 100; // 10cm

            const startTick = Math.floor(startMM / 1) * 1 - 1; // Start slightly before
            const endTick = Math.ceil(endMM / 1) * 1 + 1;

            for (let mm = startTick; mm <= endTick; mm++) {
                // Pixel position
                const pixel = (mm * PX_PER_MM * zoom) + (orientation === 'horizontal' ? panX : panY);

                if (pixel < -50 || pixel > (orientation === 'horizontal' ? width : height) + 50) continue;

                let tickSize = 0;
                let showLabel = false;

                // 10mm (1cm)
                if (mm % majorStep === 0) {
                    tickSize = 12; // Long tick
                    showLabel = true;
                }
                // 5mm
                else if (mm % 5 === 0 && pxPerMMResult > 1.5) {
                    tickSize = 8;
                }
                // 1mm
                else if (pxPerMMResult > 3) {
                    tickSize = 4;
                }

                if (tickSize > 0) {
                    if (orientation === 'horizontal') {
                        ctx.moveTo(pixel, height);
                        ctx.lineTo(pixel, height - tickSize);
                        if (showLabel) {
                            ctx.fillText(Math.round(mm).toString(), pixel + 2, height - 12);
                        }
                    } else {
                        ctx.moveTo(width, pixel);
                        ctx.lineTo(width - tickSize, pixel);
                        if (showLabel) {
                            ctx.save();
                            ctx.translate(width - 12, pixel + 2);
                            ctx.rotate(-Math.PI / 2);
                            ctx.fillText(Math.round(mm).toString(), 0, 0);
                            ctx.restore();
                        }
                    }
                }
            }
            ctx.stroke();
        };

        // Listeners
        canvas.on('mouse:wheel', draw);
        canvas.on('mouse:move', draw);
        canvas.on('object:moving', draw);
        canvas.on('after:render', draw);

        // Initial draw
        draw();

        // Also listen to window resize
        const ro = new ResizeObserver(draw);
        ro.observe(containerRef.current);

        return () => {
            canvas.off('mouse:wheel', draw);
            canvas.off('mouse:move', draw);
            canvas.off('object:moving', draw);
            canvas.off('after:render', draw);
            ro.disconnect();
        };
    }, [canvas, orientation]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            <canvas
                ref={canvasRef}
                onMouseDown={onMouseDown}
                style={{
                    cursor: orientation === 'horizontal' ? 'ns-resize' : 'ew-resize',
                    display: 'block'
                }}
            />
        </div>
    );
};
