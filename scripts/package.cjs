const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const archiver = require('archiver');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'komari-plugin.json')));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
if (manifest.version !== pkg.version) throw Error('Manifest/package versions differ');
if (!['cf-ddns','komari-passkey'].includes(manifest.short)) throw Error('Unexpected plugin identity');
const files = ['komari-plugin.json', 'script.js', 'UPSTREAM.md'];
if (manifest.short === 'cf-ddns') files.push('admin.html', 'LICENSE');
else files.push('runtime/webauthn-core.cjs','assets/passkey-ui.js','assets/passkey-ui.css','assets/passkey-icon.svg','UPSTREAM_LICENSE_STATUS.md');
// Include the available license texts for all production dependencies.
const lock = JSON.parse(fs.readFileSync(path.join(root,'package-lock.json')));
let notices = '';
for (const [location, info] of Object.entries(lock.packages).sort()) {
  if (!location.startsWith('node_modules/') || info.dev) continue;
  const dir = path.join(root,location);
  for (const name of fs.readdirSync(dir).sort()) {
    if (!/^(licen[cs]e|copying|notice)(\.|$)/i.test(name)) continue;
    const file = path.join(dir,name);
    if (fs.statSync(file).isFile()) notices += `\n===== ${location} ${info.version}: ${name} =====\n${fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')}\n`;
  }
}
if (!notices) throw Error('No dependency license texts found');
const output=path.join(root,'dist'); fs.mkdirSync(output,{recursive:true});
const name=`${manifest.short}-${manifest.version}.zip`;
const target=path.join(output,name);
const stream=fs.createWriteStream(target);
const zip=archiver('zip',{zlib:{level:9},forceLocalTime:false});
const fixed={date:new Date('1980-01-01T00:00:00Z'),mode:0o100644};
stream.on('close',()=>{
 const sha=crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
 fs.writeFileSync(path.join(output,'SHA256SUMS'),`${sha}  ${name}\n`);
 fs.writeFileSync(path.join(output,'catalog-entry.json'),JSON.stringify({name:manifest.name,short:manifest.short,description:manifest.description,author:manifest.author,version:manifest.version,komari:manifest.komari,url:`https://github.com/xinian5216/${manifest.short==='cf-ddns'?'komari-ddns-stable':'komari-passkey-stable'}`,download:`https://github.com/xinian5216/${manifest.short==='cf-ddns'?'komari-ddns-stable':'komari-passkey-stable'}/releases/download/v${manifest.version}/${name}`,sha256:sha},null,2)+'\n');
 console.log(`Built ${name}; SHA-256 ${sha}`);
});
zip.on('warning',error=>{throw error;}); zip.on('error',error=>{throw error;}); stream.on('error',error=>{throw error;});
zip.pipe(stream);
for(const file of files.sort()) {
 const full=path.join(root,file); if(!fs.lstatSync(full).isFile()) throw Error('Non-regular package file');
 zip.append(fs.readFileSync(full,'utf8').replace(/\r\n/g,'\n'),{name:file,...fixed});
}
zip.append(notices,{name:'THIRD_PARTY_LICENSES.txt',...fixed});
zip.finalize();
