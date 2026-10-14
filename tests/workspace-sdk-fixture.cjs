// Only the third-party SDK and clipboard are replaced; Cloud and all UI modules run unchanged.
function installBoundaryFixtures(){
  const clone=value=>JSON.parse(JSON.stringify(value));
  const user=window.uiTestUser||{id:'ui-admin',email:'ui@example.invalid',user_metadata:{}};
  const db=window.uiTestDatabase=JSON.parse(sessionStorage.getItem("test-sdk-database")||"null")||{settings:{id:1,version:1,payload:{
    categoryOrder:['Foundation'],codeCategories:['Foundation-100'],keycodeOrder:{},
    keycodes:['FIRST','SECOND','THIRD'].map(code=>({code,title:code,lang:'Arabic',category:'Foundation'})),
    credentials:{account:'UI-ACCOUNT',password:'UI-PASSWORD'},links:{}
  }},codes:[{code:'UI-VOUCHER',category:'Foundation-100',notes:'',used_on:null,used_by:null,version:1}],
  members:[{...user,user_id:user.id,active:true,role:'admin'}],sheets:{},saveError:''};
  user.user_metadata=clone(db.accountMetadata?.[user.id]||user.user_metadata||{});
  const liveChannels=new Set(),bus=new BroadcastChannel('test-sdk-live');
  bus.onmessage=({data})=>{Object.assign(db,data.snapshot);for(const channel of liveChannels)channel.receive?.({new:{key:data.scope,owner_id:data.scope==='workspace'?null:data.scope}});};
  const persist=(scope='workspace')=>{sessionStorage.setItem('test-sdk-database',JSON.stringify(db));bus.postMessage({scope,snapshot:clone(db)});};
  window.addEventListener('beforeunload',()=>sessionStorage.setItem('test-sdk-database',JSON.stringify(db)));
  window.uiTestCopies=JSON.parse(sessionStorage.getItem('test-sdk-copies')||'[]');
  if(!window.uiUseNativeClipboard)Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.uiTestCopies.push(text);sessionStorage.setItem('test-sdk-copies',JSON.stringify(window.uiTestCopies));}}});
  const client={auth:{getSession:async()=>({data:{session:{user:clone(user),access_token:'header.'+btoa(JSON.stringify({amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)}]}))+'.signature'}}}),onAuthStateChange(){},signOut:async()=>({}),updateUser:async attributes=>{if(db.authSaveError)return {error:{message:db.authSaveError}};user.user_metadata={...user.user_metadata,...clone(attributes.data)};db.accountMetadata||={};db.accountMetadata[user.id]=clone(user.user_metadata);persist();return {data:{user:clone(user)}};}},
    channel(){const channel={on(_event,_filter,callback){this.receive=callback;return this;},subscribe(callback){queueMicrotask(()=>{if(liveChannels.has(this))callback('SUBSCRIBED');});return this;}};liveChannels.add(channel);return channel;},removeChannel:async channel=>{liveChannels.delete(channel);return 'ok';},
    from(table){
      const filters=[];
      const records=()=>{
        const tables={ibta_settings:[db.settings],ibta_codes:db.codes,ibta_members:db.members,ibta_supervisor_stock:db.stock||[],ibta_trainee_sheets:Object.entries(db.sheets).map(([owner_id,sheet])=>({owner_id,...sheet}))};
        if(!Object.hasOwn(tables,table))throw Error('Unexpected table: '+table);
        return tables[table].filter(row=>filters.every(([key,value])=>row[key]===value));
      };
      return {select(){return this;},eq(key,value){filters.push([key,value]);return this;},order(){return this;},
        single:async()=>({data:clone(records()[0])}),maybeSingle:async()=>({data:clone(records()[0]||null)}),
        range:async(from,to)=>({data:clone(records().slice(from,to+1))}),then(resolve,reject){return Promise.resolve({data:clone(records())}).then(resolve,reject);}};
    },
    async rpc(name,args){
      if(name==='ibta_set_voucher_trainee_name'){
        if(window.uiTestNameSaveGate)await window.uiTestNameSaveGate;
        if(db.nameSaveError)return {error:{message:db.nameSaveError}};
        const row=db.codes.find(row=>row.code===args.target_code&&row.version===args.expected_version);
        if(!row)return {error:{message:'CONFLICT: reload required'}};
        row.trainee_name=args.trainee_name;row.version++;persist();return {data:row.version};
      }
      if(name==='ibta_apply_changes'){
        if(args.settings_version!==db.settings.version)return {error:{message:'CONFLICT'}};
        for(const change of args.changes||[]){if(change.op==='update'){const row=db.codes.find(row=>row.code===change.code&&row.version===change.version);if(!row)return {error:{message:'CONFLICT'}};Object.assign(row,{notes:change.notes,used_on:change.used_on,version:row.version+1});}}
        if(args.settings_payload){db.settings.payload=clone(args.settings_payload);db.settings.version++;}
        persist();return {};
      }
      if(name==='ibta_claim_code'||name==='ibta_claim_trainee_voucher'){
        if(name==='ibta_claim_trainee_voucher'&&window.uiTestTraineeClaimGate)await window.uiTestTraineeClaimGate;
        if(db.claimError)return {error:{message:db.claimError}};
        const row=db.codes.find(row=>row.code===args.target_code&&row.version===args.expected_version&&!row.used_on);
        if(!row)return {data:[]};
        if(name==='ibta_claim_trainee_voucher')row.trainee_name=args.trainee_name;
        Object.assign(row,{used_on:args.use_date,used_by:user.id,version:row.version+1});persist();return {data:[clone(row)]};
      }
      if(name==='ibta_save_trainee_worksheet'){
        if(window.uiTestSheetSaveGate)await window.uiTestSheetSaveGate;
        if(db.saveError)return {error:{message:db.saveError}};
        const old=db.sheets[args.target_owner]||{version:0};
        if(old.version!==args.expected_version)return {error:{message:'CONFLICT'}};
        db.sheets[args.target_owner]={sheet_id:args.target_sheet,sheet_name:'Sheet 1',sheet_hidden:false,sheet_order:0,cells:clone(args.new_cells),format:clone(args.new_format),version:old.version+1};
        persist(args.target_owner);return {data:old.version+1};
      }
      if(name==='ibta_inventory_delivery_status')return {data:{enabled:false,provider:'web',time:'16:59'}};
      throw Error('Unexpected RPC: '+name);
    }
  };
  window.supabase={createClient:()=>client};
}

module.exports=installBoundaryFixtures;
