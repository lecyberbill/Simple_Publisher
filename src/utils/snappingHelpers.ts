import * as fabric from 'fabric';

/**
 * Initializes aligning guidelines for the canvas.
 * @param canvas The fabric canvas instance.
 * @param isEnabled A getter function to check if snapping is enabled.
 */
export const initAligningGuidelines = (canvas: fabric.Canvas, isEnabled: () => boolean) => {
    const ctx = canvas.getContext();
    // const aligningLineOffset = 5;
    const aligningLineMargin = 4;
    const aligningLineWidth = 1;
    const aligningLineColor = 'rgb(255, 0, 77)'; // Vibrant distinct color

    let viewportTransform: fabric.TMat2D; // Fix type
    let zoom = 1;

    function drawVerticalLine(coords: { x: number; y1: number; y2: number }) {
        if (!viewportTransform) {
            viewportTransform = (canvas.viewportTransform as unknown as fabric.TMat2D) || [1, 0, 0, 1, 0, 0];
        }
        drawLine(
            coords.x + 0.5,
            coords.y1 > coords.y2 ? coords.y2 : coords.y1,
            coords.x + 0.5,
            coords.y1 > coords.y2 ? coords.y1 : coords.y2
        );
    }

    function drawHorizontalLine(coords: { y: number; x1: number; x2: number }) {
        drawLine(
            coords.x1 > coords.x2 ? coords.x2 : coords.x1,
            coords.y + 0.5,
            coords.x1 > coords.x2 ? coords.x1 : coords.x2,
            coords.y + 0.5
        );
    }

    function drawLine(x1: number, y1: number, x2: number, y2: number) {
        if (!ctx) return;
        ctx.save();
        ctx.lineWidth = aligningLineWidth;
        ctx.strokeStyle = aligningLineColor;
        ctx.beginPath();
        ctx.moveTo(
            fabric.util.transformPoint({ x: x1, y: y1 } as fabric.Point, viewportTransform).x,
            fabric.util.transformPoint({ x: x1, y: y1 } as fabric.Point, viewportTransform).y
        );
        ctx.lineTo(
            fabric.util.transformPoint({ x: x2, y: y2 } as fabric.Point, viewportTransform).x,
            fabric.util.transformPoint({ x: x2, y: y2 } as fabric.Point, viewportTransform).y
        );
        ctx.stroke();
        ctx.restore();
    }

    function isInRange(value1: number, value2: number) {
        value1 = Math.round(value1);
        value2 = Math.round(value2);
        for (
            let i = value1 - aligningLineMargin;
            i <= value1 + aligningLineMargin;
            i++
        ) {
            if (i === value2) {
                return true;
            }
        }
        return false;
    }

    const verticalLines: { x: number; y1: number; y2: number }[] = [];
    const horizontalLines: { y: number; x1: number; x2: number }[] = [];

    canvas.on('mouse:down', () => {
        viewportTransform = (canvas.viewportTransform as unknown as fabric.TMat2D) || [1, 0, 0, 1, 0, 0];
        zoom = canvas.getZoom();
    });

    canvas.on('object:moving', (e) => {
        if (!isEnabled()) return;
        viewportTransform = (canvas.viewportTransform as unknown as fabric.TMat2D) || [1, 0, 0, 1, 0, 0];
        zoom = canvas.getZoom();

        const activeObject = e.target;
        if (!activeObject) return;

        const canvasObjects = canvas.getObjects();
        const activeObjectCenter = activeObject.getCenterPoint();
        const activeObjectLeft = activeObjectCenter.x;
        const activeObjectTop = activeObjectCenter.y;
        // const activeObjectBoundingRect = activeObject.getBoundingRect();
        // const activeObjectWidth = activeObjectBoundingRect.width / viewportTransform[0];
        // const activeObjectHeight = activeObjectBoundingRect.height / viewportTransform[3];

        // Reset lines
        verticalLines.length = 0;
        horizontalLines.length = 0;

        // Snap to Canvas Center
        // @ts-ignore
        const canvasWidth = canvas.width / zoom;
        // @ts-ignore
        const canvasHeight = canvas.height / zoom;

        // We assume Page is approx size of workspace, but let's just use simple center first? 
        // Actually simpler: snap to other objects AND Page Center(s).
        // Let's manually add 'canvas center' as a target
        const canvasCenter = { x: canvasWidth / 2, y: canvasHeight / 2 };

        let snapX = null;
        let snapY = null;

        function snap(type: 'x' | 'y', value: number) {
            if (type === 'x') snapX = value;
            if (type === 'y') snapY = value;
        }

        // Iterate over objects
        for (let i = canvasObjects.length; i--;) {
            const obj = canvasObjects[i];
            // Skip active object, unsupported objects and background page if desired (though snapping to page edge is cool, let's treat page like rect for now if it is selectable/visible?)
            // Actually we want to snap to EVERYTHING except itself.
            if (obj === activeObject) continue;

            // If object is invisible or excludes from export (maybe grid?), skip?
            // Let's keep it simple.
            // @ts-ignore
            if (obj.isHandle || obj.isDrawingPath) continue;

            const objectCenter = obj.getCenterPoint();
            const objectBoundingRect = obj.getBoundingRect();
            const objectWidth = objectBoundingRect.width / viewportTransform[0];
            // const objectHeight = objectBoundingRect.height / viewportTransform[3];

            // SNAP VERTICAL (X alignment)
            // 1. Center to Center
            if (isInRange(activeObjectLeft, objectCenter.x)) {
                verticalLines.push({ x: objectCenter.x, y1: -5000, y2: 5000 }); // Draw infinite line
                snap('x', objectCenter.x);
            }

            // 2. Left to Left
            // 3. Right to Right
            // ... For simplicity let's stick to Centers first, or edges if strictly requested.
            // Let's add Edge/Center snapping.

            const objLeft = objectCenter.x - objectWidth / 2;
            const objRight = objectCenter.x + objectWidth / 2;
            // const activeLeft = activeObjectLeft - activeObjectWidth / 2;
            // const activeRight = activeObjectLeft + activeObjectWidth / 2;

            // Snap Center to Object Edges
            if (isInRange(activeObjectLeft, objLeft)) {
                verticalLines.push({ x: objLeft, y1: -5000, y2: 5000 });
                snap('x', objLeft);
            }
            if (isInRange(activeObjectLeft, objRight)) {
                verticalLines.push({ x: objRight, y1: -5000, y2: 5000 });
                snap('x', objRight);
            }
        }

        // SNAP TO CANVAS CENTER
        if (isInRange(activeObjectLeft, canvasCenter.x)) {
            verticalLines.push({ x: canvasCenter.x, y1: -5000, y2: 5000 });
            snap('x', canvasCenter.x);
        }
        if (isInRange(activeObjectTop, canvasCenter.y)) {
            horizontalLines.push({ y: canvasCenter.y, x1: -5000, x2: 5000 });
            snap('y', canvasCenter.y);
        }

        // Iteration for Horizontal (Y)
        for (let i = canvasObjects.length; i--;) {
            const obj = canvasObjects[i];
            if (obj === activeObject || (obj as any).isHandle) continue;

            const objectCenter = obj.getCenterPoint();
            // Center to Center
            if (isInRange(activeObjectTop, objectCenter.y)) {
                horizontalLines.push({ y: objectCenter.y, x1: -5000, x2: 5000 });
                snap('y', objectCenter.y);
            }
        }

        // Apply Snaps
        if (snapX !== null) {
            activeObject.setPositionByOrigin(
                new fabric.Point(snapX, activeObjectTop),
                'center',
                'center'
            );
            // We must update activeObjectLeft for subsequent Y check if we wanted precision, but here X/Y are independent mostly
        }
        if (snapY !== null) {
            activeObject.setPositionByOrigin(
                new fabric.Point(snapX ?? activeObjectLeft, snapY),
                'center',
                'center'
            );
        }

        // Render Guidelines
        // We can't draw directly here easily without messing up cache, but we can hook into render
        // Or just force a render of top context?
        // Fabric suggests using 'after:render' but we need to pass data.

        // Ideally we queue a render.
        canvas.requestRenderAll();
    });

    canvas.on('after:render', () => {
        if (!isEnabled()) return;
        for (let i = verticalLines.length; i--;) {
            drawVerticalLine(verticalLines[i]);
        }
        for (let i = horizontalLines.length; i--;) {
            drawHorizontalLine(horizontalLines[i]);
        }
    });

    canvas.on('mouse:up', () => {
        verticalLines.length = 0;
        horizontalLines.length = 0;
        canvas.requestRenderAll();
    });
};
