const fs = require('fs');
const path = require('path');

function processFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    let lines = content.split('\n');
    const originalContent = content;

    // 1. Add Purpose and Document Philosophy if missing
    if (!lines.some(line => /^#+\s+Purpose/i.test(line))) {
        let yamlEndIdx = -1;
        let dashCount = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() === '---') {
                dashCount++;
                if (dashCount === 2) {
                    yamlEndIdx = i;
                    break;
                }
            }
        }
        
        if (yamlEndIdx !== -1) {
            lines.splice(yamlEndIdx + 1, 0, "", "# Purpose", "[TBD]", "", "# Document Philosophy", "[TBD]");
        }
    }

    // 2. Split Vision & Mission
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^(#+\s+)(.*?)Vision\s*&\s*Mission/i);
        if (match) {
            const hashes = match[1];
            const prefixNum = match[2];
            lines[i] = `${hashes}${prefixNum}Vision\n\n${hashes}${prefixNum}Mission\n[TBD]`;
        }
    }

    // 3. Center specific sections (only if in centers)
    const isCenter = filepath.replace(/\\/g, '/').includes('centers');
    if (isCenter) {
        if (!lines.some(line => /^#+\s+Center Features/i.test(line))) {
            let insertIdx = -1;
            for (let i = 0; i < lines.length; i++) {
                if (/^#+\s+.*Operations/i.test(lines[i]) || /^#+\s+.*Marketing Intelligence/i.test(lines[i])) {
                    insertIdx = i;
                    break;
                }
            }
            
            if (insertIdx !== -1) {
                lines.splice(insertIdx, 0, "", "### Center Features", "[TBD]", "", "### Center Services", "[TBD]", "");
            } else {
                lines.push("", "### Center Features", "[TBD]", "", "### Center Services", "[TBD]");
            }
        }
    }

    // 4. AI & Documentation missing fields
    let aiIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (/^#+\s+.*AI\s*&\s*Documentation/i.test(lines[i])) {
            aiIdx = i;
            break;
        }
    }
            
    if (aiIdx !== -1) {
        const missingAiFields = [
            "Relationship With Campaign Cards",
            "Relationship With Other Documentation",
            "Maintenance Policy",
            "Versioning Philosophy",
            "Future Expansion Areas",
            "Final Strategic Reminder",
            "Related Knowledge"
        ];
        
        let missingToAdd = [];
        const aiSectionText = lines.slice(aiIdx).join('\n');
        
        for (const field of missingAiFields) {
            const regex = new RegExp(`^#+\\s+.*${field.replace(/ /g, '\\s+')}`, 'im');
            if (!regex.test(aiSectionText)) {
                missingToAdd.push(field);
            }
        }
                
        if (missingToAdd.length > 0) {
            lines.push("");
            for (const field of missingToAdd) {
                lines.push(`### ${field}`, "[TBD]", "");
            }
        }
    }

    const newContent = lines.join('\n');
    if (newContent !== originalContent) {
        fs.writeFileSync(filepath, newContent, 'utf8');
        console.log(`Updated ${filepath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            walkDir(filepath);
        } else if (filepath.endsWith('.md')) {
            processFile(filepath);
        }
    }
}

const centersDir = path.join(__dirname, 'centers');
const departmentsDir = path.join(__dirname, 'departments');

walkDir(centersDir);
walkDir(departmentsDir);
console.log("Done.");
