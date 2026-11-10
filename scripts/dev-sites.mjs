// Cross-platform launcher: no shell-specific VAR=value syntax is required.
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
try{process.loadEnvFile(join(root,'.env.local'));}catch{}
const requested=process.argv[2]||'all';
if(!['all','main','app','waiting','admin'].includes(requested))throw Error('Choose main, app, waiting, admin, or all.');
const origins={main:'http://localhost:3000',waiting:'http://localhost:3001',admin:'http://localhost:3002',app:'http://localhost:3003'};
const children=[];
for(const role of requested==='all'?Object.keys(origins):[requested]){
 const marketing=['waiting','admin'].includes(role),cwd=marketing?join(root,'web'):root;
 const env={...process.env,MAIN_SITE_URL:origins.main,APP_SITE_URL:origins.app,WAITLIST_URL:origins.waiting,ADMIN_SITE_URL:origins.admin,APP_ORIGIN:origins[role],SITE_URL:origins[role],SITE_ROLE:role==='waiting'?'waitlist':role,APP_SITE_ROLE:role,APP_BUILD_DIR:'.next-'+role+'-dev',NEXT_TELEMETRY_DISABLED:'1'};
 // The two marketing processes also need isolated output directories.
 if(marketing)env.SITE_BUILD_DIR='.next-'+role+'-dev';
 const child=spawn(process.execPath,[join(cwd,'node_modules/next/dist/bin/next'),'dev','--webpack','-p',new URL(origins[role]).port],{cwd,env,stdio:'inherit'});children.push(child);
 child.on('error',()=>stop(1));child.on('exit',code=>{if(code)stop(code);});console.log(role+': '+origins[role]);
}
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');setTimeout(()=>process.exit(code),400).unref();}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
