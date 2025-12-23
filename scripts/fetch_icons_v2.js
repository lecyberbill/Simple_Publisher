
const https = require('https');
const fs = require('fs');

const URL = 'https://raw.githubusercontent.com/iconic/open-iconic/master/sprite/open-iconic.svg';

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

// Map keywords to categories
const CATEGORY_MAP = [
    { key: 'account', cat: 'Interface' },
    { key: 'login', cat: 'Interface' },
    { key: 'logout', cat: 'Interface' },
    { key: 'lock', cat: 'Sécurité' },
    { key: 'key', cat: 'Sécurité' },
    { key: 'shield', cat: 'Sécurité' },
    { key: 'wifi', cat: 'Réseau' },
    { key: 'signal', cat: 'Réseau' },
    { key: 'bluetooth', cat: 'Réseau' },
    { key: 'battery', cat: 'Appareils' },
    { key: 'phone', cat: 'Appareils' },
    { key: 'monitor', cat: 'Appareils' },
    { key: 'tablet', cat: 'Appareils' },
    { key: 'laptop', cat: 'Appareils' },
    { key: 'arrow', cat: 'Flèches' },
    { key: 'chevron', cat: 'Flèches' },
    { key: 'caret', cat: 'Flèches' },
    { key: 'media', cat: 'Média' },
    { key: 'music', cat: 'Média' },
    { key: 'play', cat: 'Média' },
    { key: 'pause', cat: 'Média' },
    { key: 'video', cat: 'Média' },
    { key: 'camera', cat: 'Média' },
    { key: 'audio', cat: 'Média' },
    { key: 'volume', cat: 'Média' },
    { key: 'image', cat: 'Média' },
    { key: 'browser', cat: 'Interface' },
    { key: 'file', cat: 'Fichiers' },
    { key: 'folder', cat: 'Fichiers' },
    { key: 'document', cat: 'Fichiers' },
    { key: 'clipboard', cat: 'Édition' },
    { key: 'pencil', cat: 'Édition' },
    { key: 'brush', cat: 'Édition' },
    { key: 'crop', cat: 'Édition' },
    { key: 'copy', cat: 'Édition' },
    { key: 'cut', cat: 'Édition' },
    { key: 'paste', cat: 'Édition' },
    { key: 'edit', cat: 'Édition' },
    { key: 'text', cat: 'Édition' },
    { key: 'bold', cat: 'Édition' },
    { key: 'italic', cat: 'Édition' },
    { key: 'underline', cat: 'Édition' },
    { key: 'align', cat: 'Édition' },
    { key: 'justify', cat: 'Édition' },
    { key: 'list', cat: 'Édition' },
    { key: 'box', cat: 'Interface' },
    { key: 'home', cat: 'Interface' },
    { key: 'menu', cat: 'Interface' },
    { key: 'cog', cat: 'Interface' },
    { key: 'wrench', cat: 'Interface' },
    { key: 'trash', cat: 'Interface' },
    { key: 'eye', cat: 'Interface' },
    { key: 'contrast', cat: 'Interface' },
    { key: 'magnifying', cat: 'Interface' },
    { key: 'zoom', cat: 'Interface' },
    { key: 'chat', cat: 'Communication' },
    { key: 'comment', cat: 'Communication' },
    { key: 'envelope', cat: 'Communication' },
    { key: 'map', cat: 'Localisation' },
    { key: 'location', cat: 'Localisation' },
    { key: 'pin', cat: 'Localisation' },
    { key: 'compass', cat: 'Localisation' },
    { key: 'people', cat: 'Social' },
    { key: 'person', cat: 'Social' },
    { key: 'thumb', cat: 'Social' },
    { key: 'heart', cat: 'Symboles' },
    { key: 'star', cat: 'Symboles' },
    { key: 'flag', cat: 'Symboles' },
    { key: 'check', cat: 'Symboles' },
    { key: 'x', cat: 'Symboles' },
    { key: 'plus', cat: 'Symboles' },
    { key: 'minus', cat: 'Symboles' },
    { key: 'ban', cat: 'Symboles' },
    { key: 'warning', cat: 'Symboles' },
    { key: 'info', cat: 'Symboles' },
    { key: 'question', cat: 'Symboles' },
    { key: 'undo', cat: 'Édition' },
    { key: 'redo', cat: 'Édition' },
    { key: 'chart', cat: 'Commerce' },
    { key: 'graph', cat: 'Commerce' },
    { key: 'bell', cat: 'Interface' },
    { key: 'book', cat: 'Média' },
    { key: 'badge', cat: 'Symboles' },
    { key: 'beaker', cat: 'Symboles' },
    { key: 'basket', cat: 'Commerce' },
    { key: 'calendar', cat: 'Interface' },
    { key: 'clock', cat: 'Interface' },
    { key: 'timer', cat: 'Interface' },
    { key: 'code', cat: 'Interface' },
    { key: 'command', cat: 'Interface' },
    { key: 'dashboard', cat: 'Interface' },
    { key: 'data', cat: 'Interface' },
    { key: 'link', cat: 'Interface' },
    { key: 'external', cat: 'Interface' },
    { key: 'fork', cat: 'Interface' },
    { key: 'grid', cat: 'Interface' },
    { key: 'header', cat: 'Interface' },
    { key: 'headphones', cat: 'Média' },
    { key: 'target', cat: 'Jeux' },
    { key: 'loop', cat: 'Média' },
    { key: 'reload', cat: 'Interface' },
    { key: 'refresh', cat: 'Interface' },
    { key: 'power', cat: 'Interface' },
    { key: 'transfer', cat: 'Interface' },
    { key: 'cloud', cat: 'Météo' },
    { key: 'rain', cat: 'Météo' },
    { key: 'sun', cat: 'Météo' },
    { key: 'moon', cat: 'Météo' },
    { key: 'bolt', cat: 'Météo' },
    { key: 'puzzle', cat: 'Jeux' },
    { key: 'game', cat: 'Jeux' },
    { key: 'cart', cat: 'Commerce' },
    { key: 'dollar', cat: 'Commerce' },
    { key: 'euro', cat: 'Commerce' },
    { key: 'credit', cat: 'Commerce' }
];

async function run() {
    try {
        console.log("Fetching...");
        const svgContent = await fetchUrl(URL);
        console.log(`Fetched ${svgContent.length} bytes.`);

        const shapes = [];

        // 1. Match <symbol> tags
        const symbolRegex = /<symbol[^>]*id="([^"]+)"[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*?)<\/symbol>/g;
        let match;
        while ((match = symbolRegex.exec(svgContent)) !== null) {
            const id = match[1];
            const viewBox = match[2];
            const content = match[3];
            const pathRes = /d="([^"]+)"/.exec(content);
            if (pathRes) {
                shapes.push({ id, viewBox, path: pathRes[1] });
            }
        }

        // 2. Match <path> tags with id
        const pathRegex = /<path([^>]+)>/g;
        while ((match = pathRegex.exec(svgContent)) !== null) {
            const attrs = match[1];
            const idMatch = /id="([^"]+)"/.exec(attrs);
            const dMatch = /d="([^"]+)"/.exec(attrs);

            if (idMatch && dMatch) {
                const id = idMatch[1];
                const d = dMatch[1];

                if (!shapes.find(s => s.id === id)) {
                    shapes.push({ id, viewBox: '0 0 8 8', path: d });
                }
            }
        }

        console.log(`Found ${shapes.length} raw shapes.`);

        // Process
        const libraryShapes = shapes.map(s => {
            let cat = 'Autres (OI)';
            for (const map of CATEGORY_MAP) {
                if (s.id.includes(map.key)) {
                    cat = map.cat;
                    break;
                }
            }

            return {
                id: `oi_${s.id}`,
                name: s.id,
                category: cat,
                path: s.path,
                viewBox: s.viewBox,
                fill: '#555555'
            };
        });

        const fileContent = "export const OPEN_ICONIC_SHAPES = " + JSON.stringify(libraryShapes, null, 4) + ";";
        fs.writeFileSync('d:/image_to_text/Simple_PAO/src/assets/oi_shapes.ts', fileContent, 'utf8');
        console.log("Written to src/assets/oi_shapes.ts");

    } catch (e) {
        console.error(e);
    }
}

run();
