const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const host=require('./host.cjs');
const b64=b=>Buffer.from(b).toString('base64url');
const keys=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const jwk=keys.publicKey.export({format:'jwk'});
const cose=Buffer.concat([Buffer.from('a5010203262001215820','hex'),Buffer.from(jwk.x,'base64url'),Buffer.from('225820','hex'),Buffer.from(jwk.y,'base64url')]);
const credential={id:b64(crypto.randomBytes(24)),userUUID:'test-user',name:'Existing credential',publicKey:b64(cose),counter:0,transports:['internal'],deviceType:'singleDevice',backedUp:false,createdAt:new Date().toISOString(),lastUsedAt:null};
async function setup(challenges=[]){
 const h=host({directory:process.env.PLUGIN_TEST_DIRECTORY,config:{rp_id:'example.test',origins:'https://example.test'}});await h.load();
 h.setFile('passkeys.json',{version:1,credentials:[credential],challenges});return h;
}
function assertion(challenge,overrides={}){
 const client=Buffer.from(JSON.stringify({type:'webauthn.get',challenge,origin:overrides.origin||'https://example.test',crossOrigin:false}));
 const count=Buffer.alloc(4);count.writeUInt32BE(overrides.counter??1);
 const auth=Buffer.concat([crypto.createHash('sha256').update(overrides.rpID||'example.test').digest(),Buffer.from([overrides.flags??5]),count]);
 let signature=crypto.sign('sha256',Buffer.concat([auth,crypto.createHash('sha256').update(client).digest()]),keys.privateKey);
 if(overrides.badSignature)signature[5]^=1;
 return {id:credential.id,rawId:credential.id,type:'public-key',response:{clientDataJSON:b64(client),authenticatorData:b64(auth),signature:b64(signature)}};
}
test('limits one source before repeated store writes; expires rate window',async()=>{
 const h=await setup();
 for(let i=0;i<20;i++)assert.equal((await h.request('POST','/api/komari-passkey/authentication/options')).status,200);
 const before=JSON.stringify(h.getFile('passkeys.json'));
 const denied=await h.request('POST','/api/komari-passkey/authentication/options');
 assert.equal(denied.status,429);assert.equal(denied.headers['Retry-After'],'60');assert.equal(JSON.stringify(h.getFile('passkeys.json')),before);
 h.advance(60001);assert.equal((await h.request('POST','/api/komari-passkey/authentication/options')).status,200);
});
test('rotating source IP cannot bypass the global request budget',async()=>{
 const h=await setup();
 for(let i=0;i<120;i++)assert.equal((await h.request('POST','/api/komari-passkey/authentication/options',undefined,false,'192.0.2.'+i)).status,200);
 assert.equal((await h.request('POST','/api/komari-passkey/authentication/options',undefined,false,'198.51.100.99')).status,429);
 assert.equal(h.getFile('passkeys.json').challenges.length,120);
});
test('bounds persistent challenges after reload and preserves credential data',async()=>{
 const pending=Array.from({length:128},(_,i)=>({id:'pending-'+i,purpose:'authentication',challenge:'local',userUUID:'test-user',expiresAt:new Date(Date.now()+120000).toISOString()}));
 const h=await setup(pending);
 assert.equal((await h.request('POST','/api/komari-passkey/authentication/options')).status,429);
 assert.deepEqual(h.getFile('passkeys.json').credentials,[credential]);
 h.advance(120001);assert.equal((await h.request('POST','/api/komari-passkey/authentication/options')).status,200);
 assert.equal(h.getFile('passkeys.json').challenges.length,1);
});
test('invalid verify requests are rate limited as well as challenge generation',async()=>{
 const h=await setup();for(let i=0;i<20;i++)assert.equal((await h.request('POST','/api/komari-passkey/authentication/verify',{})).status,400);
 assert.equal((await h.request('POST','/api/komari-passkey/authentication/verify',{})).status,429);
});
test('credential management remains inaccessible to anonymous callers',async()=>{
 const h=await setup();for(const [method,url]of[['GET','credentials'],['POST','registration/options'],['POST','registration/verify'],['POST','credentials/delete']])assert.equal((await h.request(method,'/api/komari-passkey/'+url,{})).status,401);
});
test('existing ES256 credential logs in with native secure session; replay denied',async()=>{
 const h=await setup();const begin=await h.request('POST','/api/komari-passkey/authentication/options');
 const body={challenge_id:begin.data.challenge_id,response:assertion(begin.data.options.challenge)};
 const login=await h.request('POST','/api/komari-passkey/authentication/verify',body);
 assert.equal(login.status,200);assert.equal(login.data.logged_in,true);
 assert.match(login.headers['Set-Cookie'],/HttpOnly/);assert.match(login.headers['Set-Cookie'],/Secure/);assert.match(login.headers['Set-Cookie'],/SameSite=Strict/);
 assert.equal(h.calls.filter(x=>x.method==='admin:dbExec').length,1);
 assert.equal(h.getFile('passkeys.json').credentials[0].counter,1);
 assert.equal((await h.request('POST','/api/komari-passkey/authentication/verify',body)).status,400);
});
test('rejects wrong signature, origin, RP ID, UV, counter and expired challenges',async()=>{
 for(const overrides of[{badSignature:true},{origin:'https://attacker.test'},{rpID:'attacker.test'},{flags:1},{counter:0},{flags:29}]){
  const h=await setup();if('counter'in overrides){const s=h.getFile('passkeys.json');s.credentials[0].counter=2;h.setFile('passkeys.json',s);}
  const begin=await h.request('POST','/api/komari-passkey/authentication/options');
  const result=await h.request('POST','/api/komari-passkey/authentication/verify',{challenge_id:begin.data.challenge_id,response:assertion(begin.data.options.challenge,overrides)});
  assert.equal(result.status,400,JSON.stringify(overrides));assert.equal(h.calls.filter(x=>x.method==='admin:dbExec').length,0);
 }
 const h=await setup();const begin=await h.request('POST','/api/komari-passkey/authentication/options');h.advance(120001);
 assert.equal((await h.request('POST','/api/komari-passkey/authentication/verify',{challenge_id:begin.data.challenge_id,response:assertion(begin.data.options.challenge)})).status,400);
});
