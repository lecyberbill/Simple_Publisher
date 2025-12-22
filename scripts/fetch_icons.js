
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

// Mock fetch if not available (node < 18) or use https
const https = require('https');

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

const CATEGORIES = {
    'arrow': 'Flèches',
    'chevron': 'Flèches',
    'caret': 'Flèches',
    'media': 'Média',
    'music': 'Média',
    'video': 'Média',
    'play': 'Média',
    'pause': 'Média',
    'camera': 'Média',
    'image': 'Média',
    'audio': 'Média',
    'folder': 'Interface',
    'file': 'Interface',
    'browser': 'Interface',
    'box': 'Interface',
    'chat': 'Communication',
    'comment': 'Communication',
    'envelope': 'Communication',
    'phone': 'Communication',
    'map': 'Localisation',
    'location': 'Localisation',
    'pin': 'Localisation',
    'compass': 'Localisation',
    'person': 'Social',
    'people': 'Social',
    'thumb': 'Social',
    'heart': 'Symboles',
    'star': 'Symboles',
    'cloud': 'Météo',
    'sun': 'Météo',
    'moon': 'Météo',
    'rain': 'Météo',
    'bolt': 'Météo',
    'puzzle': 'Jeux',
    'game': 'Jeux'
};

async function run() {
    try {
        console.log("Fetching...");
        const svgContent = await fetchUrl(URL);
        console.log("Parsing...");

        // Simple regex parse to avoid JSDOM heavy dependency if possible, 
        // but JSDOM is safer for XML. Let's try Regex for speed/simplicity in this env.
        // Format: <view id="icon-name" ... /> <path d="..." ... /> OR it's a sprite with <symbol>
        // Open Iconic sprite uses <symbol id="name" viewBox="..."> <path d="..." /> </symbol>

        const symbolRegex = /<symbol id="([^"]+)" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g;
        const pathRegex = /d="([^"]+)"/;

        const shapes = [];
        let match;

        while ((match = symbolRegex.exec(svgContent)) !== null) {
            const id = match[1];
            const viewBox = match[2];
            const content = match[3];

            const pathMatch = pathRegex.exec(content);
            if (pathMatch) {
                const path = pathMatch[1];

                // Determine Category
                let category = 'Divers';
                for (const [key, cat] of Object.entries(CATEGORIES)) {
                    if (id.includes(key)) {
                        category = cat;
                        break;
                    }
                }

                shapes.push({
                    id: `oi_${id}`,
                    name: id,
                    category: category,
                    path: path,
                    viewBox: viewBox,
                    fill: '#555555' // Default grey
                });
            }
        }

        console.log(`// Found ${shapes.length} icons`);
        console.log("export const OPEN_ICONIC_SHAPES = " + JSON.stringify(shapes, null, 4) + ";");

    } catch (e) {
        console.error(e);
    }
}

run();
