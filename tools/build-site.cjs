const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
fs.copyFileSync(path.join(root, 'ibta-ops.html'), path.join(output, 'index.html'));
fs.copyFileSync(path.join(root, 'cloud.js'), path.join(output, 'cloud.js'));
console.log('Cloudflare Pages files ready in dist/');
