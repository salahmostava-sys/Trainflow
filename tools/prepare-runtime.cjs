const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function browserSource(filename){return ts.transpileModule(fs.readFileSync(path.join(root,filename),'utf8'),{compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2020}}).outputText;}
for(const [source,target] of [['client/cloud.ts','cloud.js'],['client/navigation.ts','navigation.js']])fs.writeFileSync(path.join(root,target),browserSource(source));
