import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {CATEGORIES,decideModeration,childSafetyIntake,POLICY_VERSION} from '../supabase/functions/_shared/moderation-policy.mjs';
export const split=id=>parseInt(createHash('sha256').update('bd-v2-split:'+id).digest('hex').slice(0,8),16)%5===0?'held_out':'development';
export function mockSignal(text){
 // Synthetic API fixture based only on text. Never inspect expected labels.
 const t=text.toLowerCase(),categories=Object.fromEntries(CATEGORIES.map(k=>[k,false]));
 if(/\b(?:hurt myself|self-harm|not want to be alive|don't want to be alive)\b/.test(t))categories['self-harm']=true;
 if(/\b(?:i will|i'll|i am going to)\b.{0,90}\b(?:attack|assault|hurt|beat|injure|ambush)\b/.test(t))categories['harassment/threatening']=true;
 if(/\b(?:ethnic|ethnicity|nationality|race|disabilities)\b/.test(t)&&/\b(?:violence|assault|abuse|threat|harass|bullied|driven out|targeted)\b/.test(t))categories.hate=true;
 if(/\b(?:pathetic|worthless|loser|stupid|dumb|ridicule|humiliate|mock|laughable|disgrace)\b/.test(t))categories.harassment=true;
 return {flagged:Object.values(categories).some(Boolean),categories,category_scores:Object.fromEntries(CATEGORIES.map(k=>[k,categories[k]?0.93:0.001])),category_applied_input_types:Object.fromEntries(CATEGORIES.map(k=>[k,['text']]))};
}
export function metrics(rows){
 const classes=['ALLOW','REVIEW','REJECT'],matrix=Object.fromEntries(classes.map(a=>[a,Object.fromEntries(classes.map(b=>[b,0]))]));
 for(const r of rows)matrix[r.expected][r.actual]++;
 const perClass={};for(const k of classes){const tp=matrix[k][k],pred=classes.reduce((n,c)=>n+matrix[c][k],0),truth=classes.reduce((n,c)=>n+matrix[k][c],0),precision=pred?tp/pred:0,recall=truth?tp/truth:0;perClass[k]={precision,recall,f1:precision+recall?2*precision*recall/(precision+recall):0,support:truth};}
 const safe=rows.filter(r=>r.expected==='ALLOW'),unsafe=rows.filter(r=>r.expected!=='ALLOW');
 return {count:rows.length,confusion_matrix:matrix,per_class:perClass,false_positive_rate:safe.length?safe.filter(r=>r.actual!=='ALLOW').length/safe.length:0,false_negative_rate:unsafe.length?unsafe.filter(r=>r.actual==='ALLOW').length/unsafe.length:0,mismatches:rows.filter(r=>r.expected!==r.actual)};
}
export async function evaluate({live=false}={}){
 const dataset=JSON.parse(await readFile(new URL('./examples.json',import.meta.url),'utf8')),rows=[],models=new Set();
 if(live&&!process.env.OPENAI_API_KEY)throw Error('Set OPENAI_API_KEY server-side for opt-in live evaluation.');
 for(const e of dataset.examples){let result;
  if(childSafetyIntake(e.text))result={outcome:'REJECT',reason:'child_safety'};
  else {let signal=mockSignal(e.text);if(live){const r=await fetch('https://api.openai.com/v1/moderations',{method:'POST',headers:{authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:'omni-moderation-latest',input:e.text}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(`Live moderation failed (${r.status}); no success report written.`);const payload=await r.json();models.add(payload.model||'unknown');signal=payload.results?.[0];}result=decideModeration(e.text,signal);}
  rows.push({id:e.id,split:split(e.id),category:e.category,expected:e.expected_decision.toUpperCase(),actual:result.outcome,reason:result.reason});
 }
 return {policy_version:POLICY_VERSION,model_versions:[...models],mode:live?'live_api':'synthetic_mock',notice:'Illustrative labels require human validation. Mock metrics test policy behavior and do not measure OpenAI or production accuracy. No score thresholds were fitted; numeric calibration requires actual model responses. The held-out split is for future validation; these supplied examples were visible during requirements review.',development:metrics(rows.filter(r=>r.split==='development')),held_out:metrics(rows.filter(r=>r.split==='held_out')),all:metrics(rows)};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){const result=await evaluate({live:process.env.MODERATION_LIVE==='1'});const path=process.argv[2]||'moderation/evaluation-report.json';await writeFile(path,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({mode:result.mode,count:result.all.count,mismatches:result.all.mismatches.length,report:path}));}
