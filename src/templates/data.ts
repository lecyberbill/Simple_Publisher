
export interface Template {
    id: string;
    name: string;
    width: number;
    height: number;
    description: string;
    category: 'print' | 'card' | 'web';
    orientation?: 'portrait' | 'landscape' | 'square';
    iconType?: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'generic';
}

const PX_PER_MM = 3.779527559;

export const TEMPLATES: Template[] = [
    // --- IMPRESSION (PRINT) ---
    {
        id: 'a4_portrait',
        name: 'A4 Portrait',
        width: Math.round(210 * PX_PER_MM),
        height: Math.round(297 * PX_PER_MM),
        description: 'Format standard A4 (210 x 297 mm)',
        category: 'print',
        orientation: 'portrait'
    },
    {
        id: 'a4_landscape',
        name: 'A4 Paysage',
        width: Math.round(297 * PX_PER_MM),
        height: Math.round(210 * PX_PER_MM),
        description: 'Format standard A4 (297 x 210 mm)',
        category: 'print',
        orientation: 'landscape'
    },
    {
        id: 'a5_portrait',
        name: 'A5 Portrait',
        width: Math.round(148 * PX_PER_MM),
        height: Math.round(210 * PX_PER_MM),
        description: 'Demi A4 (148 x 210 mm)',
        category: 'print',
        orientation: 'portrait'
    },
    {
        id: 'a5_landscape',
        name: 'A5 Paysage',
        width: Math.round(210 * PX_PER_MM),
        height: Math.round(148 * PX_PER_MM),
        description: 'Demi A4 (210 x 148 mm)',
        category: 'print',
        orientation: 'landscape'
    },

    // --- CARTES DE VISITE ---
    {
        id: 'business_card_landscape',
        name: 'Carte (Paysage)',
        width: Math.round(85 * PX_PER_MM), // Standard EU 85x55
        height: Math.round(55 * PX_PER_MM),
        description: 'Standard 85 x 55 mm',
        category: 'card',
        orientation: 'landscape'
    },
    {
        id: 'business_card_portrait',
        name: 'Carte (Portrait)',
        width: Math.round(55 * PX_PER_MM),
        height: Math.round(85 * PX_PER_MM),
        description: 'Standard 55 x 85 mm',
        category: 'card',
        orientation: 'portrait'
    },

    // --- WEB / SOCIAL ---
    {
        id: 'twitter_header',
        name: 'Twitter Header',
        width: 1500,
        height: 500,
        description: 'Bannière Twitter (1500 x 500 px)',
        category: 'web',
        iconType: 'twitter'
    },
    {
        id: 'facebook_cover',
        name: 'Facebook Cover',
        width: 820,
        height: 312,
        description: 'Couverture Facebook (820 x 312 px)',
        category: 'web',
        iconType: 'facebook'
    },
    {
        id: 'instagram_post',
        name: 'Instagram Post',
        width: 1080,
        height: 1080,
        description: 'Post Carré (1080 x 1080 px)',
        category: 'web',
        orientation: 'square',
        iconType: 'instagram'
    },
    {
        id: 'linkedin_banner',
        name: 'LinkedIn Banner',
        width: 1584,
        height: 396,
        description: 'Bannière LinkedIn (1584 x 396 px)',
        category: 'web',
        iconType: 'linkedin'
    }
];
