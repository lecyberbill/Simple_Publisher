
import * as fabric from 'fabric';
import { Eye, EyeOff, Lock, Unlock, Image as ImageIcon, Type, Square, MousePointer2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';

interface LayersPanelProps {
    objects: fabric.Object[];
    selectedObject: fabric.Object | null;
    onSelect: (obj: fabric.Object) => void;
    onToggleVisibility: (obj: fabric.Object) => void;
    onToggleLock: (obj: fabric.Object) => void;
    onReorder: (startIndex: number, endIndex: number) => void;
}

export const LayersPanel = ({ objects, selectedObject, onSelect, onToggleVisibility, onToggleLock, onReorder }: LayersPanelProps) => {

    const getIcon = (type: string) => {
        switch (type) {
            case 'i-text':
            case 'text':
                return <Type size={14} />;
            case 'image':
                return <ImageIcon size={14} />;
            case 'rect':
                return <Square size={14} />;
            default:
                return <MousePointer2 size={14} />;
        }
    };

    const getName = (obj: fabric.Object, index: number) => {
        if (obj.type === 'i-text' || obj.type === 'text') {
            return (obj as any).text?.substring(0, 15) || `Text ${index}`;
        }
        return `${obj.type} ${index}`;
    };

    // Fabric objects are stored bottom-up (0 is back), but layers are usually displayed top-down (0 is top).
    // So we reverse the array for display.
    // We must map it to keep track of original indices or IDs.
    const reversedLayers = [...objects].map((obj, index) => ({ obj, index })).reverse();

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        // We need to translate the reversed indices back to original indices
        // Dragging from index 0 (top of UI) corresponds to objects.length - 1 (top of stack)
        const sourceIndex = objects.length - 1 - result.source.index;
        const destinationIndex = objects.length - 1 - result.destination.index;

        if (sourceIndex === destinationIndex) return;

        onReorder(sourceIndex, destinationIndex);
    };

    if (objects.length === 0) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                No layers
            </div>
        );
    }

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="layers-list">
                {(provided) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        style={{ minHeight: '100%' }}
                    >
                        {reversedLayers.map(({ obj, index }, i) => {
                            const isSelected = obj === selectedObject;
                            // Use index as key if object doesn't have ID (Fabric objects usually don't by default)
                            // We use a combined key to force re-render if index changes
                            const uniqueId = (obj as any).id || `layer-${index}-${obj.type}`;

                            return (
                                <Draggable key={uniqueId} draggableId={uniqueId} index={i}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            onClick={() => onSelect(obj)}
                                            style={{
                                                ...provided.draggableProps.style,
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '8px 12px',
                                                background: isSelected ? 'var(--accent-color)' : (snapshot.isDragging ? '#444' : 'transparent'),
                                                borderBottom: '1px solid var(--border-color)',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                color: isSelected ? '#fff' : 'var(--text-primary)'
                                            }}
                                        >
                                            <div {...provided.dragHandleProps} style={{ marginRight: '8px', cursor: 'grab', opacity: 0.5 }}>
                                                <GripVertical size={14} />
                                            </div>

                                            <div style={{ marginRight: '8px', opacity: 0.7 }}>
                                                {getIcon(obj.type)}
                                            </div>

                                            <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {getName(obj, index)}
                                            </div>

                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onToggleVisibility(obj); }}
                                                    style={{ padding: '4px', opacity: obj.visible ? 0.7 : 0.3, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                                                >
                                                    {obj.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onToggleLock(obj); }}
                                                    style={{ padding: '4px', opacity: obj.lockMovementX ? 0.7 : 0.3, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                                                >
                                                    {obj.lockMovementX ? <Lock size={14} /> : <Unlock size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </Draggable>
                            );
                        })}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
};
