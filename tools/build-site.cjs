const fs = require('node:fs');
const path = require('node:path');
const {createHash}=require('node:crypto');
const {Script}=require('node:vm');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
let html=fs.readFileSync(path.join(root,'ibta-ops.html'),'utf8');
const files=['cloud.js','ops-ui.js','inventory-delivery.js','trainees.js','trainees-excel.js','trainees-core.js','trainees-xlsx.js','trainees-files.js','trainees.css','trainee-reports.js','session-policy.js'];
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
const JSZip=require(require.resolve('jszip',{paths:[path.dirname(require.resolve('exceljs'))]})),zip=new JSZip();
for(const file of fs.readdirSync(path.join(root,'extension/whatsapp-web'))){
  const content=fs.readFileSync(path.join(root,'extension/whatsapp-web',file),'utf8').replace(/\r\n/g,'\n');
  if(file.endsWith('.js'))new Script(content,{filename:file});
  zip.file(file,content,{date:new Date('2026-01-01T00:00:00Z')});
}
zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}).then(bytes=>{
  fs.writeFileSync(path.join(output,'ibta-whatsapp-web.zip'),bytes);
  html=html.replaceAll('"ibta-whatsapp-web.zip"','"ibta-whatsapp-web.zip?v='+createHash('sha256').update(bytes).digest('hex').slice(0,12)+'"');
  fs.writeFileSync(path.join(output,'index.html'),html);console.log('WhatsApp Web extension package ready');
}).catch(error=>{console.error(error.message);process.exitCode=1;});

