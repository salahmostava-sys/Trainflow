const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
fs.copyFileSync(path.join(root, 'ibta-ops.html'), path.join(output, 'index.html'));
fs.copyFileSync(path.join(root, 'cloud.js'), path.join(output, 'cloud.js'));
fs.copyFileSync(path.join(root, 'ops-ui.js'), path.join(output, 'ops-ui.js'));
for(const file of ['trainees.js','trainees-core.js','trainees.css','trainee-reports.js','session-policy.js'])fs.copyFileSync(path.join(root,file),path.join(output,file));
console.log('Cloudflare Pages files ready in dist/');
fs.writeFileSync(path.join(output,'_worker.js'),fs.readFileSync(path.join(root,'server','worker.mjs'),'utf8').replace("import '../session-policy.js';","import './session-policy.js';"));
fs.writeFileSync(path.join(output,'_routes.json'),JSON.stringify({version:1,include:['/api/*'],exclude:[]}));

