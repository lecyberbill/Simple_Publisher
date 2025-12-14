import { useState, useRef, useEffect } from 'react';

interface FontPickerProps {
    currentFont: string;
    fonts: string[];
    onFontChange: (font: string) => void;
}

export const FontPicker = ({ currentFont, fonts, onFontChange }: FontPickerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            {/* Selected Value Display */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    background: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontFamily: currentFont,
                    color: 'black' // Ensure text is visible
                }}
            >
                <span>{currentFont}</span>
                <span style={{ fontSize: '0.8em', color: '#999' }}>▼</span>
            </div>

            {/* Dropdown List */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: 'white',
                    border: '1px solid #ccc',
                    borderTop: 'none',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    {fonts.map(font => (
                        <div
                            key={font}
                            onClick={() => {
                                onFontChange(font);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '8px',
                                cursor: 'pointer',
                                fontFamily: font,
                                fontSize: '16px',
                                borderBottom: '1px solid #eee',
                                color: 'black' // Ensure text is visible
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            title={`Preview of ${font}`}
                        >
                            {font}
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
};
