const fs = require('fs');
const path = require('path');

// ==========================================================
// USER CONFIGURATION
// ==========================================================

// Step 1: Keep 'true' to safely see what WILL be deleted without taking action.
// Step 2: Change to 'false' to actually delete the files.
const DRY_RUN = true; 

// Path to your target directory (Updated to your specific path)
const rootDir = path.join(__dirname, 'client/dist/widgets');

// The specific folder names where translation files are located in EXB
const TARGET_FOLDERS = ['translations', 'nls'];

// Filename prefixes to KEEP.
const KEEP_PREFIXES = ['default', 'he'];

// ==========================================================
// GLOBAL COUNTER
// ==========================================================
let totalDeleted = 0; // מונה לקבצים שנמחקו

// ==========================================================
// LOGIC
// ==========================================================

/**
 * Recursively scans directories to find translation folders.
 */
function scanDirectory(directory) {
    if (!fs.existsSync(directory)) {
        console.error(`❌ Directory not found: ${directory}`);
        return;
    }

    try {
        const items = fs.readdirSync(directory);

        items.forEach(item => {
            const fullPath = path.join(directory, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                // If we found a translation folder, process it
                if (TARGET_FOLDERS.includes(item)) {
                    cleanTranslationFolder(fullPath);
                } else {
                    // Otherwise, continue searching deeper (Recursion)
                    scanDirectory(fullPath);
                }
            }
        });
    } catch (err) {
        console.error(`Error reading directory ${directory}:`, err.message);
    }
}

/**
 * Deletes unwanted files inside a specific translation folder.
 */
function cleanTranslationFolder(folderPath) {
    const files = fs.readdirSync(folderPath);
    
    files.forEach(file => {
        const filePath = path.join(folderPath, file);
        const stat = fs.statSync(filePath);

        // We only care about files, not subdirectories inside 'translations'
        if (stat.isFile()) {
            const shouldKeep = KEEP_PREFIXES.some(prefix => file.startsWith(prefix));

            if (!shouldKeep) {
                // בדיקה ומנייה
                totalDeleted++; 

                if (DRY_RUN) {
                    console.log(`[WOULD DELETE]: ${filePath}`);
                } else {
                    try {
                        fs.unlinkSync(filePath);
                        console.log(`[DELETED]: ${filePath}`);
                    } catch (e) {
                        console.error(`Failed to delete ${filePath}`, e.message);
                    }
                }
            }
        }
    });
}

// ==========================================================
// EXECUTION
// ==========================================================

console.log('------------------------------------------------');
console.log(`Starting cleanup process... (DRY_RUN: ${DRY_RUN})`);
console.log(`Target Directory: ${rootDir}`);
console.log(`Keeping files starting with: ${KEEP_PREFIXES.join(', ')}`);
console.log('------------------------------------------------');

// איפוס המונה לפני ההרצה
totalDeleted = 0;

scanDirectory(rootDir);

console.log('------------------------------------------------');
if (DRY_RUN) {
    console.log(`ℹ️  Summary: ${totalDeleted} files would be deleted.`);
    console.log('✅ DRY RUN COMPLETE. No files were harmed.');
    console.log('To actually delete files, change "const DRY_RUN = true" to "false" in the script.');
} else {
    console.log(`🗑️  Summary: ${totalDeleted} files were successfully deleted.`);
    console.log('✅ CLEANUP COMPLETE.');
}
console.log('------------------------------------------------');