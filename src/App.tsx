import { useState, useEffect, useRef, useCallback } from 'react'
import * as fabric from 'fabric';
import {
  Square, Type, Image as ImageIcon, Save, FolderOpen, FilePlus, Undo2, Redo2, Trash2, Download, Circle, Triangle, Minus, Group, Ungroup, Copy, StickyNote, BringToFront, SendToBack,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  ZoomIn, ZoomOut, Maximize,
  Star, QrCode
} from 'lucide-react';
import QRCode from 'qrcode';
import './App.css'
import { CanvasArea } from './components/CanvasArea';
import { PropertiesPanel } from './components/PropertiesPanel';
import { LayersPanel } from './components/LayersPanel';
import { ContextMenu } from './components/ContextMenu';
import { MousePointer2, Hand, PenTool } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'svg2pdf.js';
import { Ruler } from './components/Ruler';
import { ColorPanel } from './components/ColorPanel';

// ... (existing imports)



import { patchFabricTextRender } from './utils/fabricUtils';

// Apply custom patches to Fabric.js prototypes (Background, Border, Alignment, Tabs)
patchFabricTextRender();

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

// Helper Component for Arrow Icon if needed, or use lucide ArrowRight
import { ArrowRight } from 'lucide-react';
const ArrowRightIconWrapper = () => <ArrowRight size={16} />;

const shapeBtnStyle: React.CSSProperties = {
  padding: '6px',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  borderRadius: '2px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
};

function App() {
  const [fonts, setFonts] = useState<string[]>([]);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [layers, setLayers] = useState<fabric.Object[]>([]);
  const [activeTab, setActiveTab] = useState<'properties' | 'layers' | 'colors'>('properties');
  const [paletteColors, setPaletteColors] = useState<string[]>(['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff', '#ffffff', '#000000']);
  const [paletteGradients, setPaletteGradients] = useState<any[]>([]);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, visible: boolean, actions: any[] }>({ x: 0, y: 0, visible: false, actions: [] });

  const [showShapeMenu, setShowShapeMenu] = useState(false);

  const canvasRef = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Undo/Redo State
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isInternalUpdate = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Clipboard
  const clipboard = useRef<fabric.Object | null>(null);
  const [canPaste, setCanPaste] = useState(false);

  // Debounce ref for property changes
  const saveTimeoutRef = useRef<any>(null);

  // Force React re-render when Fabric object changes
  // Force React re-render when Fabric object changes
  const [refreshKey, setRefreshKey] = useState(0);

  const forceUpdate = useCallback(() => setRefreshKey(k => k + 1), []);

  const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const setupPage = (canvas: fabric.Canvas) => {
    // workspace background
    canvas.backgroundColor = '#f0f0f0';

    // Ensure no existing page
    const objects = canvas.getObjects();
    // @ts-ignore
    const existingPage = objects.find(o => o.isPage);
    if (existingPage) return; // Already exists

    // Create Page Object
    const pageObject = new fabric.Rect({
      left: 0,
      top: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      fill: '#ffffff',
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 10, offsetX: 5, offsetY: 5 }),
      selectable: false,
      evented: false,
      hoverCursor: 'default',
      excludeFromExport: true,
    });
    // @ts-ignore
    pageObject.isPage = true;
    canvas.add(pageObject);
    canvas.sendObjectToBack(pageObject);
  };

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSystemFonts().then((fontList: string[]) => {
        setFonts(fontList);
      });
    }
  }, []);

  const updateHistoryState = () => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };

  const saveHistory = useCallback(() => {
    if (!canvasRef.current || isInternalUpdate.current) return;
    // VERY IMPORTANT: Include 'uid' in serialization so IDs persist!
    // @ts-ignore
    const json = JSON.stringify(canvasRef.current.toJSON(['uid']));

    const currentIdx = historyIndexRef.current;
    const newHistory = historyRef.current.slice(0, currentIdx + 1);
    newHistory.push(json);

    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;

    updateHistoryState();
    console.log("History saved. Size:", historyRef.current.length);
  }, []);

  const handleDelete = useCallback(() => {
    if (!canvasRef.current) return;
    const activeObj = canvasRef.current.getActiveObject();
    if (activeObj) {
      canvasRef.current.remove(activeObj);
      canvasRef.current.discardActiveObject();
      canvasRef.current.renderAll();
      setSelectedObject(null);
      // 'object:removed' triggers saveHistory via event
    }
  }, []);

  // Keyboard Event Listener for Delete and Tab
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeElement = document.activeElement;
        const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';

        const activeObj = canvasRef.current?.getActiveObject();
        // @ts-ignore
        const isEditingText = activeObj && (activeObj.type === 'i-text' || activeObj.type === 'text') && activeObj.isEditing;

        if (!isInput && !isEditingText) {
          handleDelete();
        }
      }

      // Tab Key Handling
      if (e.key === 'Tab') {
        const activeObj = canvasRef.current?.getActiveObject();
        if (activeObj && activeObj.type === 'textbox') {
          const textbox = activeObj as fabric.Textbox;
          // @ts-ignore
          if (textbox.isEditing) {
            e.preventDefault(); // Stop focus change

            // Manual insertion
            const text = textbox.text || '';
            const start = textbox.selectionStart || 0;
            const end = textbox.selectionEnd || 0;
            const newText = text.slice(0, start) + '\t' + text.slice(end);
            textbox.set('text', newText);
            textbox.selectionStart = start + 1;
            textbox.selectionEnd = start + 1;
            textbox.set('dirty', true);

            canvasRef.current?.requestRenderAll();
            saveHistory();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDelete, saveHistory]);


  const [activeTool, setActiveTool] = useState<'select' | 'hand' | 'pen'>('select');
  const isPanning = useRef(false);
  const isDrawing = useRef(false);
  const drawingPath = useRef<fabric.Path | null>(null);
  const drawingPoints = useRef<{ x: number; y: number }[]>([]);
  const lastMousePosition = useRef({ x: 0, y: 0 });

  // Edit Mode State
  const [editingPath, setEditingPath] = useState<fabric.Path | null>(null);
  const prevEditingPathRef = useRef<fabric.Path | null>(null);
  const editHandles = useRef<fabric.Object[]>([]);

  // ... existing code ...

  // Zoom and Pan Handling
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const onWheel = (opt: any) => {
      const evt = opt.e;
      // Ctrl + Wheel = Zoom
      if (evt.ctrlKey) {
        // ... (existing zoom logic) ...
        const delta = evt.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.01) zoom = 0.01;
        canvas.zoomToPoint(new fabric.Point(evt.offsetX, evt.offsetY), zoom);
      } else {
        // ... (existing scroll/pan logic) ...
        const deltaX = evt.shiftKey ? evt.deltaY : evt.deltaX;
        const deltaY = evt.shiftKey ? 0 : evt.deltaY;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] -= deltaX;
          vpt[5] -= deltaY;
          canvas.requestRenderAll();
        }
      }
      evt.preventDefault();
      evt.stopPropagation();
    };

    // Panning Logic (Hand Tool or Spacebar)
    const onMouseDown = (opt: any) => {
      const evt = opt.e;
      // Pan if: Hand Tool is active OR Spacebar is held OR Middle Click
      if (activeTool === 'hand' || evt.code === 'Space' || evt.button === 1) {
        isPanning.current = true;
        canvas.selection = false;
        lastMousePosition.current = { x: evt.clientX, y: evt.clientY };
        canvas.defaultCursor = 'grabbing';
        // Disable fabric selection ability while panning
        canvas.forEachObject((o) => o.selectable = false);
      }
    };

    const onMouseMove = (opt: any) => {
      if (isPanning.current) {
        const evt = opt.e;
        const deltaX = evt.clientX - lastMousePosition.current.x;
        const deltaY = evt.clientY - lastMousePosition.current.y;

        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += deltaX;
          vpt[5] += deltaY;
          canvas.requestRenderAll();
        }
        lastMousePosition.current = { x: evt.clientX, y: evt.clientY };
      }
    };

    const onMouseUp = () => {
      if (isPanning.current) {
        isPanning.current = false;
        canvas.defaultCursor = 'default';
        // Re-enable selection if we were in 'select' mode (spacebar temporary pan)
        if (activeTool === 'select') {
          canvas.selection = true;
          canvas.forEachObject((o) => {
            // Don't make page selectable
            if (!(o as any).isPage) o.selectable = true;
          });
        } else {
          // Keep selection off if we are in hand mode
          canvas.defaultCursor = 'grab';
        }
      }
    };

    // Update cursor immediately when tool changes
    if (activeTool === 'hand') {
      canvas.defaultCursor = 'grab';
      canvas.selection = false;
      canvas.forEachObject(o => o.selectable = false);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    } else {
      canvas.defaultCursor = 'default';
      canvas.selection = true;
      canvas.forEachObject(o => {
        if (!(o as any).isPage) o.selectable = true;
      });
    }

    canvas.on('mouse:wheel', onWheel);
    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);

    return () => {
      canvas.off('mouse:wheel', onWheel);
      canvas.off('mouse:down', onMouseDown);
      canvas.off('mouse:move', onMouseMove);
      canvas.off('mouse:up', onMouseUp);
    };
  }, [refreshKey, activeTool]); // Re-run when tool changes

  // PEN TOOL LOGIC
  useEffect(() => {
    if (!canvasRef.current || activeTool !== 'pen') return;
    const canvas = canvasRef.current;

    const onMouseDown = (opt: any) => {
      if (activeTool !== 'pen') return;

      const evt = opt.e;
      const pointer = canvas.getPointer(evt);

      if (!isDrawing.current) {
        // Start New Path
        isDrawing.current = true;
        // Start with initial point
        drawingPoints.current = [{ x: pointer.x, y: pointer.y }];

        const pathData = `M ${pointer.x} ${pointer.y}`;
        const path = new fabric.Path(pathData, {
          stroke: 'black',
          strokeWidth: 2,
          fill: '',
          selectable: false,
          evented: false,
          objectCaching: false
        }) as any;
        path.isDrawingPath = true; // Flag for internal use

        canvas.add(path);
        drawingPath.current = path;
      } else {
        // Add new anchor point
        // Note: If previous was a curve, we might need to handle control points.
        // For now, simpler: adjust the *previous* segment if we are finishing a drag?
        // Actually, let's stick to standard behavior:
        // Click adds a point. If you hold and drag, you pull out control points for *that* point.

        // Add the new point
        drawingPoints.current.push({ x: pointer.x, y: pointer.y });
        updatePathPreview();
      }
    };

    const updatePathPreview = () => {
      if (!drawingPath.current || drawingPoints.current.length === 0) return;

      // Rebuild path string
      // Simple Polyline for now. drag-to-curve needs separate "drag" logic which complicates state.
      // User asked for "Click & Drag = Curve".
      // To implement that, we need 'onMouseMove' to update the *latest* point's control points if mouse is down.

      let d = `M ${drawingPoints.current[0].x} ${drawingPoints.current[0].y}`;
      for (let i = 1; i < drawingPoints.current.length; i++) {
        d += ` L ${drawingPoints.current[i].x} ${drawingPoints.current[i].y}`;
      }

      drawingPath.current.set({ path: fabric.util.parsePath(d) });
      // drawingPath.current.setCoords(); // Not strictly needed during draw
      canvas.requestRenderAll();
    };

    const onMouseMove = (opt: any) => {
      if (activeTool !== 'pen' || !isDrawing.current || !drawingPath.current) return;

      // Visualize line to current mouse position (Rubber banding)
      const evt = opt.e;
      const pointer = canvas.getPointer(evt);

      let d = `M ${drawingPoints.current[0].x} ${drawingPoints.current[0].y}`;
      for (let i = 1; i < drawingPoints.current.length; i++) {
        d += ` L ${drawingPoints.current[i].x} ${drawingPoints.current[i].y}`;
      }
      d += ` L ${pointer.x} ${pointer.y}`;

      drawingPath.current.set({ path: fabric.util.parsePath(d) });
      canvas.requestRenderAll();
    };

    const finishPath = () => {
      if (!drawingPath.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const originalPath = drawingPath.current;

      // FIX: Re-create the path from scratch to ensure Fabric calculates dimensions correctly.
      // The original path object often has 0 width/height because it was built incrementally.
      const d = originalPath.path!.map(cmd => cmd.join(' ')).join(' ');

      canvas.remove(originalPath);

      const newPath = new fabric.Path(d, {
        stroke: 'black',
        strokeWidth: 2,
        fill: 'transparent',
        selectable: true, // Make selectable
        evented: true,
        objectCaching: true
      });

      canvas.add(newPath);
      canvas.setActiveObject(newPath);

      // Clean up
      isDrawing.current = false;
      drawingPath.current = null;
      drawingPoints.current = [];

      saveHistory();
      canvas.requestRenderAll();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (activeTool !== 'pen') return;
      if (e.key === 'Enter') {
        finishPath();
      }
      if (e.key === 'Escape') {
        // Cancel
        if (drawingPath.current) {
          canvas.remove(drawingPath.current);
        }
        isDrawing.current = false;
        drawingPath.current = null;
        drawingPoints.current = [];
        canvas.requestRenderAll();
      }
    };

    const onDoubleClick = () => {
      finishPath();
    };

    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:dblclick', onDoubleClick);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      canvas.off('mouse:down', onMouseDown);
      canvas.off('mouse:move', onMouseMove);
      canvas.off('mouse:dblclick', onDoubleClick);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeTool]);

  // EDIT MODE LOGIC (Vertex Manipulation)
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const clearHandles = () => {
      editHandles.current.forEach(h => canvas.remove(h));
      editHandles.current = [];
    };

    const updatePathFromHandles = (pathObj: fabric.Path) => {
      if (!pathObj.path) return;

      const matrix = pathObj.calcTransformMatrix();
      const invertMatrix = fabric.util.invertTransform(matrix);
      const pathOffset = pathObj.pathOffset || { x: 0, y: 0 };

      const newPathData: any[] = [];
      let handleIdx = 0;

      pathObj.path.forEach((cmd: any) => {
        const type = cmd[0];

        if (type === 'M' || type === 'L') {
          const h = editHandles.current[handleIdx];
          if (h) {
            const worldPt = h.getCenterPoint();
            const localPt = fabric.util.transformPoint(worldPt, invertMatrix);
            // Adjust for pathOffset
            newPathData.push([type, localPt.x + pathOffset.x, localPt.y + pathOffset.y]);
            handleIdx++;
          }
        } else if (type === 'C') {
          const h1 = editHandles.current[handleIdx];     // cp1
          const h2 = editHandles.current[handleIdx + 1]; // cp2
          const h3 = editHandles.current[handleIdx + 2]; // anchor
          if (h1 && h2 && h3) {
            const p1 = fabric.util.transformPoint(h1.getCenterPoint(), invertMatrix);
            const p2 = fabric.util.transformPoint(h2.getCenterPoint(), invertMatrix);
            const p3 = fabric.util.transformPoint(h3.getCenterPoint(), invertMatrix);
            newPathData.push(['C',
              p1.x + pathOffset.x, p1.y + pathOffset.y,
              p2.x + pathOffset.x, p2.y + pathOffset.y,
              p3.x + pathOffset.x, p3.y + pathOffset.y
            ]);
            handleIdx += 3;
          }
        } else if (type === 'Q') {
          const h1 = editHandles.current[handleIdx];     // cp1
          const h2 = editHandles.current[handleIdx + 1]; // anchor
          if (h1 && h2) {
            const p1 = fabric.util.transformPoint(h1.getCenterPoint(), invertMatrix);
            const p2 = fabric.util.transformPoint(h2.getCenterPoint(), invertMatrix);
            newPathData.push(['Q',
              p1.x + pathOffset.x, p1.y + pathOffset.y,
              p2.x + pathOffset.x, p2.y + pathOffset.y
            ]);
            handleIdx += 2;
          }
        } else if (type === 'Z') {
          newPathData.push(['Z']);
        }
      });

      pathObj.set({ path: newPathData as any });
      pathObj.setCoords();
      canvas.requestRenderAll();
    };


    if (editingPath) {
      prevEditingPathRef.current = editingPath;
      clearHandles();
      const pathObj = editingPath;
      const matrix = pathObj.calcTransformMatrix();
      const pathOffset = pathObj.pathOffset || { x: 0, y: 0 };

      const spawnHandles = () => {
        clearHandles();
        // Recalculate matrix/offset in case they changed (though mostly static in this context)
        const matrix = pathObj.calcTransformMatrix();
        const pathOffset = pathObj.pathOffset || { x: 0, y: 0 };

        if (pathObj.path) {
          pathObj.path.forEach((cmd: any, index: number) => {
            const type = cmd[0];
            const spawnHandle = (x: number, y: number, role: 'anchor' | 'cp', cmdIndex: number) => {
              const localPt = new fabric.Point(x - pathOffset.x, y - pathOffset.y);
              const pt = fabric.util.transformPoint(localPt, matrix);

              const handle = new fabric.Rect({
                left: pt.x,
                top: pt.y,
                width: role === 'anchor' ? 10 : 8,
                height: role === 'anchor' ? 10 : 8,
                fill: role === 'anchor' ? 'yellow' : 'white',
                stroke: '#3b82f6',
                strokeWidth: 1,
                radius: role === 'anchor' ? 0 : 4,
                rx: role === 'anchor' ? 0 : 4,
                ry: role === 'anchor' ? 0 : 4,
                originX: 'center',
                originY: 'center',
                hasControls: false,
                hasBorders: true,
                lockRotation: true,
                lockScalingX: true,
                lockScalingY: true,
                transparentCorners: false,
                excludeFromExport: true
              }) as any;

              handle.isHandle = true;
              handle.cmdIndex = cmdIndex;
              handle.role = role;

              handle.on('moving', () => updatePathFromHandles(pathObj));

              handle.on('mousedblclick', () => {
                if (role !== 'anchor') return;

                const currentCmd = pathObj.path![cmdIndex];
                const newType = (currentCmd[0] === 'L' || currentCmd[0] === 'M') ? 'C' : 'L';

                if (currentCmd[0] === 'M') return;

                if (newType === 'C') {
                  const currCmdAny = currentCmd as any[];
                  const currX = currCmdAny[currCmdAny.length - 2] as number;
                  const currY = currCmdAny[currCmdAny.length - 1] as number;

                  if (typeof currX !== 'number' || typeof currY !== 'number') return;

                  const cp1x = currX - 20;
                  const cp1y = currY;
                  const cp2x = currX - 10;
                  const cp2y = currY;

                  (pathObj.path as any)[cmdIndex] = ['C', cp1x, cp1y, cp2x, cp2y, currX, currY];

                } else {
                  const currCmdAny = currentCmd as any[];
                  const len = currCmdAny.length;
                  const x = currCmdAny[len - 2] as number;
                  const y = currCmdAny[len - 1] as number;
                  (pathObj.path as any)[cmdIndex] = ['L', x, y];
                }

                pathObj.set({ path: [...pathObj.path!] });
                spawnHandles();
                canvas.requestRenderAll();
              });

              canvas.add(handle);
              editHandles.current.push(handle);
            };

            if (type === 'M') {
              spawnHandle(cmd[1], cmd[2], 'anchor', index);
            } else if (type === 'L') {
              spawnHandle(cmd[1], cmd[2], 'anchor', index);
            } else if (type === 'C') {
              spawnHandle(cmd[1], cmd[2], 'cp', index);
              spawnHandle(cmd[3], cmd[4], 'cp', index);
              spawnHandle(cmd[5], cmd[6], 'anchor', index);
            } else if (type === 'Q') {
              spawnHandle(cmd[1], cmd[2], 'cp', index);
              spawnHandle(cmd[3], cmd[4], 'anchor', index);
            }
          });
        }
      };

      spawnHandles();

      if (false) {
        pathObj.path.forEach((cmd: any, index: number) => {
          const type = cmd[0];
          // Common helper to spawn handle
          const spawnHandle = (x: number, y: number, role: 'anchor' | 'cp', cmdIndex: number) => {
            // Subtract pathOffset before transforming to world space
            const localPt = new fabric.Point(x - pathOffset.x, y - pathOffset.y);
            const pt = fabric.util.transformPoint(localPt, matrix);

            const handle = new fabric.Rect({
              left: pt.x,
              top: pt.y,
              width: role === 'anchor' ? 10 : 8, // Smaller for CP
              height: role === 'anchor' ? 10 : 8,
              fill: role === 'anchor' ? 'yellow' : 'white',
              stroke: '#3b82f6',
              strokeWidth: 1,
              radius: role === 'anchor' ? 0 : 4, // Pseudo-circle for CP if we used Rect with rx? 
              // Actually Rect doesn't have radius for corner. rx/ry.
              rx: role === 'anchor' ? 0 : 4,
              ry: role === 'anchor' ? 0 : 4,
              originX: 'center',
              originY: 'center',
              hasControls: false,
              hasBorders: true,
              lockRotation: true,
              lockScalingX: true,
              lockScalingY: true,
              transparentCorners: false,
              excludeFromExport: true
            }) as any;

            handle.isHandle = true;
            handle.cmdIndex = cmdIndex;
            handle.role = role;

            handle.on('moving', () => updatePathFromHandles(pathObj));

            // Double Click to Convert Corner <-> Curve
            handle.on('mousedblclick', () => {
              if (role !== 'anchor') return; // Only anchors convert

              const currentCmd = pathObj.path![cmdIndex];
              const newType = (currentCmd[0] === 'L' || currentCmd[0] === 'M') ? 'C' : 'L';

              // M usually stays M, but can become C if it's the start? 
              // In standard SVG, M is move. Convert to C means the *segment following it*? 
              // No, internal Fabric logic usually treats M as just the start point. 
              // If we want to curve the segment *ending* at this point, we modify THIS command.
              // M cannot be C. M is just a point.
              if (currentCmd[0] === 'M') return; // Can't convert start point type usually (it just moves)

              if (newType === 'C') {
                // Convert L to C
                const currCmdAny = currentCmd as any[];
                const currX = currCmdAny[currCmdAny.length - 2] as number;
                const currY = currCmdAny[currCmdAny.length - 1] as number;

                if (typeof currX !== 'number' || typeof currY !== 'number') return;

                const cp1x = currX - 20;
                const cp1y = currY;
                const cp2x = currX - 10;
                const cp2y = currY;

                (pathObj.path as any)[cmdIndex] = ['C', cp1x, cp1y, cp2x, cp2y, currX, currY];

              } else {
                // Convert C/Q to L
                const currCmdAny = currentCmd as any[];
                const len = currCmdAny.length;
                const x = currCmdAny[len - 2] as number;
                const y = currCmdAny[len - 1] as number;
                (pathObj.path as any)[cmdIndex] = ['L', x, y];
              }

              // Force update
              pathObj.set({ path: [...pathObj.path!] }); // Trigger change
              setEditingPath(null); // Hack to trigger re-render of handles?
              // setEditingPath(pathObj) won't trigger useEffect if ref same?
              // We need to re-run the effect.
              // Let's create a refresh signal?
              // Or just manually call the body of the effect?
              // Simplest: 
              setEditingPath(null);
              setTimeout(() => setEditingPath(pathObj), 0);
            });

            canvas.add(handle);
            editHandles.current.push(handle);
          };

          if (type === 'M') {
            spawnHandle(cmd[1], cmd[2], 'anchor', index);
          } else if (type === 'L') {
            spawnHandle(cmd[1], cmd[2], 'anchor', index);
          } else if (type === 'C') {
            spawnHandle(cmd[1], cmd[2], 'cp', index); // cp1
            spawnHandle(cmd[3], cmd[4], 'cp', index); // cp2
            spawnHandle(cmd[5], cmd[6], 'anchor', index); // anchor
          } else if (type === 'Q') {
            spawnHandle(cmd[1], cmd[2], 'cp', index); // cp1
            spawnHandle(cmd[3], cmd[4], 'anchor', index); // anchor
          }
        });
      }

      pathObj.selectable = false;
      pathObj.evented = false;
      pathObj.objectCaching = false;

    } else {
      clearHandles();

      // Fix bounding box on exit by re-creating the path
      if (prevEditingPathRef.current) {
        const oldPath = prevEditingPathRef.current;
        if (canvas.contains(oldPath) && oldPath.path) {
          // 1. Calculate World Position of the first point (Anchor)
          // We use the first point specifically to anchor the visual position
          const pathData = oldPath.path;
          const mCmd = pathData[0]; // M x y
          const oldPathOffset = oldPath.pathOffset || { x: 0, y: 0 };

          // Local point (taking into account the specific path offset of the old object)
          const oldPointLocal = new fabric.Point((mCmd[1] as number) - (oldPathOffset?.x || 0), (mCmd[2] as number) - (oldPathOffset?.y || 0));
          const oldMatrix = oldPath.calcTransformMatrix();
          const oldPointWorld = fabric.util.transformPoint(oldPointLocal, oldMatrix);

          // 2. Create New Path
          const newPath = new fabric.Path(oldPath.path, {
            stroke: oldPath.stroke,
            strokeWidth: oldPath.strokeWidth,
            fill: oldPath.fill,
            strokeDashArray: oldPath.strokeDashArray,
            strokeLineCap: oldPath.strokeLineCap,
            strokeLineJoin: oldPath.strokeLineJoin,
            strokeMiterLimit: oldPath.strokeMiterLimit,
            opacity: oldPath.opacity,
            scaleX: oldPath.scaleX,
            scaleY: oldPath.scaleY,
            angle: oldPath.angle,
            flipX: oldPath.flipX,
            flipY: oldPath.flipY,
            skewX: oldPath.skewX,
            skewY: oldPath.skewY,
            originX: oldPath.originX,
            originY: oldPath.originY,
            objectCaching: true,
            selectable: true,
            evented: true
          });

          // 3. Calculate where that SAME point is in the New Object (at 0,0 world pos)
          // New Path has recalculates its own pathOffset
          const newPathOffset = newPath.pathOffset || { x: 0, y: 0 };
          const newPointLocal = new fabric.Point((mCmd[1] as number) - (newPathOffset?.x || 0), (mCmd[2] as number) - (newPathOffset?.y || 0));

          // Temporarily place at 0,0 to measure
          newPath.left = 0;
          newPath.top = 0;
          const newMatrix = newPath.calcTransformMatrix();
          const newPointWorldAtOrigin = fabric.util.transformPoint(newPointLocal, newMatrix);

          // 4. Calculate Shift needed
          // We want: Position + newPointWorldAtOrigin = oldPointWorld
          // Position = oldPointWorld - newPointWorldAtOrigin
          const left = oldPointWorld.x - newPointWorldAtOrigin.x;
          const top = oldPointWorld.y - newPointWorldAtOrigin.y;

          // 5. Apply Position
          newPath.set({ left, top });
          newPath.setCoords();

          canvas.remove(oldPath);
          canvas.add(newPath);
          canvas.setActiveObject(newPath);
          setSelectedObject(newPath);
        }
        prevEditingPathRef.current = null;
      }

      const objects = canvas.getObjects();
      objects.forEach((o: any) => {
        if (o.type === 'path' && !o.isDrawingPath && !o.isHandle) {
          o.selectable = true;
          o.evented = true;
          o.objectCaching = true;
        }
      });
      canvas.requestRenderAll();
    }
  }, [editingPath]);

  // Global Double Click to Enter Edit Mode
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const onDblClick = (opt: any) => {
      // If Pen tool is active, it handles its own dblclick
      if (activeTool === 'pen') return;

      const target = opt.target;
      if (target && target.type === 'path') {
        // Enter Edit Mode
        setEditingPath(target);
        // Deselect to avoid Transform box masking handles
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      } else {
        // Exit Edit Mode
        setEditingPath(null);
      }
    };

    canvas.on('mouse:dblclick', onDblClick);
    return () => {
      canvas.off('mouse:dblclick', onDblClick);
    };
  }, [activeTool]);


  const undo = useCallback(async () => {
    if (historyIndexRef.current <= 0 || !canvasRef.current) return;

    isInternalUpdate.current = true;
    historyIndexRef.current -= 1;
    const state = historyRef.current[historyIndexRef.current];

    try {
      await canvasRef.current.loadFromJSON(JSON.parse(state));
      canvasRef.current.renderAll();
      canvasRef.current.discardActiveObject();
      setSelectedObject(null);
      setLayers([...canvasRef.current.getObjects()]);

      setupPage(canvasRef.current);
    } catch (e) {
      console.error("Undo failed", e);
    }

    isInternalUpdate.current = false;
    updateHistoryState();
  }, []);

  const redo = useCallback(async () => {
    if (historyIndexRef.current >= historyRef.current.length - 1 || !canvasRef.current) return;

    isInternalUpdate.current = true;
    historyIndexRef.current += 1;
    const state = historyRef.current[historyIndexRef.current];

    try {
      await canvasRef.current.loadFromJSON(JSON.parse(state));
      canvasRef.current.renderAll();
      canvasRef.current.discardActiveObject();
      setSelectedObject(null);
      setLayers([...canvasRef.current.getObjects()]);

      setupPage(canvasRef.current);
    } catch (e) {
      console.error("Redo failed", e);
    }

    isInternalUpdate.current = false;
    updateHistoryState();
  }, []);

  const handleCanvasReady = useCallback((canvas: fabric.Canvas) => {
    canvasRef.current = canvas;

    // --- WORKSPACE & VIRTUAL PAGE INIT ---
    setupPage(canvas);

    // 4. Center and Fit Page in Viewport
    // Initial calls
    handleFit();
    setTimeout(handleFit, 200);
    setTimeout(handleFit, 1000);

    // Listeners
    // canvas.on('resize', handleFit); // Fabric doesn't have a standard resize event like this
    window.addEventListener('resize', handleFit);

    // -------------------------------------

    const handleModification = () => {
      saveHistory();
      if (canvasRef.current) {
        setLayers([...canvasRef.current.getObjects().filter(o => !(o as any).isPage && !(o as any).isHandle && !(o as any).isDrawingPath)]);
      }
      forceUpdate();
    };

    // Smooth update during drag
    const handleMoving = () => forceUpdate();

    canvas.on('object:added', (e) => {
      // Don't trigger history for the page itself or handles
      if ((e.target as any).isPage || (e.target as any).isHandle) return;
      handleModification();
    });
    canvas.on('object:removed', handleModification);
    canvas.on('object:modified', handleModification);

    // Live updates
    canvas.on('object:moving', handleMoving);

    // Textbox Resizing Logic
    canvas.on('object:scaling', (e) => {
      const target = e.target;
      if (target && target.type === 'textbox') {
        const textbox = target as fabric.Textbox;
        const scaleX = textbox.scaleX || 1;
        const newWidth = textbox.width! * scaleX;
        const scaleY = textbox.scaleY || 1;
        const newHeight = textbox.height! * scaleY;

        textbox.set({
          width: newWidth,
          height: newHeight,
          scaleX: 1,
          scaleY: 1
        });
      }
      handleMoving();
    });

    canvas.on('object:rotating', handleMoving);
    canvas.on('object:resizing', handleMoving);
    canvas.on('text:selection:changed', handleMoving);
    canvas.on('text:changed', handleMoving);

    // Initial Save (but exclude page if possible? we'll handle save logic separate)
    // saveHistory(); 
    // Actually, saving history right at startup with the Page object might be messy if we don't filter it.
    // For now, let's just let it run, but we will need to update saveHistory to IGNORE the page object.

  }, [saveHistory, forceUpdate]);

  const handleSelectionChange = useCallback((obj: fabric.Object | null) => {
    setSelectedObject(obj);
  }, []);

  const handlePropertyChange = useCallback((property: string, value: any) => {
    if (!canvasRef.current || !selectedObject) return;

    // Check if we are editing text to apply styles only to selection
    const isText = selectedObject.type === 'i-text' || selectedObject.type === 'text' || selectedObject.type === 'textbox';
    const isEditing = isText && (selectedObject as any).isEditing;

    // Properties that should ALWAYS be global (object-level), not per-character
    const forceGlobalProps = ['lineHeight', 'charSpacing'];

    if (property === 'origin') {
      // Special handling for changing origin (pivot point) keeping visual position
      const { originX, originY } = value;
      const center = selectedObject.getCenterPoint();
      selectedObject.set({ originX, originY });
      selectedObject.setPositionByOrigin(center, 'center', 'center');
    } else if (isEditing && !forceGlobalProps.includes(property)) {
      (selectedObject as any).setSelectionStyles({ [property]: value });
    } else {
      // 1. Update Object Immediately (Visual Feedback)
      selectedObject.set(property, value);
    }

    canvasRef.current.requestRenderAll();

    // Force React update so the Panel inputs receive the new value
    forceUpdate();

    // 2. Debounce Save History
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveHistory();
      saveTimeoutRef.current = null;
    }, 500);

  }, [selectedObject, saveHistory, forceUpdate]);

  // --- Shape & QR Code Generators ---
  // --- Shape & QR Code Generators ---
  const handleAddQRCode = useCallback(() => {
    setShowShapeMenu(false);
    setShowQRModal(true);
  }, []);

  const handleConfirmQRCode = useCallback(async (text: string, color: string = '#000000') => {
    if (!canvasRef.current || !text) return;

    try {
      const dataUrl = await QRCode.toDataURL(text, {
        margin: 1,
        width: 200,
        color: {
          dark: color,
          light: '#00000000'
        }
      });
      const img = await fabric.FabricImage.fromURL(dataUrl);

      img.set({
        left: 200,
        top: 200,
        width: 200,
        height: 200
      });
      (img as any).uid = generateId();
      canvasRef.current?.add(img);
      canvasRef.current?.setActiveObject(img);
      setSelectedObject(img);
      setLayers([...(canvasRef.current?.getObjects() || [])]);
      saveHistory(); // Corrected syntax (saveHistory is not function call on ref)
    } catch (err) {
      console.error("QR Code generation failed", err);
    }
  }, [saveHistory]);


  const handleAddShape = useCallback((type: string) => {
    if (!canvasRef.current) return;
    let shape: fabric.Object;
    const defaults = { left: 200, top: 200, fill: '#cccccc', stroke: '#000000', strokeWidth: 1 };

    switch (type) {
      case 'rect':
        shape = new fabric.Rect({ ...defaults, width: 100, height: 100 });
        break;
      case 'roundRect':
        shape = new fabric.Rect({ ...defaults, width: 100, height: 100, rx: 10, ry: 10 });
        break;
      case 'circle':
        shape = new fabric.Circle({ ...defaults, radius: 50 });
        break;
      case 'triangle':
        shape = new fabric.Triangle({ ...defaults, width: 100, height: 100 });
        break;
      case 'line':
        shape = new fabric.Line([0, 0, 100, 0], { ...defaults, strokeWidth: 3 });
        break;
      case 'star':
        // 5-point star
        // Simple polygon approximation
        shape = new fabric.Polygon([
          { x: 0, y: -50 }, { x: 11, y: -15 }, { x: 48, y: -15 }, { x: 18, y: 7 },
          { x: 29, y: 41 }, { x: 0, y: 20 }, { x: -29, y: 41 }, { x: -18, y: 7 },
          { x: -48, y: -15 }, { x: -11, y: -15 }
        ], { ...defaults, left: 250, top: 250 });
        break;
      case 'arrow':
        // Simple arrow using Path
        shape = new fabric.Path('M 0 0 L 100 0 L 100 -20 L 150 10 L 100 40 L 100 20 L 0 20 Z', { ...defaults, fill: '#cccccc' });
        break;
      default:
        return;
    }

    (shape as any).uid = generateId();
    canvasRef.current.add(shape);
    canvasRef.current.setActiveObject(shape);
    setSelectedObject(shape);
    setLayers([...canvasRef.current.getObjects()]);
    saveHistory();
    setShowShapeMenu(false); // Close menu after pick
  }, [saveHistory]);

  const addText = useCallback(() => {
    if (!canvasRef.current) return;
    const text = new fabric.Textbox('Nouveau Texte', {
      left: 150,
      top: 150,
      fontFamily: 'Arial',
      fontSize: 24,
      fill: '#000000',
      width: 200, // Default width for wrapping
      objectCaching: false, // Important for custom render patches to update immediately
      lockScalingY: false, // Unlock vertical scaling
    });
    (text as any).uid = generateId();
    canvasRef.current.add(text);
    canvasRef.current.setActiveObject(text);
    setSelectedObject(text);
    setLayers([...canvasRef.current.getObjects()]);
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvasRef.current) return;

    const reader = new FileReader();
    reader.onload = async (f) => {
      const data = f.target?.result;
      if (typeof data === 'string') {
        try {
          const img = await fabric.FabricImage.fromURL(data);
          if (img.width! > 300) {
            img.scaleToWidth(300);
          }
          img.set({
            left: 200,
            top: 200
          });
          (img as any).uid = generateId();
          canvasRef.current?.add(img);
          canvasRef.current?.setActiveObject(img);
          setSelectedObject(img);
          setLayers([...(canvasRef.current?.getObjects() || [])]);
        } catch (error) {
          console.error("Error loading image:", error);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleNew = useCallback(() => {
    if (!canvasRef.current) return;
    if (confirm('Voulez-vous vraiment créer un nouveau projet ? Tout travail non sauvegardé sera perdu.')) {
      isInternalUpdate.current = true;
      canvasRef.current.clear();
      setupPage(canvasRef.current);
      canvasRef.current.renderAll();
      setSelectedObject(null);
      setLayers([]);

      historyRef.current = [];
      historyIndexRef.current = -1;
      isInternalUpdate.current = false;
      setCurrentFilePath(null);

      saveHistory();
    }
  }, [saveHistory]);

  const handleSave = useCallback(async () => {
    if (!canvasRef.current) return;

    // Create Project Object
    const projectData = {
      // @ts-ignore
      canvas: canvasRef.current.toJSON(['uid']),
      palette: {
        colors: paletteColors,
        gradients: paletteGradients
      }
    };

    const json = JSON.stringify(projectData);

    if (window.electronAPI) {
      // Pass currentFilePath if we have one (Overwrite), otherwise undefined (Save As)
      const result = await window.electronAPI.saveProject(json, currentFilePath || undefined);
      if (result.success) {
        if (result.filePath) {
          setCurrentFilePath(result.filePath);
        }
        // Minimal feedback for overwrite?
        const msg = currentFilePath ? 'Sauvegardé.' : 'Projet sauvegardé avec succès !';
        console.log(msg); // Optional: Toast notification
      }
    } else {
      console.warn('Save not supported in browser mode');
      console.log(json);
    }
  }, [paletteColors, paletteGradients, currentFilePath]);

  const handleLoad = useCallback(async () => {
    if (!canvasRef.current) return;
    if (window.electronAPI) {
      const result = await window.electronAPI.loadProject();
      if (result) {
        try {
          isInternalUpdate.current = true;
          const json = result.data;
          setCurrentFilePath(result.filePath);

          const parsed = JSON.parse(json);

          let canvasData = parsed;
          // Check if new format
          if (parsed.canvas && parsed.palette) {
            canvasData = parsed.canvas;
            setPaletteColors(parsed.palette.colors || []);
            setPaletteGradients(parsed.palette.gradients || []);
          }

          await canvasRef.current.loadFromJSON(canvasData);

          // Ensure every loaded object has an ID
          canvasRef.current.getObjects().forEach((obj: any) => {
            if (!obj.uid) {
              obj.uid = generateId();
            }
          });

          // Restore Page Background if missing
          setupPage(canvasRef.current);

          canvasRef.current.renderAll();
          setLayers([...canvasRef.current.getObjects()]);
          console.log('Projet chargé');

          historyRef.current = [JSON.stringify(canvasData)];
          historyIndexRef.current = 0;
          isInternalUpdate.current = false;
          updateHistoryState();

        } catch (error) {
          console.error("Erreur chargement:", error);
          alert("Erreur lors du chargement du fichier");
        }
      }
    }
  }, []);

  const handleExportImage = useCallback(async () => {
    if (!canvasRef.current) return;

    // Temporarily deselect everything to avoid saving selection handles
    const activeObj = canvasRef.current.getActiveObject();
    canvasRef.current.discardActiveObject();
    canvasRef.current.renderAll();

    const dataURL = canvasRef.current.toDataURL({
      format: 'png',
      multiplier: 2 // High Resolution
    });

    // Restore selection
    if (activeObj) {
      canvasRef.current.setActiveObject(activeObj);
      canvasRef.current.renderAll();
    }

    // Convert Base64 to ArrayBuffer
    const response = await fetch(dataURL);
    const buffer = await response.arrayBuffer();

    if (window.electronAPI) {
      await window.electronAPI.saveFile(buffer, 'design.png');
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!canvasRef.current) return;
    const activeObj = canvasRef.current.getActiveObject();
    if (!activeObj) return;

    const cloned = await activeObj.clone();
    clipboard.current = cloned;
    setCanPaste(true);
  }, []);

  const handlePaste = useCallback(async () => {
    if (!canvasRef.current || !clipboard.current) return;

    const clonedObj = await clipboard.current.clone();

    canvasRef.current.discardActiveObject();

    clonedObj.set({
      left: (clonedObj.left || 0) + 20,
      top: (clonedObj.top || 0) + 20,
      evented: true,
    });

    if (clonedObj.type === 'activeSelection') {
      // Active selection needs special handling to be added back to canvas
      clonedObj.canvas = canvasRef.current;
      (clonedObj as any).forEachObject((obj: any) => {
        canvasRef.current?.add(obj);
        obj.uid = generateId();
      });
      // It's tricky to paste an active selection directly as is, simpler to treat as group or individual objects.
      // For now, let's assume standard behavior (if it was a group, it cloned as a group).
      // If it was a multi-selection, cloning returns an ActiveSelection which isn't a direct canvas object.
      // Fabric 6 might handle this differently. fallback:
      if (clonedObj instanceof fabric.ActiveSelection) {
        clonedObj.setCoords();
      }
    } else {
      canvasRef.current.add(clonedObj);
      (clonedObj as any).uid = generateId();
    }

    canvasRef.current.setActiveObject(clonedObj);
    canvasRef.current.requestRenderAll();
    setSelectedObject(clonedObj);
    setLayers([...canvasRef.current.getObjects()]);
    saveHistory();
  }, [saveHistory]);

  // --- Guide Creation Logic ---
  const handleAddGuide = useCallback((orientation: 'horizontal' | 'vertical') => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const vpt = canvas.viewportTransform;
    if (!vpt) return;

    // Add guide visible in current viewport
    const invert = fabric.util.invertTransform(vpt);
    // Point 50px into the view
    const startPoint = fabric.util.transformPoint({ x: 50, y: 50 }, invert);

    const length = 100000; // Very long line to simulate infinity

    let points: [number, number, number, number];
    let lockX = false;
    let lockY = false;
    let cursor = 'default';

    if (orientation === 'horizontal') {
      // Horizontal line at y = startPoint.y
      points = [-length, startPoint.y, length, startPoint.y];
      lockX = true; // Move Up/Down only
      cursor = 'ns-resize';
    } else {
      // Vertical line at x = startPoint.x
      points = [startPoint.x, -length, startPoint.x, length];
      lockY = true; // Move Left/Right only
      cursor = 'ew-resize';
    }

    const guide = new fabric.Line(points, {
      stroke: '#00FFFF', // Cyan
      strokeWidth: 1,
      selectable: true,
      evented: true,
      lockMovementX: lockX,
      lockMovementY: lockY,
      lockRotation: true,
      lockScalingX: true,
      lockScalingY: true,
      hasControls: false,
      hasBorders: false,
      hoverCursor: cursor,
      strokeUniform: true, // Keep thin regardless of zoom
      opacity: 1
    });

    // Tag as guide
    (guide as any).isGuide = true;
    (guide as any).excludeFromExport = true; // Custom flag for export logic

    canvas.add(guide);
    canvas.setActiveObject(guide);
    canvas.requestRenderAll();
  }, []);

  const handleApplyColor = (type: 'fill' | 'stroke', color: string) => {
    if (!canvasRef.current) return;
    const activeObj = canvasRef.current.getActiveObject();
    if (!activeObj) return;

    activeObj.set(type, color);

    // If setting stroke, ensure width
    if (type === 'stroke' && (!activeObj.strokeWidth || activeObj.strokeWidth === 0)) {
      activeObj.set('strokeWidth', 1);
    }

    canvasRef.current.requestRenderAll();
    saveHistory();
  };

  const handleApplyGradient = (type: 'fill' | 'stroke', gradientDef: any) => {
    if (!canvasRef.current) return;
    const activeObj = canvasRef.current.getActiveObject();
    if (!activeObj) return;

    const gradient = new fabric.Gradient(gradientDef);
    activeObj.set(type, gradient);

    // If setting stroke, ensure width
    if (type === 'stroke' && (!activeObj.strokeWidth || activeObj.strokeWidth === 0)) {
      activeObj.set('strokeWidth', 1);
    }

    canvasRef.current.requestRenderAll();
    saveHistory();
  };

  const handleFit = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    requestAnimationFrame(() => {
      const wrapperW = canvas.getWidth();
      const wrapperH = canvas.getHeight();
      const padding = 40; // Increased padding for better visibility

      const availableW = wrapperW - padding * 2;
      const availableH = wrapperH - padding * 2;

      const scaleX = availableW / PAGE_WIDTH;
      const scaleY = availableH / PAGE_HEIGHT;
      let zoom = Math.min(scaleX, scaleY);

      // Ensure reasonable zoom limits
      if (zoom > 1.5) zoom = 1.5;
      if (zoom < 0.1) zoom = 0.1;

      const vpt = canvas.viewportTransform;
      if (!vpt) return;

      canvas.setZoom(zoom);
      vpt[4] = (wrapperW - PAGE_WIDTH * zoom) / 2;
      vpt[5] = (wrapperH - PAGE_HEIGHT * zoom) / 2;

      canvas.requestRenderAll();
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    if (!canvasRef.current) return;
    let zoom = canvasRef.current.getZoom();
    zoom *= 1.1;
    if (zoom > 20) zoom = 20;
    canvasRef.current.setZoom(zoom);
    canvasRef.current.requestRenderAll();
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!canvasRef.current) return;
    let zoom = canvasRef.current.getZoom();
    zoom /= 1.1;
    if (zoom < 0.01) zoom = 0.01;
    canvasRef.current.setZoom(zoom);
    canvasRef.current.requestRenderAll();
  }, []);

  // --- Image Cropping Logic ---
  const [isCropping, setIsCropping] = useState(false);
  const cropRectRef = useRef<fabric.Rect | null>(null);
  const croppingImageRef = useRef<fabric.Image | null>(null);
  const originalImageStateRef = useRef<any>(null); // Store state before crop mode

  const handleStartCrop = useCallback(() => {
    if (!canvasRef.current || !selectedObject || selectedObject.type !== 'image') return;

    const img = selectedObject as fabric.Image;
    croppingImageRef.current = img;

    // 1. Save current state to restore on Cancel
    originalImageStateRef.current = {
      cropX: img.cropX,
      cropY: img.cropY,
      width: img.width,
      height: img.height,
      scaleX: img.scaleX,
      scaleY: img.scaleY,
      left: img.left,
      top: img.top,
      angle: img.angle // Rotation makes this harder, assuming 0 for now as per previous notes
    };

    // 2. Get Natural Dimensions
    // img.getOriginalSize() might be available, or use element
    const element = img.getElement() as HTMLImageElement;
    const naturalWidth = element.naturalWidth || element.width;
    const naturalHeight = element.naturalHeight || element.height;

    // 3. Calculate where the *current* visible crop is relative to the full image
    const currentCropX = img.cropX || 0;
    const currentCropY = img.cropY || 0;
    const currentWidth = img.width || naturalWidth;
    const currentHeight = img.height || naturalHeight;
    const currentScaleX = img.scaleX || 1;
    const currentScaleY = img.scaleY || 1;

    // 4. Reset Image to show FULL source
    // We want to keep the image broadly in the same place?
    // If we reset cropX/Y to 0, the top-left of the image (0,0) moves to where the cropped top-left was.
    // To keep the *content* in place:
    // The previous top-left visual point corresponded to source (currentCropX, currentCropY).
    // The new top-left visual point corresponds to source (0,0).
    // So we must move the image Left/Top by (currentCropX * scaleX, currentCropY * scaleY).

    // Wait: If (10,10) was at Screen(100,100).
    // Now (0,0) is at Screen(X, Y).
    // Screen(X) + 10*scale = Screen(100). => X = 100 - 10*scale.
    // So NewLeft = OldLeft - (CurrentCropX * ScaleX).

    const newLeft = (img.left || 0) - (currentCropX * currentScaleX);
    const newTop = (img.top || 0) - (currentCropY * currentScaleY);

    img.set({
      cropX: 0,
      cropY: 0,
      width: naturalWidth,
      height: naturalHeight,
      left: newLeft,
      top: newTop
    });

    // 5. Create Crop Rect matching previous visible area
    // Its position should be exactly where the image WAS.
    // Which is simply originalState.left, originalState.top?
    // Yes, because we haven't changed rotation/scaling, just expanded the image "underneath" it.

    const cropRect = new fabric.Rect({
      left: originalImageStateRef.current.left, // Use original visual position
      top: originalImageStateRef.current.top,
      width: currentWidth * currentScaleX, // Visual width
      height: currentHeight * currentScaleY, // Visual height
      fill: 'rgba(0,0,0,0)', // Transparent fill to see image below
      stroke: '#fff',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      cornerColor: 'white',
      cornerStrokeColor: 'black',
      borderColor: 'white',
      transparentCorners: false,
      hasRotatingPoint: false,
      lockRotation: true,
    });

    // Reset image scale? 
    // If image was scaled 2x, we show full image at 2x.
    // cropRect is created at 2x size.
    // This allows cropping at the current zoom level of the image.

    (cropRect as any).uid = 'crop-overlay';

    canvasRef.current.add(cropRect);
    canvasRef.current.setActiveObject(cropRect);
    cropRectRef.current = cropRect;
    setIsCropping(true);
    canvasRef.current.requestRenderAll();

  }, [selectedObject]);

  const handleApplyCrop = useCallback(() => {
    if (!canvasRef.current || !croppingImageRef.current || !cropRectRef.current) return;

    const img = croppingImageRef.current;
    const cropRect = cropRectRef.current;

    // Valid because we know img is currently uncropped (full source).

    const scaleX = img.scaleX || 1;
    const scaleY = img.scaleY || 1;

    // Calculate overlap relative to the Full Image
    // CropRect Left relative to Image Left
    const relativeLeft = (cropRect.left! - img.left!) / scaleX;
    const relativeTop = (cropRect.top! - img.top!) / scaleY;

    // Dimensions
    const relativeWidth = cropRect.getScaledWidth() / scaleX;
    const relativeHeight = cropRect.getScaledHeight() / scaleY;

    // Apply new crop
    img.set({
      cropX: Math.max(0, relativeLeft),
      cropY: Math.max(0, relativeTop),
      width: relativeWidth,
      height: relativeHeight,
    });

    // Visual adjustment to put the cropped result where the crop rect was
    img.set({
      left: cropRect.left,
      top: cropRect.top,
      width: relativeWidth, // Fabric recalculates visual size based on source width * scale
      height: relativeHeight
    });
    // Scale remains consistent!

    // Cleanup
    canvasRef.current.remove(cropRect);
    cropRectRef.current = null;
    croppingImageRef.current = null;
    originalImageStateRef.current = null;
    setIsCropping(false);

    canvasRef.current.setActiveObject(img);
    setSelectedObject(img);
    saveHistory();
    canvasRef.current.requestRenderAll();

  }, [saveHistory]);

  const handleCancelCrop = useCallback(() => {
    if (!canvasRef.current || !cropRectRef.current) return;
    canvasRef.current.remove(cropRectRef.current);
    cropRectRef.current = null;

    // Restore original state if available
    if (croppingImageRef.current && originalImageStateRef.current) {
      croppingImageRef.current.set(originalImageStateRef.current);
      canvasRef.current.setActiveObject(croppingImageRef.current);
      croppingImageRef.current = null;
      originalImageStateRef.current = null;
    }

    setIsCropping(false);
    canvasRef.current.requestRenderAll();
  }, []);

  const handleExportPDF = useCallback(async () => {
    if (!canvasRef.current) return;

    // Temporarily deselect everything
    const activeObj = canvasRef.current.getActiveObject();
    canvasRef.current.discardActiveObject();
    canvasRef.current.renderAll();

    // Find Page Dimensions
    // @ts-ignore
    const pageObj = canvasRef.current.getObjects().find(o => o.isPage) as fabric.Rect;
    const exportWidth = pageObj ? pageObj.width! : PAGE_WIDTH;
    const exportHeight = pageObj ? pageObj.height! : PAGE_HEIGHT;

    // Temporarily include Page in export
    if (pageObj) pageObj.excludeFromExport = false;

    // Temporarily hide workspace background
    const originalBg = canvasRef.current.backgroundColor;
    canvasRef.current.backgroundColor = '';

    const orientation = exportWidth > exportHeight ? 'landscape' : 'portrait';

    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // 1. Generate SVG from Fabric (Cropped to Page)
    const svgString = canvasRef.current.toSVG({
      suppressPreamble: true,
      width: String(exportWidth),
      height: String(exportHeight),
      viewBox: {
        x: 0,
        y: 0,
        width: exportWidth,
        height: exportHeight
      }
    });

    // Restore state
    if (pageObj) pageObj.excludeFromExport = true;
    canvasRef.current.backgroundColor = originalBg;

    // 2. Parse SVG String to DOM Element
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svgElement = doc.documentElement;

    // 3. Convert SVG to PDF
    await pdf.svg(svgElement, {
      x: 0,
      y: 0,
      width: pdfWidth,
      height: pdfHeight,
      loadExternalStyleSheets: false
    });

    // Restore selection
    if (activeObj) {
      canvasRef.current.setActiveObject(activeObj);
      canvasRef.current.renderAll();
    }

    const pdfOutput = pdf.output('arraybuffer');

    if (window.electronAPI) {
      await window.electronAPI.saveFile(pdfOutput, 'design_vector.pdf');
    }
  }, []);

  // --- Alignment Logic ---
  // --- Alignment Logic (Align to Page) ---
  const handleAlign = useCallback((alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!canvasRef.current) return;
    const activeObj = canvasRef.current.getActiveObject();
    if (!activeObj) return;

    // Find Page Dimensions dynamically
    // @ts-ignore
    const pageObj = canvasRef.current.getObjects().find(o => o.isPage) as fabric.Rect;
    const pageWidth = pageObj ? pageObj.width! : PAGE_WIDTH;
    const pageHeight = pageObj ? pageObj.height! : PAGE_HEIGHT;

    const r = activeObj.getBoundingRect();
    const w = r.width;
    const h = r.height;

    // We calculate the Desired Top/Left of the Bounding Box
    let desiredLeft = r.left;
    let desiredTop = r.top;

    switch (alignment) {
      case 'left': desiredLeft = 0; break;
      case 'center': desiredLeft = (pageWidth - w) / 2; break;
      case 'right': desiredLeft = pageWidth - w; break;
      case 'top': desiredTop = 0; break;
      case 'middle': desiredTop = (pageHeight - h) / 2; break;
      case 'bottom': desiredTop = pageHeight - h; break;
    }

    // Apply the difference to the object's actual position
    // This handles rotation/origin safely by just shifting
    const deltaX = desiredLeft - r.left;
    const deltaY = desiredTop - r.top;

    activeObj.set('left', (activeObj.left || 0) + deltaX);
    activeObj.set('top', (activeObj.top || 0) + deltaY);

    activeObj.setCoords();
    canvasRef.current.requestRenderAll();
    saveHistory();

  }, [saveHistory]);

  const handleGroup = useCallback(() => {
    if (!canvasRef.current) return;

    // v6 Robust Check: Use getActiveObjects() to find out what is selected.
    // This avoids relying on the 'activeSelection' type string which seems unreliable in this setup.
    const activeObjects = canvasRef.current.getActiveObjects();

    console.log('Action: Group. Selected items count:', activeObjects.length);

    if (!activeObjects || activeObjects.length < 2) {
      console.warn('Grouping failed: Need at least 2 objects selected.');
      return;
    }

    const canvas = canvasRef.current;

    try {
      // v6 Migration: Manual Group Creation

      // 1. Remove the active selection mechanism (discard selection UI)
      canvas.discardActiveObject();

      // 2. Remove individual objects from canvas (they will be added to the new group)
      activeObjects.forEach(obj => {
        canvas.remove(obj);
      });

      // 3. Create the Group with the objects
      const group = new fabric.Group(activeObjects, {
        canvas: canvas
      });

      // 4. Assign ID
      (group as any).uid = generateId();

      // 5. Add group to canvas and select it
      canvas.add(group);
      canvas.setActiveObject(group);

      canvas.requestRenderAll();
      setSelectedObject(group);

      setLayers([...canvas.getObjects()]);
      saveHistory();
      console.log('Group created (v6 robust):', group);

    } catch (err) {
      console.error('Group creation failed:', err);
    }
  }, [saveHistory]);

  const handleUngroup = useCallback(() => {
    if (!canvasRef.current) return;
    const activeObj = canvasRef.current.getActiveObject();

    console.log('Action: Ungroup. Active Type:', activeObj?.type);

    if (!activeObj || activeObj.type !== 'group') {
      console.warn('Ungrouping failed: Selected object is not a group.');
      return;
    }

    const group = activeObj as fabric.Group;
    const canvas = canvasRef.current;

    try {
      // v6 Migration: Manual Ungrouping
      // 1. Remove group from canvas
      canvas.remove(group);

      // 2. Get children and destroy group structure
      // removeAll() returns the objects and restores their canvas-relative coordinates
      const items = group.removeAll();

      // 3. Add items back to canvas
      items.forEach(item => {
        canvas.add(item);
      });

      // 4. Select the items (create ActiveSelection)
      const activeSelection = new fabric.ActiveSelection(items, {
        canvas: canvas
      });

      canvas.setActiveObject(activeSelection);

      canvas.requestRenderAll();
      setSelectedObject(activeSelection);
      setLayers([...canvas.getObjects()]);
      saveHistory();
      console.log('Group ungrouped (v6 manual).');
    } catch (err) {
      console.error('Ungroup failed:', err);
    }
  }, [saveHistory]);


  const handleAction = useCallback((action: string) => {
    if (!canvasRef.current || !selectedObject) return;

    switch (action) {
      case 'delete':
        handleDelete();
        break;
      case 'bringToFront':
        canvasRef.current.bringObjectToFront(selectedObject);
        canvasRef.current.renderAll();
        saveHistory();
        break;
      case 'sendToBack':
        canvasRef.current.sendObjectToBack(selectedObject);
        canvasRef.current.renderAll();
        saveHistory();
        break;
      case 'bringForward':
        canvasRef.current.bringObjectForward(selectedObject);
        canvasRef.current.renderAll();
        saveHistory();
        break;
      case 'sendBackwards':
        canvasRef.current.sendObjectBackwards(selectedObject);
        canvasRef.current.renderAll();
        saveHistory();
        break;
      case 'uppercase':
        if (selectedObject.type === 'i-text' || selectedObject.type === 'text') {
          const obj = selectedObject as any;
          // Check if editing and has selection
          if (obj.isEditing && obj.selectionStart !== obj.selectionEnd) {
            const start = obj.selectionStart;
            const end = obj.selectionEnd;
            const selectedText = obj.text.slice(start, end);
            obj.removeChars(start, end);
            obj.insertChars(selectedText.toUpperCase(), null, start);
          } else {
            // Convert entire text
            obj.set('text', obj.text.toUpperCase());
          }
          canvasRef.current.requestRenderAll();
          saveHistory();
        }
        break;
    }
  }, [selectedObject, handleDelete, saveHistory]);

  const handleLayerSelect = (obj: fabric.Object) => {
    if (!canvasRef.current) return;
    canvasRef.current.setActiveObject(obj);
    canvasRef.current.renderAll();
    setSelectedObject(obj);
  };

  const handleToggleVisibility = (obj: fabric.Object) => {
    if (!canvasRef.current) return;
    obj.set('visible', !obj.visible);
    if (!obj.visible) {
      canvasRef.current.discardActiveObject();
      setSelectedObject(null);
    }
    canvasRef.current.requestRenderAll();
    setLayers([...canvasRef.current.getObjects()]);
  };

  const handleToggleLock = (obj: fabric.Object) => {
    if (!canvasRef.current) return;
    const isLocked = !obj.lockMovementX;
    obj.set({
      lockMovementX: isLocked,
      lockMovementY: isLocked,
      lockRotation: isLocked,
      lockScalingX: isLocked,
      lockScalingY: isLocked
    });
    canvasRef.current.requestRenderAll();
    setLayers([...canvasRef.current.getObjects()]);
  };

  const handleLayerReorder = (sourceIndex: number, destinationIndex: number) => {
    if (!canvasRef.current) return;
    const objects = canvasRef.current.getObjects();
    const obj = objects[sourceIndex];

    // Move in Fabric (it handles z-index shifting)
    canvasRef.current.moveObjectTo(obj, destinationIndex);

    canvasRef.current.renderAll();
    setLayers([...canvasRef.current.getObjects()]);
    saveHistory();
  };

  return (
    <div className="app-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: 'var(--bg-app)',
      color: 'var(--text-primary)'
    }}>

      {/* Header / Top Bar */}
      <header style={{
        height: '40px',
        background: 'var(--bg-header)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600, fontSize: '14px', marginRight: '16px' }}>Publisher X</span>

          {/* Main Actions */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={handleNew} title="Nouveau Projet" style={{ padding: '4px' }}>
              <FilePlus size={18} />
            </button>
            <button onClick={handleSave} title="Sauvegarder" style={{ padding: '4px' }}>
              <Save size={18} />
            </button>
            <button onClick={handleLoad} title="Ouvrir" style={{ padding: '4px' }}>
              <FolderOpen size={18} />
            </button>
          </div>

          <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 8px' }}></div>

          {/* History Actions */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={undo} disabled={!canUndo} title="Annuler" style={{ padding: '4px' }}>
              <Undo2 size={18} />
            </button>
            <button onClick={redo} disabled={!canRedo} title="Rétablir" style={{ padding: '4px' }}>
              <Redo2 size={18} />
            </button>
          </div>

          <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 8px' }}></div>

          {/* Clipboard Actions */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={handleCopy} title="Copier" style={{ padding: '4px' }}>
              <Copy size={18} />
            </button>
            <button onClick={handlePaste} disabled={!canPaste} title="Coller" style={{ padding: '4px' }}>
              <StickyNote size={18} />
            </button>
          </div>

          <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 8px' }}></div>

          {/* Grouping Actions */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={handleGroup} title="Grouper" style={{ padding: '4px' }}>
              <Group size={18} />
            </button>
            <button onClick={handleUngroup} title="Dégrouper" style={{ padding: '4px' }}>
              <Ungroup size={18} />
            </button>
          </div>

          <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 8px' }}></div>

          {/* Zoom Actions */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={handleZoomOut} title="Zoom Arrière" style={{ padding: '4px' }}>
              <ZoomOut size={18} />
            </button>
            <button onClick={handleFit} title="Adapter à l'écran" style={{ padding: '4px' }}>
              <Maximize size={18} />
            </button>
            <button onClick={handleZoomIn} title="Zoom Avant" style={{ padding: '4px' }}>
              <ZoomIn size={18} />
            </button>
          </div>

          <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 8px' }}></div>

          {/* Alignment Actions */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => handleAlign('left')} title="Aligner Gauche (Page)" style={{ padding: '4px' }}><AlignStartVertical size={18} /></button>
            <button onClick={() => handleAlign('center')} title="Centrer (Page)" style={{ padding: '4px' }}><AlignCenterVertical size={18} /></button>
            <button onClick={() => handleAlign('right')} title="Aligner Droite (Page)" style={{ padding: '4px' }}><AlignEndVertical size={18} /></button>

            <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 2px' }}></div>

            <button onClick={() => handleAlign('top')} title="Aligner Haut (Page)" style={{ padding: '4px' }}><AlignStartHorizontal size={18} /></button>
            <button onClick={() => handleAlign('middle')} title="Centrer Vert (Page)" style={{ padding: '4px' }}><AlignCenterHorizontal size={18} /></button>
            <button onClick={() => handleAlign('bottom')} title="Aligner Bas (Page)" style={{ padding: '4px' }}><AlignEndHorizontal size={18} /></button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Export Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleExportImage}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '12px', background: '#2d4a3e', padding: '4px 8px'
              }}>
              <Download size={14} /> PNG
            </button>
            <button
              onClick={handleExportPDF}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '12px', background: '#4a2d2d', padding: '4px 8px'
              }}>
              <Download size={14} /> PDF
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left Toolbar */}
        <div style={{
          width: '50px',
          background: 'var(--bg-panel)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          gap: '12px'
        }}>
          <button
            onClick={() => setActiveTool('select')}
            title="Sélection (V)"
            style={{
              padding: '8px',
              borderRadius: '4px',
              background: activeTool === 'select' ? 'var(--accent-color)' : 'transparent',
              color: activeTool === 'select' ? '#fff' : 'inherit'
            }}>
            <MousePointer2 size={20} />
          </button>

          <button
            onClick={() => setActiveTool('hand')}
            title="Outil Main (H)"
            style={{
              padding: '8px',
              borderRadius: '4px',
              background: activeTool === 'hand' ? 'var(--accent-color)' : 'transparent',
              color: activeTool === 'hand' ? '#fff' : 'inherit'
            }}>
            <Hand size={20} />
          </button>

          <button
            onClick={() => setActiveTool('pen')}
            title="Outil Plume (P)"
            style={{
              padding: '8px',
              borderRadius: '4px',
              background: activeTool === 'pen' ? 'var(--accent-color)' : 'transparent',
              color: activeTool === 'pen' ? '#fff' : 'inherit'
            }}>
            <PenTool size={20} />
          </button>

          <div style={{ width: '20px', height: '1px', background: 'var(--border-color)' }}></div>

          <button onClick={addText} title="Texte" style={{ padding: '8px' }}>
            <Type size={20} />
          </button>

          {/* Shape Selector Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowShapeMenu(!showShapeMenu)}
              title="Formes"
              style={{
                padding: '8px',
                borderRadius: '4px',
                background: showShapeMenu ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: 'var(--text-primary)',
                border: 'none',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              <Square size={20} />
              <div style={{ fontSize: '8px', position: 'absolute', bottom: 2, right: 2 }}>▼</div>
            </button>

            {showShapeMenu && (
              <div style={{
                position: 'absolute',
                left: '100%',
                top: 0,
                marginLeft: '8px',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '4px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '4px',
                width: '80px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                zIndex: 1000
              }}>
                <button onClick={() => handleAddShape('rect')} title="Rectangle" style={shapeBtnStyle}><Square size={16} /></button>
                <button onClick={() => handleAddShape('roundRect')} title="Arrondi" style={shapeBtnStyle}><Square size={16} style={{ borderRadius: 4 }} /></button>
                <button onClick={() => handleAddShape('circle')} title="Cercle" style={shapeBtnStyle}><Circle size={16} /></button>
                <button onClick={() => handleAddShape('triangle')} title="Triangle" style={shapeBtnStyle}><Triangle size={16} /></button>
                <button onClick={() => handleAddShape('star')} title="Étoile" style={shapeBtnStyle}><Star size={16} /></button>
                <button onClick={() => handleAddShape('line')} title="Ligne" style={shapeBtnStyle}><Minus size={16} /></button>
                <button onClick={() => handleAddShape('arrow')} title="Flèche" style={shapeBtnStyle}><ArrowRightIconWrapper /></button>
                <button onClick={() => handleAddQRCode()} title="QR Code" style={shapeBtnStyle}><QrCode size={16} /></button>
              </div>
            )}
          </div>
          <button onClick={() => fileInputRef.current?.click()} title="Image" style={{ padding: '8px' }}>
            <ImageIcon size={20} />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleImageUpload}
          />
        </div>

        {/* Center Canvas Area with Rulers */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '20px 1fr',
          gridTemplateRows: '20px 1fr',
          backgroundColor: '#333',
          position: 'relative',
          minWidth: 0,
          overflow: 'hidden'
        }}>
          {/* Corner */}
          <div style={{ background: '#f0f0f0', borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', zIndex: 10 }}></div>

          {/* Top Ruler */}
          <div style={{ borderBottom: '1px solid #ccc', overflow: 'hidden', zIndex: 9, background: '#f0f0f0' }}>
            <Ruler orientation="horizontal" canvas={canvasRef.current} onMouseDown={() => handleAddGuide('horizontal')} />
          </div>

          {/* Left Ruler */}
          <div style={{ borderRight: '1px solid #ccc', overflow: 'hidden', zIndex: 9, background: '#f0f0f0' }}>
            <Ruler orientation="vertical" canvas={canvasRef.current} onMouseDown={() => handleAddGuide('vertical')} />
          </div>

          {/* Canvas Cell */}
          <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onContextMenu={(e) => {
              e.preventDefault();
              // Determine available actions based on selection
              const selection = canvasRef.current?.getActiveObject();
              const actions = [];

              // Basic Actions
              if (selection) {
                actions.push({ label: 'Copier', icon: <Copy size={16} />, action: handleCopy });
                actions.push({ label: 'Supprimer', icon: <Trash2 size={16} />, danger: true, action: handleDelete });

                // Z-Index
                actions.push({ label: 'Premier Plan', icon: <BringToFront size={16} />, action: () => handleAction('bringToFront') });
                actions.push({ label: 'Arrière Plan', icon: <SendToBack size={16} />, action: () => handleAction('sendToBack') });

                // Grouping
                if (selection.type === 'activeSelection') {
                  actions.push({ label: 'Grouper', icon: <Group size={16} />, action: handleGroup });
                }
                if (selection.type === 'group') {
                  actions.push({ label: 'Dégrouper', icon: <Ungroup size={16} />, action: handleUngroup });
                }
                if (selection.type === 'textbox') {
                  actions.push({
                    label: 'Insérer Tabulation',
                    icon: <AlignStartVertical size={16} />,
                    action: () => {
                      const tb = selection as fabric.Textbox;
                      if (tb.isEditing) {
                        // Manual insertion
                        const text = tb.text || '';
                        const start = tb.selectionStart || 0;
                        const end = tb.selectionEnd || 0;
                        const newText = text.slice(0, start) + '\t' + text.slice(end);
                        tb.set('text', newText);
                        tb.selectionStart = start + 1;
                        tb.selectionEnd = start + 1;
                        tb.set('dirty', true);
                      } else {
                        // If not editing, append to end
                        const text = tb.text || '';
                        const newText = text + '\t';
                        tb.set('text', newText);
                        tb.set('dirty', true);
                      }
                      canvasRef.current?.requestRenderAll();
                      saveHistory();
                    }
                  });
                }
              } else {
                actions.push({ label: 'Coller', icon: <StickyNote size={16} />, disabled: !canPaste, action: handlePaste });
              }

              if (actions.length > 0) {
                setContextMenu({ x: e.clientX, y: e.clientY, visible: true, actions });
              }
            }}
            onClick={() => {
              if (contextMenu.visible) setContextMenu(prev => ({ ...prev, visible: false }));
            }}
          >
            <div style={{
              boxShadow: '0 0 20px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              position: 'relative',
              overflow: 'hidden', // Ensure no scrollbars
              minHeight: 0 // Crucial for flex nested scrolling
            }}>

              <CanvasArea onCanvasReady={handleCanvasReady} onSelectionChange={handleSelectionChange}>
              </CanvasArea>
            </div>

            {contextMenu.visible && (
              <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                options={contextMenu.actions}
                onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
              />
            )}

            {/* QR Code Modal (Simple Overlay) */}
            {showQRModal && (
              <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2000
              }}>
                <div style={{
                  background: 'var(--bg-panel)', padding: '20px', borderRadius: '8px',
                  border: '1px solid var(--border-color)', minWidth: '300px',
                  display: 'flex', flexDirection: 'column', gap: '10px'
                }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Générer un QR Code</h3>
                  <input
                    type="text"
                    placeholder="https://example.com"
                    autoFocus
                    id="qr-input"
                    style={{ padding: '8px', background: 'var(--bg-canvas)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ color: 'var(--text-primary)', fontSize: '14px' }}>Couleur:</label>
                    <input
                      type="color"
                      id="qr-color"
                      defaultValue="#000000"
                      style={{ border: 'none', padding: 0, width: '30px', height: '30px', cursor: 'pointer', background: 'transparent' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      onClick={() => setShowQRModal(false)}
                      style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => {
                        const input = document.getElementById('qr-input') as HTMLInputElement;
                        const colorInput = document.getElementById('qr-color') as HTMLInputElement;
                        if (input && input.value) {
                          handleConfirmQRCode(input.value, colorInput?.value || '#000000');
                          setShowQRModal(false);
                        }
                      }}
                      style={{ padding: '6px 12px', background: 'var(--accent-color)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Générer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar (Properties) */}
        <div style={{
          width: '280px',
          minWidth: '280px', // Prevent shrinking
          flexShrink: 0,     // Enforce fixed width
          background: 'var(--bg-panel)',
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setActiveTab('properties')}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '12px',
                fontWeight: 600,
                color: activeTab === 'properties' ? 'var(--accent-color)' : 'var(--text-muted)',
                borderBottom: activeTab === 'properties' ? '2px solid var(--accent-color)' : 'none',
                background: 'transparent'
              }}
            >
              PROPERTIES
            </button>
            <button
              onClick={() => setActiveTab('layers')}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '12px',
                fontWeight: 600,
                color: activeTab === 'layers' ? 'var(--accent-color)' : 'var(--text-muted)',
                borderBottom: activeTab === 'layers' ? '2px solid var(--accent-color)' : 'none',
                background: 'transparent'
              }}
            >
              LAYERS
            </button>
            <button
              onClick={() => setActiveTab('colors')}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '12px',
                fontWeight: 600,
                color: activeTab === 'colors' ? 'var(--accent-color)' : 'var(--text-muted)',
                borderBottom: activeTab === 'colors' ? '2px solid var(--accent-color)' : 'none',
                background: 'transparent'
              }}
            >
              COLORS
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeTab === 'properties' ? <PropertiesPanel
              selectedObject={selectedObject}
              systemFonts={fonts}
              onPropertyChange={handlePropertyChange}
              onAction={handleAction}
              isCropping={isCropping}
              onStartCrop={handleStartCrop}
              onApplyCrop={handleApplyCrop}
              onCancelCrop={handleCancelCrop}
            />
              : activeTab === 'colors' ? (
                <ColorPanel
                  colors={paletteColors}
                  gradients={paletteGradients}
                  onColorAdd={(c) => setPaletteColors([...paletteColors, c])}
                  onColorRemove={(i) => {
                    const newColors = [...paletteColors];
                    newColors.splice(i, 1);
                    setPaletteColors(newColors);
                  }}
                  onGradientAdd={(g) => setPaletteGradients([...paletteGradients, g])}
                  onGradientRemove={(i) => {
                    const newGrads = [...paletteGradients];
                    newGrads.splice(i, 1);
                    setPaletteGradients(newGrads);
                  }}
                  onApplyColor={handleApplyColor}
                  onApplyGradient={handleApplyGradient}
                />
              ) : (
                <LayersPanel
                  objects={layers}
                  selectedObject={selectedObject}
                  onSelect={handleLayerSelect}
                  onToggleVisibility={handleToggleVisibility}
                  onToggleLock={handleToggleLock}
                  onReorder={handleLayerReorder}
                />
              )}
          </div>
        </div>

      </div>
    </div >
  );
}

export default App

