async function __runMaintainedPluginChecks(){
 await load();
 const fs=require('node:fs'),path=require('node:path');
 const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'test','goja-fixture.json'),'utf8'));
 const store=path.join(__storageDir__,'passkeys.json');
 const credential={...fixture.credential,userUUID:'test-user',name:'Existing',deviceType:'singleDevice',backedUp:false,createdAt:new Date().toISOString(),lastUsedAt:null};
 fs.writeFileSync(store,JSON.stringify({version:1,credentials:[credential],challenges:[{id:'local-signed-fixture',purpose:'authentication',challenge:fixture.challenge,userUUID:'test-user',expiresAt:new Date(Date.now()+120000).toISOString()}]}));
 const denied=await __request('POST','/api/komari-passkey/credentials/delete',{},false);
 __assert(denied.status===401,'Anonymous credential deletion accepted');
 const login=await __request('POST','/api/komari-passkey/authentication/verify',{challenge_id:'local-signed-fixture',response:fixture.response},false);
 __assert(login.status===200&&login.data.logged_in===true&&__sessions===1,'Existing signed credential failed to create native session: '+JSON.stringify(login));
 __assert(login.headers['Set-Cookie'].includes('HttpOnly')&&login.headers['Set-Cookie'].includes('Secure'),'Session cookie protection missing');
 let limited=false;
 for(let i=0;i<21;i++){
  const result=await __request('POST','/api/komari-passkey/authentication/options',{},false);
  if(result.status===429){limited=true;break;}
  __assert(result.status===200,'Goja could not generate authentication options: '+JSON.stringify(result));
 }
 __assert(limited,'Goja rate limit did not reject excess requests');
 __assert(JSON.parse(fs.readFileSync(store,'utf8')).credentials[0].id===credential.id,'Existing credential lost');
 fs.writeFileSync(store,'{"broken":');
 const corrupt=await __request('GET','/api/komari-passkey/credentials',{},true);
 __assert(corrupt.status===503&&corrupt.data.code==='store_unavailable','Goja did not report corrupt credential data');
 __assert(fs.readFileSync(store,'utf8')==='{"broken":','Goja replaced corrupt credential data');
 return true;
}
