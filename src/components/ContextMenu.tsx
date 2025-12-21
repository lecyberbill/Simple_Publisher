import React, { useEffect, useRef } from 'react';
import { BringToFront, SendToBack, Group, Ungroup, Trash2, Copy, StickyNote } from 'lucide-react';

interface ContextMenuProps {
    x: number;
    y: number;
    options: {
        label: string;
        icon?: React.ReactNode;
        action: () => void;
        disabled?: boolean;
        danger?: boolean;
    }[];
    onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, options, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    console.log("ContextMenu: RENDER", { x, y, optionsLength: options.length });

    useEffect(() => {
        console.log("ContextMenu: MOUNTED");
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                console.log("ContextMenu: Click Outside Detected -> Closing");
                onClose();
            }
        };

        // Delay attaching listener to avoid catching the current right-click event
        // which would immediately close the menu.
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                top: y,
                left: x,
                background: '#252526',
                border: '1px solid #3e3e42',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                zIndex: 9999,
                padding: '4px 0',
                minWidth: '180px',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {options.map((opt, index) => (
                <button
                    key={index}
                    onClick={() => {
                        opt.action();
                        onClose();
                    }}
                    disabled={opt.disabled}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: 'transparent',
                        border: 'none',
                        color: opt.danger ? '#ef4444' : (opt.disabled ? '#555' : '#e0e0e0'),
                        cursor: opt.disabled ? 'default' : 'pointer',
                        textAlign: 'left',
                        fontSize: '13px',
                        width: '100%'
                    }}
                    onMouseEnter={(e) => {
                        if (!opt.disabled) e.currentTarget.style.backgroundColor = '#3e3e42';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    {opt.icon && <span style={{ opacity: opt.disabled ? 0.3 : 1 }}>{opt.icon}</span>}
                    {opt.label}
                </button>
            ))}
        </div>
    );
};
