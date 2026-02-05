const fs = require('fs');
const path = require('path');

// הגדרת תיקיית היעד (client)
const rootDir = path.join(__dirname, 'client');
let totalFiles = 0;

function countFilesRecursively(directory) {
    // אם התיקייה לא קיימת, עוצרים
    if (!fs.existsSync(directory)) {
        console.log(`Directory not found: ${directory}`);
        return;
    }

    try {
        const items = fs.readdirSync(directory);

        items.forEach(item => {
            // דילוג על node_modules ועל תיקיות נסתרות כמו .git
            if (item === 'node_modules' || item.startsWith('.')) {
                return;
            }

            const fullPath = path.join(directory, item);
            
            try {
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    // אם זו תיקייה - צוללים פנימה (רקורסיה)
                    countFilesRecursively(fullPath);
                } else {
                    // אם זה קובץ - סופרים אותו
                    totalFiles++;
                }
            } catch (err) {
                // התעלמות משגיאות הרשאה בקבצים ספציפיים
            }
        });
    } catch (err) {
        console.error(`Error reading directory ${directory}:`, err.message);
    }
}

console.log('------------------------------------------------');
console.log(`Starting file count in: ${rootDir}`);
console.log('Ignoring: node_modules, .git, .DS_Store');
console.log('------------------------------------------------');

const startTime = Date.now();
countFilesRecursively(rootDir);
const endTime = Date.now();

console.log(`✅ Total Files: ${totalFiles.toLocaleString()}`);
console.log(`⏱️  Time taken: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
console.log('------------------------------------------------');