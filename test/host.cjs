const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const quiet = {log(){},warn(){},error(){}};
module.exports = function host(options={}) {
 const directory = options.directory || path.resolve(__dirname,'..');
 const storage = path.join(directory,'virtual-test-storage');
 const files = new Map(); const routes = new Map(); const calls = []; const external=[];
 let now = Date.now();
 const fakefs={existsSync:p=>files.has(p),readFileSync:(p,encoding)=>p.startsWith(storage)?files.get(p):fs.readFileSync(p,encoding),writeFileSync:(p,v)=>files.set(p,String(v)),renameSync:(a,b)=>{files.set(b,files.get(a));files.delete(a);},unlinkSync:p=>files.delete(p)};
 const server={getConfig:async()=>options.config||{},route:(m,p,h)=>routes.set(m+' '+p,h),injectHTML(){},cron(){},call:async(method,args)=>{
  calls.push({method,args});
  if(method==='admin:dbQuery')return {rows:[['test-user','Audit']],row_count:1};
  if(method==='admin:dbExec')return {};
  if(method==='admin:getSettings')return {};
  if(method==='common:getNodes')return {node:{name:'Test',ipv4:'203.0.113.17',ipv6:'2001:db8::17'}};
  if(method==='common:getNodesLatestStatus'){
   if(options.statusError)throw Error('simulated unavailable status');
   return options.statuses===undefined?{node:{online:true}}:options.statuses;
  }
  throw Error('Unexpected RPC '+method);
 }};
 const runtimeModule={exports:{}};
 const runtime=path.join(directory,'runtime/webauthn-core.cjs');
 if(fs.existsSync(runtime)){
  const coreContext=vm.createContext({console:quiet,module:runtimeModule,exports:runtimeModule.exports,require,process,Buffer,TextEncoder,TextDecoder,URL,crypto:crypto.webcrypto,setTimeout,clearTimeout});
  vm.runInContext(fs.readFileSync(runtime,'utf8'),coreContext,{timeout:5000});
 }
 const context=vm.createContext({console:quiet,__dirname:directory,__storageDir__:storage,
  Date:class extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}},
  fetch:async(url,init={})=>{external.push({url,method:init.method||'GET',body:init.body});return {json:async()=>({success:true,result:init.method==='PUT'?{}:[{id:'record',content:'198.51.100.3',proxied:false}]})};},
  require:name=>{
   if(name==='server')return server;
   if(name==='fs'||name==='node:fs')return fakefs;
   if(name==='path'||name==='node:path')return path;
   if(name==='node:url')return {URL};
   if(name===runtime)return runtimeModule.exports;
   throw Error('Unexpected module '+name);
  }
 });
 vm.runInContext(fs.readFileSync(path.join(directory,'script.js'),'utf8'),context,{timeout:5000});
 async function request(method,url,body,admin=false,ip='127.0.0.1'){
  const req={method,url,headers:{origin:'https://example.test'},query:{},body:body===undefined?'':JSON.stringify(body),context:{principal:admin?{type:'user',user_uuid:'test-user',roles:['admin']}:{type:'anonymous',roles:[]},remote_ip:ip,user_agent:'local-test'}};
  let data; const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){data=v;}};
  const handler=routes.get(method+' '+url.split('?')[0]);if(!handler)throw Error('Route not registered: '+url);
  await handler(req,res);try{data=JSON.parse(data);}catch{}
  return {status:res.statusCode,data,headers:res.headers};
 }
 return {files,routes,calls,external,storage,request,core:runtimeModule.exports,load:()=>context.load(),advance:ms=>{now+=ms;},setFile:(name,value)=>files.set(path.join(storage,name),JSON.stringify(value)),getFile:name=>JSON.parse(files.get(path.join(storage,name)))};
};
