const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const host=require('./host.cjs');
async function setup(config={}){const h=host({config:{rp_id:'example.test',origins:'https://example.test',...config}});await h.load();return h;}
test('corrupt JSON and invalid store structures return a recovery error without replacing data',async()=>{
 const invalid=['{"broken":','null','[]','{}',JSON.stringify({version:2,credentials:[],challenges:[]}),JSON.stringify({version:1,credentials:[{}],challenges:[]}),JSON.stringify({version:1,credentials:[],challenges:[{id:'x',purpose:'anything',expiresAt:'bad'}]})];
 for(const original of invalid){
  const h=await setup();const file=path.join(h.storage,'passkeys.json');h.files.set(file,original);
  for(const [method,url]of[['GET','credentials'],['POST','credentials/delete']]){
   const result=await h.request(method,'/api/komari-passkey/'+url,{},true);
   assert.equal(result.status,503);assert.equal(result.data.code,'store_unavailable');assert.equal(h.files.get(file),original);
  }
  assert.equal(h.calls.filter(c=>c.method==='admin:dbExec').length,0);
 }
});
test('valid existing stores preserve credential and extension fields',async()=>{
 const h=await setup();const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'goja-fixture.json')));
 const credential={...fixture.credential,userUUID:'test-user',name:'Existing',deviceType:'singleDevice',backedUp:false,createdAt:new Date().toISOString(),lastUsedAt:null,extension:'preserve'};
 const store={version:1,credentials:[credential],challenges:[],extension:'preserve'};h.setFile('passkeys.json',store);
 const result=await h.request('GET','/api/komari-passkey/credentials',undefined,true);assert.equal(result.status,200);assert.equal(result.data.credentials.length,1);assert.deepEqual(h.getFile('passkeys.json'),store);
});
test('a genuinely absent store remains a valid first-install state',async()=>{
 const h=await setup();const result=await h.request('GET','/api/komari-passkey/credentials',undefined,true);assert.equal(result.status,200);assert.deepEqual(result.data.credentials,[]);
});
test('debug output is quiet by default and can be explicitly enabled',async()=>{
 for(const enabled of[false,true]){
  const h=await setup({debug_logging:enabled});await h.request('GET','/api/komari-passkey/credentials',undefined,true);
  assert.equal(h.logs.some(entry=>entry.level==='log'),enabled);
 }
});
