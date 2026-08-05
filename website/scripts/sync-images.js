const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../Docs/insan-content-data.json');
const MEDIA_SRC = path.join(__dirname, '../../business/Media');
const MEDIA_DEST = path.join(__dirname, '../apps/web/public/media');

if (!fs.existsSync(MEDIA_DEST)) fs.mkdirSync(MEDIA_DEST, { recursive: true });

function findFileRecursively(dir, filename) {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            const found = findFileRecursively(fullPath, filename);
            if (found) return found;
        } else if (file === filename) {
            return fullPath;
        }
    }
    return null;
}

let dataStr = fs.readFileSync(DATA_FILE, 'utf8');
let modified = false;

// Regex to find "business/Media/..." strings
const regex = /"business\/Media\/([^"]+)"/g;

dataStr = dataStr.replace(regex, (match, p1) => {
    const filename = path.basename(p1);
    const foundPath = findFileRecursively(MEDIA_SRC, filename);
    
    if (foundPath) {
        // Replace spaces or special chars for web-safe URLs
        const safeName = filename.replace(/\s+/g, '-').toLowerCase();
        const destPath = path.join(MEDIA_DEST, safeName);
        
        // Copy file
        fs.copyFileSync(foundPath, destPath);
        console.log(`Copied ${filename} to public/media/${safeName}`);
        modified = true;
        
        return `"/media/${safeName}"`;
    } else {
        console.log(`WARNING: Could not find ${filename} in ${MEDIA_SRC}`);
        return match;
    }
});

if (modified) {
    fs.writeFileSync(DATA_FILE, dataStr);
    console.log('insan-content-data.json updated successfully.');
} else {
    console.log('No changes made to json.');
}
