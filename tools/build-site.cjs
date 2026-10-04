const fs = require('node:fs');
const path = require('node:path');
const {createHash}=require('node:crypto');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
let html=fs.readFileSync(path.join(root,'ibta-ops.html'),'utf8');
const files=['cloud.js','ops-ui.js','trainees.js','trainees-excel.js','trainees-core.js','trainees-xlsx.js','trainees-files.js','trainees.css','trainee-reports.js','session-policy.js'];
const vendor=fs.readFileSync(require.resolve('exceljs/dist/exceljs.min.js'));
fs.writeFileSync(path.join(output,'exceljs-4.4.0.min.js'),vendor);
fs.copyFileSync(require.resolve('exceljs/LICENSE'),path.join(output,'exceljs-LICENSE.txt'));
let worker=fs.readFileSync(path.join(root,'trainees-xlsx-worker.js'),'utf8');
for(const file of ['trainees-xlsx.js','exceljs-4.4.0.min.js']){const data=file.startsWith('exceljs')?vendor:fs.readFileSync(path.join(root,file));worker=worker.replaceAll("'"+file+"'","'"+file+'?v='+createHash('sha256').update(data).digest('hex').slice(0,12)+"'");}
fs.writeFileSync(path.join(output,'trainees-xlsx-worker.js'),worker);
html=html.replaceAll('"trainees-xlsx-worker.js"','"trainees-xlsx-worker.js?v='+createHash('sha256').update(worker).digest('hex').slice(0,12)+'"');
for(const file of files){
  const hash=createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex').slice(0,12);
  html=html.replaceAll('"'+file+'"','"'+file+'?v='+hash+'"');fs.copyFileSync(path.join(root,file),path.join(output,file));
}
fs.writeFileSync(path.join(output,'index.html'),html);
console.log('Cloudflare Pages files ready in dist/');
fs.writeFileSync(path.join(output,'_worker.js'),fs.readFileSync(path.join(root,'server','worker.mjs'),'utf8').replace("import '../session-policy.js';","import './session-policy.js';"));
fs.writeFileSync(path.join(output,'_routes.json'),JSON.stringify({version:1,include:['/api/*'],exclude:[]}));

