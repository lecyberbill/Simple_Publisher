import { useState, useEffect, useRef, useCallback } from 'react'
import * as fabric from 'fabric';
import {
  Square, Type, Image as ImageIcon, Save, FolderOpen, FilePlus, Undo2, Redo2, Trash2, Download, Circle, Triangle, Minus, Group, Ungroup, Copy, StickyNote, BringToFront, SendToBack,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  ZoomIn, ZoomOut, Maximize,
  Star, QrCode, X
} from 'lucide-react';
import QRCode from 'qrcode';
import './App.css'
import { CanvasArea } from './components/CanvasArea';
import { PropertiesPanel } from './components/PropertiesPanel';
import { LayersPanel } from './components/LayersPanel';
import { ContextMenu } from './components/ContextMenu';
import { MousePointer2, Hand, PenTool, Pencil, Paintbrush } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'svg2pdf.js';
import { Ruler } from './components/Ruler';
import { ColorPanel } from './components/ColorPanel';
import { enterPathEditMode, exitPathEditMode, togglePathPointType, getStarPoints } from './utils/polyControlUtils';
import type { PathControlHandle } from './utils/polyControlUtils';

// ... (existing imports)



import { patchFabricTextRender } from './utils/fabricUtils';

// Apply custom patches to Fabric.js prototypes (Background, Border, Alignment, Tabs)
patchFabricTextRender();

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

const CANVAS_EXPORT_PROPERTIES = [
  'id',
  'uid',
  'isPage',
  'locked',
  'selectable',
  'evented',
  'hoverCursor',
  'excludeFromExport',
  'brushType',
  'brushPatternScale',
  'verticalAlign',
  'tabs',
  'underlineOffset',
  'boxBorderColor',
  'boxBorderWidth',
  'starPoints',
  'starInnerRadiusRatio',
  'isStar',
  'rx',
  'ry'
];

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

interface Page {
  id: string;
  canvasObjects: any;
  thumbnail: string;
}

function App() {
  const [fonts, setFonts] = useState<string[]>([]);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [layers, setLayers] = useState<fabric.Object[]>([]);
  const [activeTab, setActiveTab] = useState<'properties' | 'layers' | 'colors'>('properties');
  const [paletteColors, setPaletteColors] = useState<string[]>(['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff', '#ffffff', '#000000']);
  const [paletteGradients, setPaletteGradients] = useState<any[]>([]);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  // Multi-page State
  const [pages, setPages] = useState<Page[]>([
    { id: 'initial', canvasObjects: null, thumbnail: '' }
  ]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const currentPageIndexRef = useRef(0);

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, visible: boolean, actions: any[] }>({ x: 0, y: 0, visible: false, actions: [] });

  // Drawing State
  const [brushType, setBrushType] = useState('Pencil');
  const [brushWidth, setBrushWidth] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushShadowColor, setBrushShadowColor] = useState('#000000');
  const [brushShadowWidth, setBrushShadowWidth] = useState(0);
  const [brushTexture, setBrushTexture] = useState<string | null>(null);
  const [brushPatternScale, setBrushPatternScale] = useState(10);

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

  // Helper: Generate Pattern Canvas
  const generatePatternCanvas = useCallback((type: string, color: string, scale: number) => {
    const size = scale;
    // @ts-ignore
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = patternCanvas.height = size;
    const ctx = patternCanvas.getContext('2d');

    if (!ctx) return patternCanvas;

    if (type === 'Pattern') { // Dot
      const radius = size / 4;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2, false);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'VLine') {
      ctx.strokeStyle = color;
      ctx.lineWidth = size / 2;
      ctx.beginPath();
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.closePath();
      ctx.stroke();
    } else if (type === 'HLine') {
      ctx.strokeStyle = color;
      ctx.lineWidth = size / 2;
      ctx.beginPath();
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size / 2, size);
      ctx.closePath();
      ctx.stroke();
    } else if (type === 'Square') {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, size - 2, size - 2);
    } else if (type === 'Diamond') {
      const rect = new fabric.Rect({ width: size * 0.7, height: size * 0.7, angle: 45, fill: color });
      const canvasWidth = rect.getBoundingRect().width;
      patternCanvas.width = patternCanvas.height = canvasWidth + 2; // Resize canvas for diamond
      rect.set({ left: patternCanvas.width / 2, top: patternCanvas.height / 2 });
      rect.render(ctx as any);
    }

    return patternCanvas;
  }, []);

  const setupPage = (canvas: fabric.Canvas) => {
    // workspace background
    canvas.backgroundColor = '#f0f0f0';

    // Ensure no existing page - Remove duplicates
    const objects = canvas.getObjects();
    const existingPages = objects.filter(o => (o as any).isPage);
    if (existingPages.length > 0) {
      existingPages.forEach(p => canvas.remove(p));
    }

    // Create Page Object
    const pageObject = new fabric.Rect({
      left: 0,
      top: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      fill: '#ffffff', // Always white, not transparent
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

    // Use REF for sync access to current page index
    const currentIndex = currentPageIndexRef.current;

    // Capture current canvas state
    // @ts-ignore
    const canvasJSON = canvasRef.current.toJSON(CANVAS_EXPORT_PROPERTIES);
    const thumbnail = canvasRef.current.toDataURL({ multiplier: 0.1, quality: 0.5 });

    // We use setPages with a callback to ensure we have the latest pages array
    // and then we update the history based on that.
    setPages(prevPages => {
      const updatedPages = [...prevPages];
      if (updatedPages[currentIndex]) {
        updatedPages[currentIndex] = {
          ...updatedPages[currentIndex],
          canvasObjects: canvasJSON,
          thumbnail
        };
      }

      // Create a full project snapshot
      const projectSnapshot = {
        pages: updatedPages,
        currentPageIndex: currentIndex
      };

      const json = JSON.stringify(projectSnapshot);

      const currentIdx = historyIndexRef.current;
      const newHistory = historyRef.current.slice(0, currentIdx + 1);
      newHistory.push(json);

      historyRef.current = newHistory;
      historyIndexRef.current = newHistory.length - 1;

      updateHistoryState();
      return updatedPages;
    });
  }, []); // Remove dependency on currentPageIndex to avoid stale closures if it changes async

  const addPage = useCallback(() => {
    if (!canvasRef.current) return;

    // Use REF for sync access
    const currentIndex = currentPageIndexRef.current;

    // Sync current page first
    // @ts-ignore
    const currentJSON = canvasRef.current.toJSON(CANVAS_EXPORT_PROPERTIES);
    const thumbnail = canvasRef.current.toDataURL({ multiplier: 0.1, quality: 0.5 });

    setPages(prevPages => {
      const updatedPages = [...prevPages];
      if (updatedPages[currentIndex]) {
        updatedPages[currentIndex] = {
          ...updatedPages[currentIndex],
          canvasObjects: currentJSON,
          thumbnail
        };
      }

      const newPage: Page = {
        id: generateId(),
        canvasObjects: null,
        thumbnail: ''
      };

      const newPages = [...updatedPages, newPage];
      const newIndex = newPages.length - 1;

      // Canvas cleanup
      isInternalUpdate.current = true;
      canvasRef.current!.clear();
      setupPage(canvasRef.current!);
      canvasRef.current!.renderAll();
      isInternalUpdate.current = false;

      setCurrentPageIndex(newIndex);
      currentPageIndexRef.current = newIndex; // Update REF immediately

      setSelectedObject(null);
      setLayers([]);

      // Save History for the transition
      const snapshot = JSON.stringify({
        pages: newPages,
        currentPageIndex: newIndex
      });

      const currentIdx = historyIndexRef.current;
      const h = historyRef.current.slice(0, currentIdx + 1);
      h.push(snapshot);
      historyRef.current = h;
      historyIndexRef.current = h.length - 1;
      updateHistoryState();

      return newPages;
    });
  }, []);

  const switchPage = useCallback(async (index: number) => {
    // Current Index from REF
    const currentIndex = currentPageIndexRef.current;

    if (!canvasRef.current || index === currentIndex || index < 0 || index >= pages.length) return;

    // Save current
    // @ts-ignore
    const currentJSON = canvasRef.current.toJSON(CANVAS_EXPORT_PROPERTIES);
    const thumb = canvasRef.current.toDataURL({ multiplier: 0.1, quality: 0.5 });

    // Use functional update to ensure we have latest pages
    setPages(prevPages => {
      const updatedPages = [...prevPages];
      // Save to the INDEX we are leaving (currentIndex)
      updatedPages[currentIndex] = {
        ...updatedPages[currentIndex],
        canvasObjects: currentJSON,
        thumbnail: thumb
      };

      // Return updated pages - we will use this logic in the async part too via closure if needed, 
      // but setState is better. 
      // Wait, we need to load the Target Page now.
      // Doing this inside setPages is tricky because loading is async.
      // Let's rely on 'pages' dependency but use Ref for index.
      return updatedPages;
    });

    // We update the local variable to proceed with loading
    const updatedPages = [...pages];
    updatedPages[currentIndex] = {
      ...updatedPages[currentIndex],
      canvasObjects: currentJSON,
      thumbnail: thumb
    };

    // Load Target
    const targetPage = updatedPages[index];
    isInternalUpdate.current = true;

    await canvasRef.current.clear();
    if (targetPage.canvasObjects) {
      await canvasRef.current.loadFromJSON(targetPage.canvasObjects);
    }
    setupPage(canvasRef.current);
    canvasRef.current.renderAll();

    // Finalize state update
    // setPages(updatedPages); // Already triggered via setPages above? No, above was functional.
    // Actually, to avoid conflicts, let's do one atomic update of pages at the end or begin.
    // Let's stick to updating state once.

    setPages(updatedPages);
    setCurrentPageIndex(index);
    currentPageIndexRef.current = index; // Update REF

    setSelectedObject(null);
    setLayers([...canvasRef.current.getObjects().filter(o => !(o as any).isPage)]);

    isInternalUpdate.current = false;

    // History Snapshot
    const snapshot = JSON.stringify({
      pages: updatedPages,
      currentPageIndex: index
    });

    const currentIdx = historyIndexRef.current;
    const h = historyRef.current.slice(0, currentIdx + 1);
    h.push(snapshot);
    historyRef.current = h;
    historyIndexRef.current = h.length - 1;
    updateHistoryState();

  }, [pages]); // Removed currentPageIndex dependency, use Ref

  const deletePage = useCallback((index: number) => {
    if (pages.length <= 1) return;
    if (!confirm('Supprimer cette page ? Cette action est irréversible (sauf via Annuler).')) return;

    setPages(prevPages => {
      const updatedPages = prevPages.filter((_, i) => i !== index);
      const currentIndex = currentPageIndexRef.current;
      let newIndex = currentIndex;

      if (index <= currentIndex && currentIndex > 0) {
        newIndex = currentIndex - 1;
      }
      if (newIndex >= updatedPages.length) {
        newIndex = updatedPages.length - 1;
      }

      // If we are deleting the current page, we must LOAD the new current page
      if (index === currentIndex) {
        const targetPage = updatedPages[newIndex];
        isInternalUpdate.current = true;
        canvasRef.current?.clear();
        if (targetPage.canvasObjects) {
          canvasRef.current?.loadFromJSON(targetPage.canvasObjects).then(() => {
            setupPage(canvasRef.current!);
            canvasRef.current?.renderAll();
            setLayers([...canvasRef.current!.getObjects().filter(o => !(o as any).isPage)]);
            isInternalUpdate.current = false;
          });
        } else {
          setupPage(canvasRef.current!);
          canvasRef.current?.renderAll();
          setLayers([]);
          isInternalUpdate.current = false;
        }
      }

      setCurrentPageIndex(newIndex);
      currentPageIndexRef.current = newIndex; // Update REF

      // History
      const snapshot = JSON.stringify({
        pages: updatedPages,
        currentPageIndex: newIndex
      });

      const currentIdx = historyIndexRef.current;
      const h = historyRef.current.slice(0, currentIdx + 1);
      h.push(snapshot);
      historyRef.current = h;
      historyIndexRef.current = h.length - 1;
      updateHistoryState();

      return updatedPages;
    });
  }, [pages, currentPageIndex]);

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





  const [activeTool, setActiveTool] = useState<'select' | 'hand' | 'pencil' | 'pen' | 'brush'>('select');
  const isPanning = useRef(false);

  const lastMousePosition = useRef({ x: 0, y: 0 });

  // Edit Mode State
  const [editingPath, setEditingPath] = useState<fabric.Path | null>(null);


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

  // TOOL STATE MANAGEMENT (Hand, Pen, Select)
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    // Reset Defaults
    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.defaultCursor = 'default';
    canvas.forEachObject(o => {
      if (!(o as any).isPage) o.selectable = true;
    });

    if (activeTool === 'hand') {
      canvas.selection = false;
      canvas.defaultCursor = 'grab';
      canvas.forEachObject(o => o.selectable = false);
      canvas.discardActiveObject();

    } else if (activeTool === 'pencil') {
      canvas.isDrawingMode = true;
      // Simple Pencil
      // @ts-ignore
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.width = 2;
      canvas.freeDrawingBrush.color = 'black';
      canvas.defaultCursor = 'crosshair';
      canvas.discardActiveObject();

    } else if (activeTool === 'brush') {
      canvas.isDrawingMode = true;

      // Configure Advanced Brush
      const configureBrush = () => {
        let brush = null;
        if (brushType === 'Pencil') {
          // @ts-ignore
          brush = new fabric.PencilBrush(canvas);
        } else if (brushType === 'Circle') {
          // @ts-ignore
          brush = new fabric.CircleBrush(canvas);
        } else if (brushType === 'Spray') {
          // @ts-ignore
          brush = new fabric.SprayBrush(canvas);
          brush = new fabric.PatternBrush(canvas); // Default Pattern
        } else if (['Pattern', 'HLine', 'VLine', 'Square', 'Diamond', 'Texture'].includes(brushType)) {
          // @ts-ignore
          brush = new fabric.PatternBrush(canvas);

          if (brushType === 'Pattern') {
            // Default Dot Pattern with Scale
            brush.getPatternSrc = function () {
              const size = brushPatternScale; // approx space
              const radius = size / 4;
              // @ts-ignore
              const patternCanvas = document.createElement('canvas');
              patternCanvas.width = patternCanvas.height = size;
              const ctx = patternCanvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2, false);
                ctx.closePath();
                ctx.fill();
              }
              return patternCanvas;
            };
          } else if (brushType === 'VLine') {
            brush.getPatternSrc = function () {
              const size = brushPatternScale;
              // @ts-ignore
              const patternCanvas = document.createElement('canvas');
              patternCanvas.width = patternCanvas.height = size;
              const ctx = patternCanvas.getContext('2d');
              if (ctx) {
                ctx.strokeStyle = this.color;
                ctx.lineWidth = size / 2;
                ctx.beginPath();
                ctx.moveTo(0, size / 2);
                ctx.lineTo(size, size / 2);
                ctx.closePath();
                ctx.stroke();
              }
              return patternCanvas;
            };
          } else if (brushType === 'HLine') {
            brush.getPatternSrc = function () {
              const size = brushPatternScale;
              // @ts-ignore
              const patternCanvas = document.createElement('canvas');
              patternCanvas.width = patternCanvas.height = size;
              const ctx = patternCanvas.getContext('2d');
              if (ctx) {
                ctx.strokeStyle = this.color;
                ctx.lineWidth = size / 2;
                ctx.beginPath();
                ctx.moveTo(size / 2, 0);
                ctx.lineTo(size / 2, size);
                ctx.closePath();
                ctx.stroke();
              }
              return patternCanvas;
            };
          } else if (brushType === 'Square') {
            brush.getPatternSrc = function () {
              const size = brushPatternScale;
              // @ts-ignore
              const patternCanvas = document.createElement('canvas');
              patternCanvas.width = patternCanvas.height = size;
              const ctx = patternCanvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = this.color;
                ctx.fillRect(0, 0, size - 2, size - 2);
              }
              return patternCanvas;
            };
          } else if (brushType === 'Diamond') {
            brush.getPatternSrc = function () {
              const size = brushPatternScale;
              // @ts-ignore
              const patternCanvas = document.createElement('canvas');
              const rect = new fabric.Rect({ width: size * 0.7, height: size * 0.7, angle: 45, fill: this.color });
              const canvasWidth = rect.getBoundingRect().width;
              patternCanvas.width = patternCanvas.height = canvasWidth + 2;
              rect.set({ left: patternCanvas.width / 2, top: patternCanvas.height / 2 });

              const ctx = patternCanvas.getContext('2d');
              if (ctx) rect.render(ctx as any);
              return patternCanvas;
            };
          } else if (brushType === 'Texture' && brushTexture) {
            const img = new Image();
            img.src = brushTexture;
            brush.source = img;
          }
        }

        if (brush) {
          brush.width = brushWidth || 5;
          brush.color = brushColor || 'black';
          if (brushShadowWidth > 0) {
            brush.shadow = new fabric.Shadow({
              blur: brushShadowWidth,
              offsetX: 0,
              offsetY: 0,
              affectStroke: true,
              color: brushShadowColor
            });
          }
          canvas.freeDrawingBrush = brush;
        }
      };

      configureBrush();

      canvas.defaultCursor = 'crosshair';
      canvas.discardActiveObject();

    } else if (activeTool === 'pen') {
      canvas.defaultCursor = 'crosshair';
      canvas.selection = false;
      canvas.forEachObject(o => o.selectable = false);
      canvas.discardActiveObject();

    } else if (activeTool === 'select') {
      // Default behavior restored above
    }

    canvas.requestRenderAll();

    // UPDATE SELECTED BRUSH OBJECT
    if (canvas.getActiveObject()) {
      const activeObj = canvas.getActiveObject() as any;
      if (activeObj && activeObj.brushType) {
        // It's a brush path! Update it.
        activeObj.set('strokeWidth', brushWidth);

        if (['Pencil', 'Circle', 'Spray'].includes(brushType)) {
          activeObj.set('stroke', brushColor);
        } else if (['Pattern', 'HLine', 'VLine', 'Square', 'Diamond'].includes(brushType)) {
          // Re-generate pattern
          const patternCanvas = generatePatternCanvas(brushType, brushColor, brushPatternScale);
          const pattern = new fabric.Pattern({
            source: patternCanvas,
            repeat: 'repeat'
          });
          activeObj.set('stroke', pattern);
          activeObj.set('brushPatternScale', brushPatternScale);
          activeObj.set('brushType', brushType);
        }

        canvas.requestRenderAll();
      }
    }

  }, [activeTool, brushType, brushWidth, brushColor, brushShadowColor, brushShadowWidth, brushTexture, brushPatternScale, generatePatternCanvas]);

  // BEZIER PEN TOOL LOGIC
  useEffect(() => {
    if (!canvasRef.current || activeTool !== 'pen') return;
    const canvas = canvasRef.current;

    let points: { x: number, y: number }[] = [];
    let activePath: fabric.Path | null = null;
    let tempLine: fabric.Line | null = null;

    // Mouse Down: Add Point
    const onMouseDown = (opt: any) => {
      const evt = opt.e;
      const pointer = canvas.getPointer(evt);

      points.push({ x: pointer.x, y: pointer.y });

      if (points.length > 1) {
        renderPath();
      }
    };

    // Mouse Move: Rubber Band
    const onMouseMove = (opt: any) => {
      if (points.length === 0) return;
      const evt = opt.e;
      const pointer = canvas.getPointer(evt);

      if (!tempLine) {
        tempLine = new fabric.Line([points[points.length - 1].x, points[points.length - 1].y, pointer.x, pointer.y], {
          stroke: '#999', strokeWidth: 1, selectable: false, evented: false, strokeDashArray: [5, 5]
        });
        canvas.add(tempLine);
      } else {
        tempLine.set({ x1: points[points.length - 1].x, y1: points[points.length - 1].y, x2: pointer.x, y2: pointer.y });
        canvas.requestRenderAll();
      }
    };

    // Double Click: Finish Path
    const onDoubleClick = () => {
      finishPath(false);
    };

    // Key Down: Enter/Escape
    const onKeyDown = (e: KeyboardEvent) => {
      if (activeTool !== 'pen') return;
      if (e.key === 'Enter') finishPath(false); // Open
      if (e.key === 'Escape') cancelPath();
    };

    const renderPath = () => {
      if (activePath) canvas.remove(activePath);

      // Polyline construction
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
      }

      activePath = new fabric.Path(d, {
        stroke: 'black', strokeWidth: 2, fill: '',
        selectable: false, evented: false, objectCaching: false
      });
      canvas.add(activePath);
      canvas.requestRenderAll();
    };

    const finishPath = (closed: boolean) => {
      if (points.length < 2) return;
      if (activePath) canvas.remove(activePath);
      if (tempLine) canvas.remove(tempLine);

      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
      }
      if (closed) d += ' Z';

      const finalPath = new fabric.Path(d, {
        stroke: 'black', strokeWidth: 2, fill: 'transparent',
        selectable: true, evented: true
      });
      // @ts-ignore
      finalPath.uid = generateId();

      canvas.add(finalPath);
      canvas.setActiveObject(finalPath);
      saveHistory();

      // Reset
      points = [];
      activePath = null;
      tempLine = null;
      canvas.requestRenderAll();
    };

    const cancelPath = () => {
      if (activePath) canvas.remove(activePath);
      if (tempLine) canvas.remove(tempLine);
      points = [];
      activePath = null;
      tempLine = null;
      canvas.requestRenderAll();
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
      cancelPath();
    };
  }, [activeTool, saveHistory]);

  // PATH CREATED LISTENER (History)
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const handlePathCreated = (e: any) => {
      const path = e.path;
      if (path) {
        // Assign UID if needed or just save history
        // @ts-ignore
        path.uid = generateId();
        path.set({ selectable: true, evented: true });

        // Store Brush Metadata for future editing
        // @ts-ignore
        path.brushType = brushType;
        // @ts-ignore
        path.brushPatternScale = brushPatternScale;
        // @ts-ignore
        path.brushTexture = brushTexture;
        // @ts-ignore
        path.origStrokeWidth = brushWidth; // Just in case

        saveHistory();
        // Auto-select the drawn path?
        canvas.setActiveObject(path);
        // Reset to select tool? Or keep drawing?
        // Usually keep drawing. 
      }
    };

    canvas.on('path:created', handlePathCreated);
    return () => { canvas.off('path:created', handlePathCreated); };
  }, [saveHistory]);

  // DOUBLE CLICK TO EDIT PATH
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const handleDblClick = (e: any) => {
      const target = e.target;
      if (target && target instanceof fabric.Path && !(target as any).isHandle) {
        // Trigger Edit Mode
        console.log("Double Click on Path -> Edit Mode", target);
        setEditingPath(target);
      }
    };

    canvas.on('mouse:dblclick', handleDblClick);
    return () => { canvas.off('mouse:dblclick', handleDblClick); };
  }, []);

  // EDIT MODE LOGIC (Vertex Manipulation)
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    if (editingPath) {
      const pathObj = editingPath;

      // Spawn handles
      if (pathObj.path) {
        enterPathEditMode(pathObj, canvas);
      }

      // Exit callbacks
      const handleSelectionCleared = () => {
        // @ts-ignore
        if (pathObj._isRefreshing) return;
        setEditingPath(null);
      };

      const handleSelectionUpdated = (e: any) => {
        const selected = e.selected?.[0];
        // If selected is NOT a handle of ours
        if (selected && !selected.isPathControl) {
          setEditingPath(null);
        }
      };

      canvas.on('selection:cleared', handleSelectionCleared);
      canvas.on('selection:created', handleSelectionUpdated);
      canvas.on('selection:updated', handleSelectionUpdated);

      return () => {
        exitPathEditMode(pathObj, canvas);
        canvas.off('selection:cleared', handleSelectionCleared);
        canvas.off('selection:created', handleSelectionUpdated);
        canvas.off('selection:updated', handleSelectionUpdated);
        canvas.requestRenderAll();
      };
    }
  }, [editingPath, canvasRef.current]);



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
    const stateStr = historyRef.current[historyIndexRef.current];

    try {
      const state = JSON.parse(stateStr);
      const { pages: restoredPages, currentPageIndex: restoredIndex } = state;

      setPages(restoredPages);
      setCurrentPageIndex(restoredIndex);
      currentPageIndexRef.current = restoredIndex;

      // Load the canvas for the restored index
      const targetPage = restoredPages[restoredIndex];
      if (targetPage && targetPage.canvasObjects) {
        await canvasRef.current.loadFromJSON(targetPage.canvasObjects);
      } else {
        canvasRef.current.clear();
      }

      setupPage(canvasRef.current);
      canvasRef.current.renderAll();
      canvasRef.current.discardActiveObject();
      setSelectedObject(null);
      setLayers([...canvasRef.current.getObjects().filter(o => !(o as any).isPage)]);
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
    const stateStr = historyRef.current[historyIndexRef.current];

    try {
      const state = JSON.parse(stateStr);
      const { pages: restoredPages, currentPageIndex: restoredIndex } = state;

      setPages(restoredPages);
      setCurrentPageIndex(restoredIndex);
      currentPageIndexRef.current = restoredIndex;

      const targetPage = restoredPages[restoredIndex];
      if (targetPage && targetPage.canvasObjects) {
        await canvasRef.current.loadFromJSON(targetPage.canvasObjects);
      } else {
        canvasRef.current.clear();
      }

      setupPage(canvasRef.current);
      canvasRef.current.renderAll();
      canvasRef.current.discardActiveObject();
      setSelectedObject(null);
      setLayers([...canvasRef.current.getObjects().filter(o => !(o as any).isPage)]);
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

    // RESTORE STATE IF REMOUNTED (e.g. HMR or Tab switch)
    if (historyRef.current.length > 0 && historyIndexRef.current >= 0) {
      console.log("Restoring Canvas Content from History...");
      const state = historyRef.current[historyIndexRef.current];
      canvas.loadFromJSON(JSON.parse(state)).then(() => {
        canvas.renderAll();
        // Important: Re-setup page property on the background rect if it gets lost or just ensure it's there
        const objs = canvas.getObjects();
        // @ts-ignore
        const page = objs.find(o => o.width === PAGE_WIDTH && o.height === PAGE_HEIGHT);
        if (page) (page as any).isPage = true;

        console.log("Canvas Restored. Objects:", objs.length);
        setLayers([...objs]);
      });
    }

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

      // Special handling for Polygon Points (Star) to update dimensions
      if (property === 'points' && selectedObject.type === 'polygon') {
        const poly = selectedObject as fabric.Polygon;
        // Force dimension recalculation so selection box matches new points
        // @ts-ignore
        const dims = poly._calcDimensions();
        const center = poly.getCenterPoint();
        poly.set({
          width: dims.width,
          height: dims.height,
          pathOffset: { x: dims.left + dims.width / 2, y: dims.top + dims.height / 2 }
        });
        poly.setPositionByOrigin(center, 'center', 'center');
        poly.setCoords();
      }
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
        const starPoints = getStarPoints(5, 50, 25); // 5 points, radius 50, inner 25 (0.5 ratio)
        shape = new fabric.Polygon(starPoints, { ...defaults, left: 250, top: 250 });
        (shape as any).isStar = true;
        (shape as any).starPoints = 5;
        (shape as any).starInnerRadiusRatio = 0.5;
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

      setPages([{ id: 'initial', canvasObjects: null, thumbnail: '' }]);
      setCurrentPageIndex(0);
      currentPageIndexRef.current = 0;

      historyRef.current = [];
      historyIndexRef.current = -1;
      isInternalUpdate.current = false;
      setCurrentFilePath(null);

      saveHistory();
    }
  }, [saveHistory]);

  const handleClose = useCallback(() => {
    if (!canvasRef.current) return;
    if (confirm('Fermer le document en cours ? Tout travail non sauvegardé sera perdu.')) {
      isInternalUpdate.current = true;
      canvasRef.current.clear();
      setupPage(canvasRef.current);
      canvasRef.current.renderAll();
      setSelectedObject(null);
      setLayers([]);

      setPages([{ id: 'initial', canvasObjects: null, thumbnail: '' }]);
      setCurrentPageIndex(0);
      currentPageIndexRef.current = 0;

      historyRef.current = [];
      historyIndexRef.current = -1;
      isInternalUpdate.current = false;
      setCurrentFilePath(null);

      saveHistory();
    }
  }, [saveHistory]);

  const handleSave = useCallback(async () => {
    if (!canvasRef.current) return;

    // Sync CURRENT page before saving
    // @ts-ignore
    const currentJSON = canvasRef.current.toJSON(['uid']);
    const thumb = canvasRef.current.toDataURL({ multiplier: 0.1, quality: 0.5 });

    // Build final page list
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = {
      ...updatedPages[currentPageIndex],
      canvasObjects: currentJSON,
      thumbnail: thumb
    };

    const projectData = {
      pages: updatedPages,
      currentPageIndex: currentPageIndex,
      palette: {
        colors: paletteColors,
        gradients: paletteGradients
      }
    };

    const json = JSON.stringify(projectData);

    if (window.electronAPI) {
      const result = await window.electronAPI.saveProject(json, currentFilePath || undefined);
      if (result.success) {
        if (result.filePath) {
          setCurrentFilePath(result.filePath);
        }
        console.log('Projet sauvegardé.');
      }
    }
  }, [paletteColors, paletteGradients, currentFilePath, pages, currentPageIndex]);

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

          let restoredPages: Page[] = [];
          let restoredIndex = 0;

          // DETECTION: New Multi-page vs Legacy Single-page
          if (parsed.pages && Array.isArray(parsed.pages)) {
            restoredPages = parsed.pages;
            restoredIndex = parsed.currentPageIndex || 0;
            setPaletteColors(parsed.palette?.colors || []);
            setPaletteGradients(parsed.palette?.gradients || []);
          } else {
            // Legacy Migration
            let canvasData = parsed;
            if (parsed.canvas) {
              canvasData = parsed.canvas;
              setPaletteColors(parsed.palette?.colors || []);
              setPaletteGradients(parsed.palette?.gradients || []);
            }
            restoredPages = [{
              id: 'legacy-' + generateId(),
              canvasObjects: canvasData,
              thumbnail: ''
            }];
            restoredIndex = 0;
          }

          setPages(restoredPages);
          setCurrentPageIndex(restoredIndex);

          // Load the specific page
          const targetPage = restoredPages[restoredIndex];
          await canvasRef.current.clear();
          if (targetPage.canvasObjects) {
            await canvasRef.current.loadFromJSON(targetPage.canvasObjects);
          }

          setupPage(canvasRef.current);
          canvasRef.current.renderAll();
          setLayers([...canvasRef.current.getObjects().filter(o => !(o as any).isPage)]);

          // Init Histoy with full project
          historyRef.current = [JSON.stringify({ pages: restoredPages, currentPageIndex: restoredIndex })];
          historyIndexRef.current = 0;
          isInternalUpdate.current = false;
          updateHistoryState();

        } catch (error) {
          console.error("Erreur chargement:", error);
          alert("Erreur lors du chargement du fichier");
          isInternalUpdate.current = false;
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

  const handleCut = useCallback(async () => {
    if (!canvasRef.current) return;
    const activeObj = canvasRef.current.getActiveObject();
    if (!activeObj) return;

    // Copy first
    await handleCopy();
    // Then delete
    handleDelete();
  }, [handleCopy, handleDelete]);

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

  const handleSelectAll = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    // Get all non-page objects
    const objects = canvas.getObjects().filter(obj => !(obj as any).isPage && !(obj as any).isHandle);

    if (objects.length > 0) {
      const selection = new fabric.ActiveSelection(objects, {
        canvas: canvas
      });
      canvas.setActiveObject(selection);
      canvas.requestRenderAll();
      setSelectedObject(selection);
    }
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

  // Handle Selection Change (Update UI from Object)
  const handleSelectionChange = useCallback((obj: fabric.Object | null) => {
    if (obj) {
      setSelectedObject(obj);

      // Sync Brush State from Object
      const brushObj = obj as any;
      if (brushObj.brushType) {
        setBrushType(brushObj.brushType);
        if (brushObj.strokeWidth) setBrushWidth(brushObj.strokeWidth);
        if (brushObj.brushPatternScale) setBrushPatternScale(brushObj.brushPatternScale);
        if (brushObj.brushTexture) setBrushTexture(brushObj.brushTexture);
        if (typeof brushObj.stroke === 'string') {
          setBrushColor(brushObj.stroke);
        }
      }
    } else {
      setSelectedObject(null);
    }
  }, []);

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
    const naturalWidth = element?.naturalWidth || element?.width || 0;
    const naturalHeight = element?.naturalHeight || element?.height || 0;

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
    if (!canvasRef.current || pages.length === 0) return;

    // Temporarily deselect
    const activeObj = canvasRef.current.getActiveObject();
    canvasRef.current.discardActiveObject();
    canvasRef.current.renderAll();

    // Sync CURRENT page state first
    // @ts-ignore
    const currentJSON = canvasRef.current.toJSON(['uid']);
    const currentPages = [...pages];
    currentPages[currentPageIndex] = {
      ...currentPages[currentPageIndex],
      canvasObjects: currentJSON
    };

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    isInternalUpdate.current = true;
    const originalBg = canvasRef.current.backgroundColor;

    for (let i = 0; i < currentPages.length; i++) {
      if (i > 0) pdf.addPage();

      const pageState = currentPages[i];
      await canvasRef.current.clear();
      if (pageState.canvasObjects) {
        await canvasRef.current.loadFromJSON(pageState.canvasObjects);
      }

      // Prepare for PDF export
      // @ts-ignore
      const pageObj = canvasRef.current.getObjects().find(o => o.isPage) as fabric.Rect;
      if (pageObj) pageObj.excludeFromExport = false;
      canvasRef.current.backgroundColor = '';

      const svgString = canvasRef.current.toSVG({
        suppressPreamble: true,
        width: String(PAGE_WIDTH),
        height: String(PAGE_HEIGHT),
        viewBox: { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT }
      });

      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, "image/svg+xml");
      await pdf.svg(doc.documentElement, { x: 0, y: 0, width: pdfWidth, height: pdfHeight });
    }

    // Restore original current page
    const targetPage = currentPages[currentPageIndex];
    await canvasRef.current.clear();
    if (targetPage.canvasObjects) {
      await canvasRef.current.loadFromJSON(targetPage.canvasObjects);
    }
    setupPage(canvasRef.current);
    canvasRef.current.backgroundColor = originalBg;

    if (activeObj) {
      canvasRef.current.setActiveObject(activeObj);
    }
    canvasRef.current.renderAll();
    isInternalUpdate.current = false;

    const pdfOutput = pdf.output('arraybuffer');
    if (window.electronAPI) {
      await window.electronAPI.saveFile(pdfOutput, 'design_multipage.pdf');
    }
  }, [pages, currentPageIndex]);

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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';

      const activeObj = canvasRef.current?.getActiveObject();
      // @ts-ignore
      const isEditingText = activeObj && (activeObj.type === 'i-text' || activeObj.type === 'text' || activeObj.type === 'textbox') && activeObj.isEditing;

      if (isInput || isEditingText) {
        // Don't trigger global shortcuts when editing text
        // Exception: Tab (handled specifically)
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
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDelete();
      }

      // Clipboard
      if (cmdKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
      }
      if (cmdKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleCut();
      }
      if (cmdKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
      }

      // History
      if (cmdKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if (cmdKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }

      // File
      if (cmdKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      if (cmdKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleLoad();
      }
      if (cmdKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNew();
      }

      // Selection & Grouping
      if (cmdKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll();
      }
      if (cmdKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          handleUngroup();
        } else {
          handleGroup();
        }
      }

      // Zoom
      if (cmdKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      }
      if (cmdKey && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }
      if (cmdKey && e.key === '0') {
        e.preventDefault();
        handleFit();
      }

      // Tool Switching (when not editing)
      if (!cmdKey) {
        if (e.key.toLowerCase() === 'v') setActiveTool('select');
        if (e.key.toLowerCase() === 'h') setActiveTool('hand');
        if (e.key.toLowerCase() === 'p') setActiveTool('pen');
        if (e.key.toLowerCase() === 'b') setActiveTool('brush');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleDelete, handleCopy, handleCut, handlePaste, undo, redo,
    handleSave, handleLoad, handleNew, handleSelectAll, handleGroup, handleUngroup,
    handleZoomIn, handleZoomOut, handleFit, saveHistory
  ]);

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
    setLayers([...canvasRef.current.getObjects().filter(o => !(o as any).isPage)]);
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
    setLayers([...canvasRef.current.getObjects().filter(o => !(o as any).isPage)]);
  };

  const handleLayerReorder = (sourceIndex: number, destinationIndex: number) => {
    if (!canvasRef.current) return;
    const allObjects = canvasRef.current.getObjects();
    const filteredObjects = allObjects.filter(o => !(o as any).isPage);
    const obj = filteredObjects[sourceIndex];
    if (!obj) return;

    // Calculate offset based on hidden page object at bottom
    const pageCount = allObjects.filter(o => (o as any).isPage).length;
    const realDestIndex = destinationIndex + pageCount;

    canvasRef.current.moveObjectTo(obj, realDestIndex);

    canvasRef.current.renderAll();
    setLayers([...canvasRef.current.getObjects().filter(o => !(o as any).isPage)]);
    saveHistory();
  };

  // GLOBAL CONTEXT MENU HANDLER (Fabric Event Based)
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const onMouseDown = (opt: any) => {
      // Button 3 = Right Click
      console.log("Global Mouse Down:", opt.button, opt.e.button);
      if (opt.button === 3 || (opt.e && opt.e.button === 2)) {
        opt.e.preventDefault(); // Prevent browser menu

        // Explicitly select the target if one exists, ensuring context menu has valid context
        if (opt.target) {
          console.log("Right Click Target:", opt.target.type);
          canvas.setActiveObject(opt.target);
          canvas.requestRenderAll();
        }

        // Because we set active object on mousedown in the handle itself (polyControlUtils),
        // or via standard selection, getActiveObject() should be correct now.
        // Refresh selection after manual set
        const selection = canvas.getActiveObject();

        const actions = [];

        console.log("Selection:", selection ? selection.type : "none", "Target:", opt.target ? opt.target.type : "null");

        // Reuse the action generation logic
        if (selection) {
          // Determine available actions based on selection
          actions.push({ label: 'Copier', icon: <Copy size={16} />, action: handleCopy });
          actions.push({ label: 'Supprimer', icon: <Trash2 size={16} />, danger: true, action: handleDelete });

          // Z-Index
          actions.push({ label: 'Premier Plan', icon: <BringToFront size={16} />, action: () => handleAction('bringToFront') });
          actions.push({ label: 'Arrière Plan', icon: <SendToBack size={16} />, action: () => handleAction('sendToBack') });

          // Path Handle Logic
          if ((selection as any).isPathControl) {
            const handle = selection as PathControlHandle;
            if (handle.pathObj && handle.cmdIndex !== undefined) {
              actions.push({
                label: 'Convertir Ligne/Courbe',
                icon: <PenTool size={16} />,
                action: () => {
                  if (handle.pathObj && handle.cmdIndex !== undefined && canvasRef.current) {
                    togglePathPointType(handle.pathObj, handle.cmdIndex, canvasRef.current);
                    saveHistory();
                  }
                }
              });
            }
          }

          // Grouping
          if (selection.type === 'activeSelection') {
            actions.push({ label: 'Grouper', icon: <Group size={16} />, action: handleGroup });
          }
          if (selection.type === 'group') {
            actions.push({ label: 'Dégrouper', icon: <Ungroup size={16} />, action: handleUngroup });
          }
        } else {
          actions.push({ label: 'Coller', icon: <StickyNote size={16} />, disabled: !canPaste, action: handlePaste });
        }
        console.log("Selection:", selection ? selection.type : "none", "Actions:", actions.length);

        if (actions.length > 0) {
          // Adjust for canvas position in page
          // Use client coordinates directly for fixed positioning
          const x = opt.e.clientX;
          const y = opt.e.clientY;
          console.log("Showing Context Menu at:", x, y);
          setContextMenu({
            visible: true,
            x: x,
            y: y,
            actions: actions
          });
        } else {
          console.log("No actions available for this context");
        }
      } else {
        // Hide on left click
        if (contextMenu.visible) {
          setContextMenu(prev => ({ ...prev, visible: false }));
        }
      }
    };

    canvas.on('mouse:down', onMouseDown);
    return () => {
      canvas.off('mouse:down', onMouseDown);
    };
  }, [contextMenu.visible, handleCopy, handleDelete, handleGroup, handleUngroup, handlePaste, canPaste, saveHistory]);

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
          <span style={{ fontWeight: 600, fontSize: '14px', marginRight: '16px' }}>Simple Publisher</span>

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
            <button onClick={handleClose} title="Fermer le document" style={{ padding: '4px', marginLeft: '4px', color: '#ff4d4f' }}>
              <X size={18} />
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
            onClick={() => setActiveTool('pencil')}
            title="Stylo (Dessin libre)"
            style={{
              padding: '8px',
              borderRadius: '4px',
              background: activeTool === 'pencil' ? 'var(--accent-color)' : 'transparent',
              color: activeTool === 'pencil' ? '#fff' : 'inherit'
            }}>
            <Pencil size={20} />
          </button>

          <button
            onClick={() => setActiveTool('brush')}
            title="Pinceau (Avancé)"
            style={{
              padding: '8px',
              borderRadius: '4px',
              background: activeTool === 'brush' ? 'var(--accent-color)' : 'transparent',
              color: activeTool === 'brush' ? '#fff' : 'inherit'
            }}>
            <Paintbrush size={20} />
          </button>

          <button
            onClick={() => setActiveTool('pen')}
            title="Plume (Bézier)"
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

            {/* Bottom Page Strip */}
            <div className="bottom-page-strip">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  className={`page-thumbnail ${index === currentPageIndex ? 'active' : ''}`}
                  onClick={() => switchPage(index)}
                >
                  <div className="thumbnail-preview">
                    {page.thumbnail ? <img src={page.thumbnail} alt={`Page ${index + 1}`} /> : <div className="empty-thumb" />}
                  </div>
                  <div className="page-label">PAGE {index + 1}</div>
                  {pages.length > 1 && (
                    <button
                      className="delete-page-btn"
                      title="Supprimer la page"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(index);
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button className="add-page-btn" onClick={addPage} title="Ajouter une page">
                <FilePlus size={24} />
                <span>AJOUTER</span>
              </button>
            </div>

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
              // Drawing Props
              activeTool={activeTool}
              drawingSettings={{
                brushType, setBrushType,
                brushWidth, setBrushWidth,
                brushColor, setBrushColor,
                brushShadowColor, setBrushShadowColor,
                brushShadowWidth, setBrushShadowWidth,
                brushTexture, setBrushTexture,
                brushPatternScale, setBrushPatternScale
              }}
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

      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          options={contextMenu.actions}
          onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
        />
      )}
    </div >
  );
}

export default App
