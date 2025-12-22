import React from 'react';
import { TEMPLATES, type Template } from '../templates/data';
import {
    X,
    Printer, Globe,
    Facebook, Instagram, Linkedin, Twitter, CreditCard
} from 'lucide-react';

interface TemplateModalProps {
    onSelect: (template: Template) => void;
    onClose: () => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({ onSelect, onClose }) => {

    // Group templates by category
    const printTemplates = TEMPLATES.filter(t => t.category === 'print');
    const cardTemplates = TEMPLATES.filter(t => t.category === 'card');
    const webTemplates = TEMPLATES.filter(t => t.category === 'web');

    // Helper to get orientation toggle/specific variants
    // For specific structure like "A4 Portrait / Landscape", we might want to manually group them by Name base?
    // "A4 Portrait", "A4 Landscape".
    // Or just list them as buttons. The user sketch shows "A4 [Portrait] [Paysage]".
    // This implies grouping by "Base format" and offering orientation buttons.

    const renderGroup = (title: string, icon: React.ReactNode, templateList: Template[]) => {
        // Group by base name (e.g. "A4") if possible
        // Simple heuristic: generic name (A4, A5, Carte)

        // Manual grouping map for Print/Card
        const groups: { [key: string]: Template[] } = {};

        templateList.forEach(t => {
            let baseName = t.name.replace('Portrait', '').replace('Paysage', '').replace('(', '').replace(')', '').trim();
            // Handle "Carte (Portrait)" -> "Carte"

            if (!groups[baseName]) groups[baseName] = [];
            groups[baseName].push(t);
        });

        return (
            <div style={{ marginBottom: '20px' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    marginBottom: '10px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
                    borderBottom: '1px solid var(--border-color)', paddingBottom: '4px'
                }}>
                    {icon}
                    <span>{title}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(groups).map(([baseName, variants]) => (
                        <div key={baseName} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'var(--bg-panel)', padding: '8px 12px', borderRadius: '6px',
                            border: '1px solid var(--border-color)'
                        }}>
                            <span style={{ fontWeight: 500, fontSize: '13px' }}>{baseName}</span>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                {variants.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => onSelect(t)}
                                        title={t.description}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'var(--accent-color)', // Blueish
                                            color: '#fff',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                            display: 'flex', alignItems: 'center', gap: '4px'
                                        }}
                                    >
                                        {/* Orientation Indicator? */}
                                        {t.orientation === 'portrait' && <div style={{ width: 6, height: 8, border: '1px solid currentColor' }}></div>}
                                        {t.orientation === 'landscape' && <div style={{ width: 8, height: 6, border: '1px solid currentColor' }}></div>}

                                        {t.orientation === 'portrait' ? 'Portrait' :
                                            t.orientation === 'landscape' ? 'Paysage' : 'Standard'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderWebList = () => {
        return (
            <div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    marginBottom: '10px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
                    borderBottom: '1px solid var(--border-color)', paddingBottom: '4px'
                }}>
                    <Globe size={18} />
                    <span>Web / Réseaux Sociaux</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {webTemplates.map(t => {
                        let Icon = Globe;
                        if (t.iconType === 'twitter') Icon = Twitter;
                        if (t.iconType === 'facebook') Icon = Facebook;
                        if (t.iconType === 'instagram') Icon = Instagram;
                        if (t.iconType === 'linkedin') Icon = Linkedin;

                        return (
                            <button
                                key={t.id}
                                onClick={() => onSelect(t)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '10px',
                                    background: 'var(--bg-panel)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                            >
                                <div style={{
                                    width: '24px', height: '24px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'var(--bg-app)', borderRadius: '4px'
                                }}>
                                    <Icon size={16} color="var(--accent-color)" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{t.name}</span>
                                    <span style={{ fontSize: '10px', opacity: 0.6 }}>{t.width} x {t.height} px</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            backdropFilter: 'blur(2px)'
        }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div style={{
                width: '600px',
                maxWidth: '95vw',
                maxHeight: '90vh',
                background: 'var(--bg-app)',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border-color)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--bg-header)'
                }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Nouveau Projet</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    {renderGroup('Impression', <Printer size={18} />, printTemplates)}
                    {renderGroup('Cartes de visite', <CreditCard size={18} />, cardTemplates)}
                    {renderWebList()}
                </div>

                {/* Footer (Optional usage note) */}
                <div style={{
                    padding: '12px 20px',
                    background: 'var(--bg-panel)',
                    borderTop: '1px solid var(--border-color)',
                    fontSize: '11px', color: 'var(--text-muted)',
                    textAlign: 'center'
                }}>
                    Choisissez un modèle pour commencer. Les dimensions peuvent être ajustées plus tard.
                </div>
            </div>
        </div>
    );
};
