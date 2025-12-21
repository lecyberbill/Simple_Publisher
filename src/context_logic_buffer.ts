// GLOBAL CONTEXT MENU HANDLER (Fabric Event Based)
useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const onMouseDown = (opt: any) => {
        // Button 3 = Right Click
        if (opt.button === 3 || opt.e.button === 2) {
            opt.e.preventDefault(); // Prevent browser menu

            // Get exact pointer coordinates for menu position
            const pointer = canvas.getPointer(opt.e);

            // Because we set active object on mousedown in the handle itself (polyControlUtils),
            // or via standard selection, getActiveObject() should be correct now.
            const selection = canvas.getActiveObject();

            const actions = [];

            // Reuse the action generation logic
            if (selection) {
                actions.push({ label: 'Copier', icon: <Copy size={ 16} />, action: handleCopy });
actions.push({ label: 'Supprimer', icon: <Trash2 size={ 16} />, danger: true, action: handleDelete });

// Z-Index
actions.push({ label: 'Premier Plan', icon: <BringToFront size={ 16} />, action: () => handleAction('bringToFront') });
actions.push({ label: 'Arrière Plan', icon: <SendToBack size={ 16} />, action: () => handleAction('sendToBack') });

// Path Handle Logic
if ((selection as any).isPathControl) {
    const handle = selection as PathControlHandle;
    actions.push({
        label: 'Convertir Ligne/Courbe',
        icon: <PenTool size={ 16} />,
        action: () => {
            if (handle.pathObj && handle.cmdIndex !== undefined) {
                togglePathPointType(handle.pathObj, handle.cmdIndex, canvas);
                saveHistory();
            }
        }
                    });
                }

// Grouping
if (selection.type === 'activeSelection') {
    actions.push({ label: 'Grouper', icon: <Group size={ 16} />, action: handleGroup });
                }
if (selection.type === 'group') {
    actions.push({ label: 'Dégrouper', icon: <Ungroup size={ 16} />, action: handleUngroup });
                }
             } else {
    actions.push({ label: 'Coller', icon: <StickyNote size={ 16} />, disabled: !canPaste, action: handlePaste });
             }

if (actions.length > 0) {
    // Adjust for canvas position in page
    const canvasRect = canvas.getElement().getBoundingClientRect();
    setContextMenu({
        visible: true,
        x: canvasRect.left + pointer.x, // Absolute page coordinates
        y: canvasRect.top + pointer.y,
        actions: actions
    });
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
