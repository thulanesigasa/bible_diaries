import {spawn} from 'node:child_process';
import {rm,mkdir,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
try{process.loadEnvFile(join(root,'.env.local'));}catch(error){if(error.code!=='ENOENT')throw Error('Could not read .env.local. Check its format.');}
const output=join(root,'.browser-ui'),assets=join(root,'public/_app');
await rm(output,{recursive:true,force:true});await rm(assets,{recursive:true,force:true});await mkdir(output,{recursive:true});await mkdir(assets,{recursive:true});
const cli=join(root,'mobile/node_modules/expo/bin/cli');
const child=spawn(process.execPath,[cli,'export','--platform','web','--output-dir',output],{cwd:join(root,'mobile'),stdio:'inherit',env:{...process.env,EXPO_PUBLIC_SUPABASE_URL:process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.EXPO_PUBLIC_SUPABASE_URL,EXPO_PUBLIC_SUPABASE_ANON_KEY:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,EXPO_PUBLIC_BROWSER_SESSION_BRIDGE:'1'}});
const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
if(code!==0)process.exit(code||1);
for(const name of ['_expo','assets'])await cp(join(output,name),join(assets,name),{recursive:true});
