const fs = require('node:fs');
const path = require('node:path');
const {createHash}=require('node:crypto');
const {Script}=require('node:vm');
require('./prepare-runtime.cjs');
const {sources,renderDocument}=require('./workspace-source.cjs');

const root = path.resolve(__dirname, '..');
const next = process.argv.includes('--next');
const output = path.join(root, next ? 'public/workspace' : 'dist');
fs.mkdirSync(output, { recursive: true });
if(!next){
  fs.copyFileSync(path.join(path.dirname(require.resolve('react/package.json')),'umd/react.production.min.js'),path.join(output,'react-runtime.js'));
  fs.copyFileSync(path.join(path.dirname(require.resolve('react-dom/package.json')),'umd/react-dom.production.min.js'),path.join(output,'react-dom-runtime.js'));
  fs.copyFileSync(path.join(root,'generated/workspace-views.js'),path.join(output,'workspace-views.js'));
}
// Remove retired assets when rebuilding an existing output directory.
for(const file of ['inventory-delivery.js','trainflow-whatsapp-web.zip','_worker.js','_routes.json']){const retired=path.join(output,file);if(fs.existsSync(retired))fs.unlinkSync(retired);}
let html=next?'':renderDocument();
const hashes=new Map();
const fingerprint=(file,bytes)=>{const hash=createHash('sha256').update(bytes).digest('hex').slice(0,12);hashes.set(file,hash);return hash;};
const files=['app-dialog.js','prometric-core.js','prometric-exam-core.js','prometric-exam-results.js','prometric-registration.js','certificate-name.js','cloud.js','workspace.js','workspace.css','navigation.js','ops-ui.js','trainees.js','trainees-excel.js','trainees-borders.js','trainees-sheets.js','trainees-core.js','trainees-xlsx.js','trainees-files.js','trainees.css','trainee-reports.js','session-policy.js','codes-export.js','voucher-columns.js'];
const vendor=fs.readFileSync(require.resolve('exceljs/dist/exceljs.min.js'));
fs.writeFileSync(path.join(output,'exceljs-4.4.0.min.js'),vendor);
fs.copyFileSync(require.resolve('exceljs/LICENSE'),path.join(output,'exceljs-LICENSE.txt'));
let worker=fs.readFileSync(path.join(root,'trainees-xlsx-worker.js'),'utf8');
for(const file of ['trainees-xlsx.js','exceljs-4.4.0.min.js']){const data=file.startsWith('exceljs')?vendor:fs.readFileSync(path.join(root,file));worker=worker.replaceAll("'"+file+"'","'"+file+'?v='+createHash('sha256').update(data).digest('hex').slice(0,12)+"'");}
fs.writeFileSync(path.join(output,'trainees-xlsx-worker.js'),worker);
html=html.replaceAll('"trainees-xlsx-worker.js"','"trainees-xlsx-worker.js?v='+fingerprint('trainees-xlsx-worker.js',worker)+'"');
const connector=fs.readFileSync(path.join(root,'tools/google-reports.gs'));
fs.writeFileSync(path.join(output,'google-reports.gs'),connector);
html=html.replaceAll('"google-reports.gs"','"google-reports.gs?v='+fingerprint('google-reports.gs',connector)+'"');
for(const file of files){
  const hash=fingerprint(file,fs.readFileSync(path.join(root,file)));
  html=html.replaceAll('"'+file+'"','"'+file+'?v='+hash+'"');fs.copyFileSync(path.join(root,file),path.join(output,file));
}
if(!next)fs.writeFileSync(path.join(output,'index.html'),html);
if(next&&fs.existsSync(path.join(output,'index.html')))fs.unlinkSync(path.join(output,'index.html'));
console.log((next ? 'Next.js workspace' : 'Static workspace')+' files ready in '+path.relative(root,output)+'/');
const JSZip=require(require.resolve('jszip',{paths:[path.dirname(require.resolve('exceljs'))]}));
const prometricZip=new JSZip();
for(const file of fs.readdirSync(path.join(root,'extension/prometric'))){let bytes=fs.readFileSync(path.join(root,'extension/prometric',file));if(/\.(?:js|json|html|css|md)$/.test(file)||file==='LICENSE')bytes=Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));if(file.endsWith('.js'))new Script(bytes.toString('utf8'),{filename:'prometric/'+file});prometricZip.file(file,bytes,{date:new Date('2026-01-01T00:00:00Z')});}
prometricZip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}).then(prometricBytes=>{
  fs.writeFileSync(path.join(output,'trainflow-prometric.zip'),prometricBytes);
  fs.writeFileSync(path.join(output,'ibta-prometric.zip'),prometricBytes);
  if(next){
    fs.writeFileSync(path.join(root,'public/trainflow-prometric.zip'),prometricBytes);
    fs.writeFileSync(path.join(root,'public/ibta-prometric.zip'),prometricBytes);
  }
  html=html.replaceAll('"trainflow-prometric.zip"','"trainflow-prometric.zip?v='+fingerprint('trainflow-prometric.zip',prometricBytes)+'"');
  if(!next)fs.writeFileSync(path.join(output,'index.html'),html);
  if(next){
    const asset=value=>/^(?:https?:|\/)/i.test(value)?value:'/workspace/'+value+(hashes.has(value)?'?v='+hashes.get(value):'');
    const languageBootstrap=fs.readFileSync(path.join(root,'client/language-bootstrap.js'),'utf8');
    const workspaceScripts=sources.map(descriptor=>Object.fromEntries(Object.entries(descriptor).map(([key,value])=>[key,['src','data-worker','data-extension','data-connector'].includes(key)?asset(value):value])));
    fs.mkdirSync(path.join(root,'generated'),{recursive:true});
    fs.writeFileSync(path.join(root,'generated/workspace-assets.ts'),Object.entries({workspaceScripts,languageBootstrap}).map(([name,value])=>'export const '+name+' = '+JSON.stringify(value)+';').join('\n')+'\n');
  }
  console.log('Prometric extension package ready');
}).catch(error=>{console.error(error.message);process.exitCode=1;});
