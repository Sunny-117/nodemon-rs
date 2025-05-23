#!/usr/bin/env node

const { watch } = require('../index.js');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);

// Default options
let options = {
    script: null,
    ext: 'js,mjs,json',
    ignore: ['node_modules/**/*', '.git'],
    exec: 'node',
    delay: 1.0
};

// Try to load nodemon.json if it exists
try {
    const configPath = path.resolve(process.cwd(), 'nodemon.json');
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        options = { ...options, ...config };
    }
} catch (err) {
    console.warn('Warning: Error loading nodemon.json:', err.message);
}

// Parse command line arguments
let i = 0;
while (i < args.length) {
    const arg = args[i];
    
    switch (arg) {
        case '--ext':
            options.ext = args[++i];
            break;
        case '--ignore':
            options.ignore = (options.ignore || []).concat(args[++i].split(','));
            break;
        case '--exec':
            options.exec = args[++i];
            break;
        case '--delay':
            options.delay = parseFloat(args[++i]);
            break;
        default:
            if (!options.script) {
                options.script = arg;
            }
            break;
    }
    i++;
}

// If no script is specified, try to find one in this order:
// 1. script from nodemon.json
// 2. main from package.json
// 3. index.js in current directory
// 4. fail if none found
if (!options.script) {
    try {
        // Try package.json main field
        const packageJsonPath = path.resolve(process.cwd(), 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            if (packageJson.main) {
                options.script = packageJson.main;
            }
        }

        // If still no script, try index.js
        if (!options.script) {
            const indexPath = path.resolve(process.cwd(), 'index.js');
            if (fs.existsSync(indexPath)) {
                options.script = 'index.js';
            } else {
                console.error('Error: Could not find index.js or main field in package.json');
                console.log('Please specify a script to run or create an index.js file');
                process.exit(1);
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

// Convert relative path to absolute
options.script = path.resolve(process.cwd(), options.script);

console.log(`[nodemon-rs] starting \`${options.exec} ${options.script}\``);
console.log(`[nodemon-rs] watching extensions: ${options.ext}`);
console.log(`[nodemon-rs] watching path: ${path.dirname(options.script)}`);

// Start watching
try {
    watch(options);
    
    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\n[nodemon-rs] terminating');
        process.exit(0);
    });
} catch (err) {
    console.error('Error starting nodemon-rs:', err);
    process.exit(1);
} 