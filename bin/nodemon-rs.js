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

// If no script is specified in args or config, use the first .js file in package.json
if (!options.script) {
    try {
        const packageJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
        if (packageJson.main) {
            options.script = packageJson.main;
        }
    } catch (err) {
        console.error('Error: No script specified and could not read package.json');
        process.exit(1);
    }
}

if (!options.script) {
    console.error('Error: No script specified to run');
    console.log('Usage: nodemon-rs [script] [options]');
    console.log('Options:');
    console.log('  --ext      File extensions to watch (default: js,mjs,json)');
    console.log('  --ignore   Patterns to ignore (default: node_modules/**/*,.git)');
    console.log('  --exec     Executor to run script (default: node)');
    console.log('  --delay    Delay in seconds before restarting (default: 1.0)');
    process.exit(1);
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