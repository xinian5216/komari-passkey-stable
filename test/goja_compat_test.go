package jsruntime

import (
 "io"
 "os"
 "path/filepath"
 "testing"
 "time"

 "github.com/dop251/goja"
 "github.com/dop251/goja_nodejs/require"
)

// Run this test inside the pinned Komari Stable pkg/jsruntime package.
// Actual Goja crypto, filesystem confinement and CommonJS loading are used;
// only the server RPC boundary and Cloudflare responses are simulated.
func TestMaintainedPlugin(t *testing.T) {
 root := os.Getenv("KOMARI_PLUGIN_TEST_ROOT")
 if root == "" { t.Fatal("KOMARI_PLUGIN_TEST_ROOT is required") }
 root, err := filepath.Abs(root); if err != nil { t.Fatal(err) }
 entry, err := os.ReadFile(filepath.Join(root,"script.js")); if err != nil { t.Fatal(err) }
 checks, err := os.ReadFile(filepath.Join(root,"test","goja-checks.js")); if err != nil { t.Fatal(err) }
 bootstrap := `
 const __testRoutes = {}; let __testStatus = true; let __externalCalls = 0; let __sessions = 0;
 const __testServer = {
  getConfig: async () => ({rp_id:'example.test',origins:'https://example.test',api_token:'synthetic-token',interval:5}),
  route: (method,path,handler) => { __testRoutes[method+' '+path]=handler; },
  injectHTML: () => {}, cron: () => {},
  call: async (method,args) => {
   if(method==='admin:dbQuery')return {rows:[['test-user','Audit']],row_count:1};
   if(method==='admin:dbExec'){ __sessions++; return {}; }
   if(method==='admin:getSettings')return {};
   if(method==='common:getNodes')return {node:{name:'Audit',ipv4:'203.0.113.17'}};
   if(method==='common:getNodesLatestStatus'){ if(__testStatus===null)throw Error('Unavailable');return __testStatus?{node:{online:true}}:{}; }
   throw Error('Unexpected RPC '+method);
  }
 };
 globalThis.fetch=async (url,init)=>{__externalCalls++;return {json:async()=>({success:true,result:init&&init.method==='PUT'?{}:[{id:'record',content:'198.51.100.3',proxied:false}]})};};
 async function __request(method,url,body,admin) {
  const req={method,url,headers:{origin:'https://example.test'},query:{},body:body?JSON.stringify(body):'',context:{principal:admin?{type:'user',user_uuid:'test-user',roles:['admin']}:{type:'anonymous',roles:[]},remote_ip:'127.0.0.1',user_agent:'local-test'}};
  let data;const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){data=v;}};
  await __testRoutes[method+' '+url](req,res);
  try{data=JSON.parse(data);}catch{}
  return {status:res.statusCode,data,headers:res.headers};
 }
 function __assert(value,message){if(!value)throw Error(message);}
 `
 runtime, err := New(bootstrap+string(entry)+string(checks), Options{
  NodeJS:true, BaseDir:root, StorageDir:t.TempDir(), Timeout:15*time.Second, Console:io.Discard,
  ConfigureRequire:func(registry *require.Registry){
   registry.RegisterNativeModule("server",func(vm *goja.Runtime,module *goja.Object){
    value, err := vm.RunString("__testServer");if err!=nil{panic(err)}
    if err:=module.Set("exports",value);err!=nil{panic(err)}
   })
  },
 })
 if err != nil { t.Fatal(err) }; defer runtime.Close()
 if err:=runtime.Call("__runMaintainedPluginChecks");err!=nil{t.Fatal(err)}
}
