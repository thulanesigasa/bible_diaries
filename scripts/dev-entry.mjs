// Accept the managed preview's host/port flags as well as ordinary npm dev.
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const input=process.argv.slice(2),args=['dev','--webpack'];
for(let i=0;i<input.length;i++){
 if(input[i]==='--strictPort')continue;
 if(input[i]==='--host'){args.push('--hostname',input[++i]);continue;}
 args.push(input[i]);
}
const child=spawn(process.execPath,[fileURLToPath(new URL('../node_modules/next/dist/bin/next',import.meta.url)),...args],{stdio:'inherit',env:process.env});
child.on('error',()=>process.exit(1));child.on('exit',code=>{process.exitCode=code||0;});for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
