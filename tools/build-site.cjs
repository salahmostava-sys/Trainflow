const fs = require('node:fs');
const path = require('node:path');
const {createHash}=require('node:crypto');
const {Script}=require('node:vm');
const ts=require('typescript');
require('./prepare-runtime.cjs');
const {renderDocument}=require('./workspace-source.cjs');

const root = path.resolve(__dirname, '..');
const next = process.argv.includes('--next');
const output = path.join(root, next ? 'public/workspace' : 'dist');
fs.mkdirSync(output, { recursive: true });
// Remove retired assets when rebuilding an existing output directory.
for(const file of ['inventory-delivery.js','trainflow-whatsapp-web.zip']){const retired=path.join(output,file);if(fs.existsSync(retired))fs.unlinkSync(retired);}
let html=renderDocument();
const files=['prometric-core.js','prometric-registration.js','certificate-name.js','cloud.js','workspace.js','workspace.css','navigation.js','ops-ui.js','trainees.js','trainees-excel.js','trainees-core.js','trainees-xlsx.js','trainees-files.js','trainees.css','trainee-reports.js','session-policy.js','codes-export.js'];
const vendor=fs.readFileSync(require.resolve('exceljs/dist/exceljs.min.js'));
fs.writeFileSync(path.join(output,'exceljs-4.4.0.min.js'),vendor);
fs.copyFileSync(require.resolve('exceljs/LICENSE'),path.join(output,'exceljs-LICENSE.txt'));
let worker=fs.readFileSync(path.join(root,'trainees-xlsx-worker.js'),'utf8');
for(const file of ['trainees-xlsx.js','exceljs-4.4.0.min.js']){const data=file.startsWith('exceljs')?vendor:fs.readFileSync(path.join(root,file));worker=worker.replaceAll("'"+file+"'","'"+file+'?v='+createHash('sha256').update(data).digest('hex').slice(0,12)+"'");}
fs.writeFileSync(path.join(output,'trainees-xlsx-worker.js'),worker);
html=html.replaceAll('"trainees-xlsx-worker.js"','"trainees-xlsx-worker.js?v='+createHash('sha256').update(worker).digest('hex').slice(0,12)+'"');
const connector=fs.readFileSync(path.join(root,'tools/google-reports.gs'));
fs.writeFileSync(path.join(output,'google-reports.gs'),connector);
html=html.replaceAll('"google-reports.gs"','"google-reports.gs?v='+createHash('sha256').update(connector).digest('hex').slice(0,12)+'"');
for(const file of files){
  const hash=createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex').slice(0,12);
  html=html.replaceAll('"'+file+'"','"'+file+'?v='+hash+'"');fs.copyFileSync(path.join(root,file),path.join(output,file));
}
fs.writeFileSync(path.join(output,'index.html'),html);
console.log((next ? 'Next.js workspace' : 'Cloudflare Pages')+' files ready in '+path.relative(root,output)+'/');
if(!next){
  fs.writeFileSync(path.join(output,'_worker.js'),ts.transpileModule(fs.readFileSync(path.join(root,'server/api.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText.replace("import '../session-policy.js';","import './session-policy.js';"));
  fs.writeFileSync(path.join(output,'_routes.json'),JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
}
const JSZip=require(require.resolve('jszip',{paths:[path.dirname(require.resolve('exceljs'))]}));
const prometricZip=new JSZip();
for(const file of fs.readdirSync(path.join(root,'extension/prometric'))){let bytes=fs.readFileSync(path.join(root,'extension/prometric',file));if(/\.(?:js|json|html|css|md)$/.test(file)||file==='LICENSE')bytes=Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));if(file.endsWith('.js'))new Script(bytes.toString('utf8'),{filename:'prometric/'+file});prometricZip.file(file,bytes,{date:new Date('2026-01-01T00:00:00Z')});}
prometricZip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}).then(prometricBytes=>{
  fs.writeFileSync(path.join(output,'trainflow-prometric.zip'),prometricBytes);
  fs.writeFileSync(path.join(output,'ibta-prometric.zip'),prometricBytes);
  html=html.replaceAll('"trainflow-prometric.zip"','"trainflow-prometric.zip?v='+createHash('sha256').update(prometricBytes).digest('hex').slice(0,12)+'"');
  fs.writeFileSync(path.join(output,'index.html'),html);
  if(next){
    const asset=value=>/^(?:https?:|\/)/i.test(value)?value:'/workspace/'+value;
    const attributes=tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([,key,value])=>[key,['src','href','data-worker','data-extension','data-connector'].includes(key)?asset(value):value]));
    const head=html.match(/<head>([\s\S]*?)<\/head>/i)[1],body=html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)[1];
    const languageBootstrap=head.match(/<script[^>]*>([\s\S]*?)<\/script>/i)[1];
    const workspaceScripts=[...body.matchAll(/<script\b([^>]*)>[\s\S]*?<\/script>/gi)].map(([,tag])=>attributes(tag)).filter(attributes=>attributes.src);
    fs.mkdirSync(path.join(root,'generated'),{recursive:true});
    fs.writeFileSync(path.join(root,'generated/workspace-assets.ts'),Object.entries({workspaceScripts,languageBootstrap}).map(([name,value])=>'export const '+name+' = '+JSON.stringify(value)+';').join('\n')+'\n');
  }
  console.log('Prometric extension package ready');
}).catch(error=>{console.error(error.message);process.exitCode=1;});
