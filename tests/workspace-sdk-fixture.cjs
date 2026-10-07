// Only the third-party SDK and clipboard are replaced; Cloud and all UI modules run unchanged.
function installBoundaryFixtures(){
  const clone=value=>JSON.parse(JSON.stringify(value));
  const user={id:'ui-admin',email:'ui@example.invalid',user_metadata:{}};
  const db=window.uiTestDatabase=JSON.parse(sessionStorage.getItem("test-sdk-database")||"null")||{settings:{id:1,version:1,payload:{
    categoryOrder:['Foundation'],codeCategories:['Foundation-100'],keycodeOrder:{},
    keycodes:['FIRST','SECOND','THIRD'].map(code=>({code,title:code,lang:'Arabic',category:'Foundation'})),
    credentials:{account:'UI-ACCOUNT',password:'UI-PASSWORD'},links:{}
  }},codes:[{code:'UI-VOUCHER',category:'Foundation-100',notes:'',used_on:null,used_by:null,version:1}],
  members:[{...user,user_id:user.id,active:true,role:'admin'}],sheets:{},saveError:''};
  const persist=()=>sessionStorage.setItem('test-sdk-database',JSON.stringify(db));
  window.addEventListener('beforeunload',persist);
  window.uiTestCopies=JSON.parse(sessionStorage.getItem('test-sdk-copies')||'[]');
  if(!window.uiUseNativeClipboard)Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.uiTestCopies.push(text);sessionStorage.setItem('test-sdk-copies',JSON.stringify(window.uiTestCopies));}}});
  const client={auth:{getSession:async()=>({data:{session:{user,access_token:'header.'+btoa(JSON.stringify({amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)}]}))+'.signature'}}}),onAuthStateChange(){},signOut:async()=>({})},
    from(table){
      const filters=[];
      const records=()=>{
        const tables={ibta_settings:[db.settings],ibta_codes:db.codes,ibta_members:db.members,ibta_supervisor_stock:[],ibta_trainee_sheets:Object.entries(db.sheets).map(([owner_id,sheet])=>({owner_id,...sheet}))};
        if(!Object.hasOwn(tables,table))throw Error('Unexpected table: '+table);
        return tables[table].filter(row=>filters.every(([key,value])=>row[key]===value));
      };
      return {select(){return this;},eq(key,value){filters.push([key,value]);return this;},order(){return this;},
        single:async()=>({data:clone(records()[0])}),maybeSingle:async()=>({data:clone(records()[0]||null)}),
        range:async(from,to)=>({data:clone(records().slice(from,to+1))}),then(resolve,reject){return Promise.resolve({data:clone(records())}).then(resolve,reject);}};
    },
    async rpc(name,args){
      if(name==='ibta_apply_changes'){
        if(args.settings_version!==db.settings.version)return {error:{message:'CONFLICT'}};
        if(args.settings_payload){db.settings.payload=clone(args.settings_payload);db.settings.version++;}
        persist();return {};
      }
      if(name==='ibta_claim_code'){
        const row=db.codes.find(row=>row.code===args.target_code&&row.version===args.expected_version&&!row.used_on);
        if(!row)return {data:[]};
        Object.assign(row,{used_on:args.use_date,used_by:user.id,version:row.version+1});persist();return {data:[clone(row)]};
      }
      if(name==='ibta_save_trainee_worksheet'){
        if(db.saveError)return {error:{message:db.saveError}};
        const old=db.sheets[args.target_owner]||{version:0};
        if(old.version!==args.expected_version)return {error:{message:'CONFLICT'}};
        db.sheets[args.target_owner]={sheet_id:args.target_sheet,sheet_name:'Sheet 1',sheet_hidden:false,sheet_order:0,cells:clone(args.new_cells),format:clone(args.new_format),version:old.version+1};
        persist();return {data:old.version+1};
      }
      if(name==='ibta_inventory_delivery_status')return {data:{enabled:false,provider:'web',time:'16:59'}};
      throw Error('Unexpected RPC: '+name);
    }
  };
  window.supabase={createClient:()=>client};
}

module.exports=installBoundaryFixtures;
