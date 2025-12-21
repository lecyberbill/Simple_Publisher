import * as fabric from 'fabric';

// --- EXTERNAL HANDLES EDITING SYSTEM ---

/*
  Instead of using Fabric's internal 'controls' API which caused stability issues with
  bounding box recalculations, we spawn independent fabric.Object helpers (Circles/Lines)
  directly onto the canvas.
*/

// Types for our custom properties on the handle objects
export interface PathControlHandle extends fabric.Circle {
    isPathControl?: boolean;
    pathObj?: fabric.Path;
    cmdIndex?: number;
    coordIndex?: number; // 1 for x, 2 for y usually (or 0 for simple types? no, 0 is command char)
    controlType?: 'anchor' | 'cp1' | 'cp2';
}

// Store references to helpers to clean them up easily
// We can attach them to the path object itself for easier state management
// (pathObj as any).__editorHelpers = [];

export const enterPathEditMode = (pathObj: fabric.Path, canvas: fabric.Canvas) => {
    if (!pathObj.path) return;

    // Safety check: Prevent editing complex paths (like brush strokes) to avoid freezing
    if (pathObj.path.length > 200) {
        console.warn("Path too complex for vertex editing (" + pathObj.path.length + " points).");
        return;
    }

    // 1. Lock the main path so it can't be moved/scaled while editing points
    pathObj.set({
        selectable: false,
        evented: false, // Let events pass through to handles? Or just false to prevent drag.
        opacity: 0.5, // Visual cue
        objectCaching: false // Disable caching to prevent clipping when points move outside original bounds
    });

    const helpers: fabric.Object[] = [];
    const matrix = pathObj.calcTransformMatrix();
    const pathOffset = pathObj.pathOffset || { x: 0, y: 0 };


    pathObj.path.forEach((cmd, index) => {
        const type = cmd[0];

        // Helper to spawn a handle
        const spawnHandle = (x: number, y: number, role: 'anchor' | 'cp1' | 'cp2', cIndex: number) => {
            // Convert Local Path Coordinate -> Canvas Coordinate
            const localPoint = new fabric.Point(x - pathOffset.x, y - pathOffset.y);
            const absPoint = fabric.util.transformPoint(localPoint, matrix);

            const handle = new fabric.Circle({
                left: absPoint.x,
                top: absPoint.y,
                radius: role === 'anchor' ? 6 : 4,
                fill: role === 'anchor' ? '#fff' : '#ff4444',
                stroke: '#333',
                strokeWidth: 1,
                originX: 'center',
                originY: 'center',
                hasControls: false,
                hasBorders: false,
                // Custom props
                // @ts-ignore
                isPathControl: true,
                pathObj: pathObj,
                cmdIndex: index,
                coordIndex: cIndex,
                controlType: role
            }) as PathControlHandle;

            // Important: Handle movement logic
            handle.on('mousedown', (opt) => {
                // Right click detection (button 3 is typical for right click in Fabric/VisualEvent)
                // Fabric normalized: button 1=left, 2=middle, 3=right
                const evt = opt as any; // Cast to any to avoid TS error on 'button'
                if (evt.button === 3 || (evt.e as MouseEvent).button === 2) {
                    canvas.setActiveObject(handle);
                    canvas.requestRenderAll();
                }
            });

            handle.on('moving', (e) => {
                const newPos = handle.getCenterPoint();

                // Convert Canvas Coordinate -> Local Path Coordinate
                // We need to invert the path's matrix
                // Note: The path's matrix might change if we recalc bounds! 
                // BUT with external handles, we usually keep the path static (no recalc) until finished?
                // OR we accept that the path updates. 
                // Better approach: Calculate local point based on CURRENT path matrix.

                const invertM = fabric.util.invertTransform(pathObj.calcTransformMatrix());
                const newLocal = fabric.util.transformPoint(newPos, invertM);

                // Add pathOffset back
                // path's data is: local + pathOffset
                const finalX = newLocal.x + pathOffset.x;
                const finalY = newLocal.y + pathOffset.y;

                // Update Path Data
                // @ts-ignore
                pathObj.path[index][cIndex] = finalX;
                // @ts-ignore
                pathObj.path[index][cIndex + 1] = finalY;

                // Update visual lines (connectors)
                updateConnectors(pathObj, helpers, canvas);

                // Render
                // Note: We DO NOT call _calcDimensions here to avoid the "jumping point" issue.
                // We just mark dirty.
                pathObj.set({ dirty: true });
                canvas.requestRenderAll();
            });

            canvas.add(handle);
            helpers.push(handle);
            return handle;
        };

        // Spawn based on command type (SVG Path commands)
        // M x y
        // L x y
        // C cp1x cp1y cp2x cp2y x y
        // Q cp1x cp1y x y

        if (type === 'M' || type === 'L') {
            spawnHandle(cmd[1] as number, cmd[2] as number, 'anchor', 1);
        } else if (type === 'C') {
            // Anchor is last
            spawnHandle(cmd[5] as number, cmd[6] as number, 'anchor', 5);
            spawnHandle(cmd[1] as number, cmd[2] as number, 'cp1', 1);
            spawnHandle(cmd[3] as number, cmd[4] as number, 'cp2', 3);

            // Link them visually
        } else if (type === 'Q') {
            spawnHandle(cmd[3] as number, cmd[4] as number, 'anchor', 3);
            spawnHandle(cmd[1] as number, cmd[2] as number, 'cp1', 1);
        }
    });

    // Create Connector Lines (Visual only)
    updateConnectors(pathObj, helpers, canvas);

    // Store helpers on the object so we can remove them later
    // @ts-ignore
    pathObj._editorHelpers = helpers;

    canvas.requestRenderAll();
};

export const exitPathEditMode = (pathObj: fabric.Path, canvas: fabric.Canvas, skipRecalc: boolean = false) => {
    // @ts-ignore
    const helpers = pathObj._editorHelpers as fabric.Object[];
    if (helpers) {
        helpers.forEach(h => canvas.remove(h));
        // @ts-ignore
        pathObj._editorHelpers = undefined;
    }

    // Restore Path state
    pathObj.set({
        selectable: true,
        evented: true,
        opacity: 1,
        objectCaching: true // Re-enable caching
    });

    if (!skipRecalc) {
        // RECALCULATE DIMENSIONS from new path data
        // This is crucial because moving points changes the bounding box of the path commands.
        // usage of private methods is unstable but necessary for deep updates like this in v6?
        // Actually, we can use set({ path... }) but we already modified the path array in place.

        // 1. Get current Absolute Position of the "Old" Center (or top-left)
        // We want the object to stay visually where it is.
        // The issue is that width/height changes shift the transform origin.

        // Fabric has a method to update dimensions from path:
        const dims = (pathObj as any)._calcDimensions();

        // We need to update pathOffset, width, height.
        // And shift left/top to compensate for the pathOffset change.

        // Current visible center
        const center = pathObj.getCenterPoint();

        pathObj.set({
            width: dims.width,
            height: dims.height,
            pathOffset: { x: dims.left + dims.width / 2, y: dims.top + dims.height / 2 }
        });

        // Restore center position
        pathObj.setPositionByOrigin(center, 'center', 'center');

        pathObj.setCoords();
    }

    canvas.requestRenderAll();
};

// Helper: draw dashed lines between CPs and Anchors
const updateConnectors = (_pathObj: fabric.Path, helpers: fabric.Object[], canvas: fabric.Canvas) => {
    // Remove old connectors
    const handles = helpers.filter(h => h.type === 'circle') as PathControlHandle[]; // Explicit cast
    const oldLines = helpers.filter(h => h.type === 'line');

    oldLines.forEach(l => {
        canvas.remove(l);
        const idx = helpers.indexOf(l);
        if (idx > -1) helpers.splice(idx, 1);
    });

    // Re-draw lines
    // We need to know which handle belongs to which command.
    // Handles have `cmdIndex`.

    // Group handles by cmdIndex
    const byCmd: { [key: number]: PathControlHandle[] } = {};
    handles.forEach((h: PathControlHandle) => {
        if (h.cmdIndex === undefined) return;
        if (!byCmd[h.cmdIndex]) byCmd[h.cmdIndex] = [];
        byCmd[h.cmdIndex].push(h);
    });

    Object.keys(byCmd).forEach(k => {
        const index = parseInt(k);
        const group = byCmd[index];
        // expected: Anchor + CPs
        const anchor = group.find(h => h.controlType === 'anchor');
        const cp1 = group.find(h => h.controlType === 'cp1');
        const cp2 = group.find(h => h.controlType === 'cp2');

        const drawLine = (p1: fabric.Object, p2: fabric.Object) => {
            const line = new fabric.Line([p1.left!, p1.top!, p2.left!, p2.top!], {
                stroke: '#888',
                strokeDashArray: [3, 3],
                selectable: false,
                evented: false,
                originX: 'center',
                originY: 'center'
            });
            canvas.add(line);
            // canvas.sendToBack is invalid? Use object method or canvas.sendObjectToBack
            // Fabric v6: canvas.sendObjectToBack(line)
            canvas.sendObjectToBack(line);
            helpers.push(line);
        };

        if (anchor && cp1) drawLine(anchor, cp1);
        if (anchor && cp2) drawLine(anchor, cp2);

        // For C curves, CP1 is usually connected to PREVIOUS anchor? 
        // SVG logic: 
        // C cp1 cp2 anchor
        // cp1 controls tangent at start (previous point).
        // cp2 controls tangent at end (current anchor).
        // So visually: cp2 connects to current anchor. cp1 connects to PREVIOUS anchor.

        // Locate previous anchor
        if (cp1) {
            // Find prompt handle for index-1
            // This is O(N) but N is small.
            // Ideally we need a map.
            // Let's assume CP1 connects to current anchor for simplicity in v1, 
            // OR try to find index-1 anchor.

            // This logic allows CP handles to "dangle" visually if we don't connect them right,
            // but standard vector tools connect CP to the anchor it influences TANGENT for.
            // CP2 -> Anchor (Current). Correct.
            // CP1 -> Anchor (Previous). 

            // NOTE: Our simple renderer above just connects everything in the group.
            // If we want correct visuals:
            // if (cp2 && anchor) drawLine(cp2, anchor);
            // if (cp1) { ... find prev anchor ... }

            // For now, let's stick to connecting to the anchor defined in the SAME command
            // because that's where the data lives. It might look slightly "off" for CP1 but it shows association.
            // Actually, in SVG 'C', CP1 is associated with the start point (prev anchor).

            if (cp2 && anchor) drawLine(cp2, anchor);

            if (cp1) {
                // Try find prev anchor
                let prevIdx = index - 1;
                // If M at 0, prev is invalid? M is start.
                if (prevIdx >= 0) {
                    // Check 'byCmd[prevIdx]'
                    const prevGroup = byCmd[prevIdx];
                    if (prevGroup) {
                        const prevAnchor = prevGroup.find(h => h.controlType === 'anchor');
                        if (prevAnchor) drawLine(cp1, prevAnchor);
                    }
                }
            }
        }
    });
};

export const togglePathPointType = (pathObj: fabric.Path, pointIndex: number, canvas: fabric.Canvas) => {
    // This function needs to handle the data update AND 
    // refresh the external handles since the command type changes.

    if (!pathObj.path) return;
    const cmd = pathObj.path[pointIndex];
    if (!cmd) return;
    const type = cmd[0];

    console.log("togglePathPointType called", { pointIndex, currentType: type, pathCmd: cmd });

    // Logic similar to before but adapted
    if (type === 'L' || (type === 'M' && pointIndex > 0)) {
        if (type === 'M') { console.warn("Move command cannot be curved"); return; }

        // L -> C conversion
        // Need prev point
        const prevCmd = pathObj.path[pointIndex - 1];
        let prevX = 0, prevY = 0;
        if (prevCmd[0] === 'M' || prevCmd[0] === 'L') {
            prevX = prevCmd[1] as number;
            prevY = prevCmd[2] as number;
        } else if (prevCmd[0] === 'C') {
            prevX = prevCmd[5] as number;
            prevY = prevCmd[6] as number;
        } else if (prevCmd[0] === 'Q') {
            prevX = prevCmd[3] as number;
            prevY = prevCmd[4] as number;
        }

        const currX = cmd[1] as number;
        const currY = cmd[2] as number;

        const cp1x = prevX + (currX - prevX) / 3;
        const cp1y = prevY + (currY - prevY) / 3;
        const cp2x = prevX + 2 * (currX - prevX) / 3;
        const cp2y = prevY + 2 * (currY - prevY) / 3;

        // @ts-ignore
        pathObj.path[pointIndex] = ['C', cp1x, cp1y, cp2x, cp2y, currX, currY];

    } else if (type === 'C' || type === 'Q') {
        // C/Q -> L
        // Extract anchor
        const destX = type === 'C' ? cmd[5] : cmd[3];
        const destY = type === 'C' ? cmd[6] : cmd[4];
        // @ts-ignore
        pathObj.path[pointIndex] = ['L', destX, destY];
    }

    pathObj.set({ dirty: true });

    // REFRESH HANDLES
    // Flag to prevent App.tsx from exiting edit mode due to selection:cleared
    // @ts-ignore
    pathObj._isRefreshing = true;

    exitPathEditMode(pathObj, canvas);
    enterPathEditMode(pathObj, canvas);

    // Attempt to re-select the anchor at the same index to keep context
    const objects = canvas.getObjects();
    // @ts-ignore
    const newHandle = objects.find(o => o.isPathControl && o.pathObj === pathObj && o.cmdIndex === pointIndex && o.controlType === 'anchor');
    if (newHandle) {
        canvas.setActiveObject(newHandle);
    }

    // @ts-ignore
    delete pathObj._isRefreshing;

    canvas.requestRenderAll();
};

export const getStarPoints = (numPoints: number, outerRadius: number, innerRadius: number) => {
    const points = [];
    const cx = 0;
    const cy = 0;
    let angle = -Math.PI / 2; // Start at top
    const step = Math.PI / numPoints;

    for (let i = 0; i < numPoints * 2; i++) {
        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        points.push({ x, y });
        angle += step;
    }
    return points;
};

