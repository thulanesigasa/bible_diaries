import {createClient} from '@supabase/supabase-js';
import {withContentWrites} from '../../shared/content-client.mjs';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const storage={
 async getItem(key){if(typeof window==='undefined')return null;try{window.localStorage.removeItem(key);}catch{}const r=await fetch('/api/session',{cache:'no-store'});if(r.status===401)return null;if(!r.ok)throw new Error('Could not restore session.');return JSON.stringify(await r.json());},
 async setItem(_key,value){if(typeof window==='undefined')return;const session=JSON.parse(value);const r=await fetch('/api/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({access_token:session.access_token,refresh_token:session.refresh_token})});if(!r.ok)throw new Error('Could not securely save session.');},
 async removeItem(){if(typeof window==='undefined')return;const r=await fetch('/api/session',{method:'DELETE'});if(!r.ok)throw new Error('Could not clear session.');}
};
// Code verifiers are short-lived, in memory; they are never session cookies.
const verifiers=new Map();
const authStorage={getItem:k=>k.endsWith('-code-verifier')?Promise.resolve(verifiers.get(k)||null):storage.getItem(k),setItem:(k,v)=>k.endsWith('-code-verifier')?Promise.resolve(verifiers.set(k,v)):storage.setItem(k,v),removeItem:k=>k.endsWith('-code-verifier')?Promise.resolve(verifiers.delete(k)):storage.removeItem()};
const client=createClient(url,key,{auth:{storage:authStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
export const supabase=withContentWrites(client,async body=>{
 const {data:{session}}=await client.auth.getSession();
 const r=await fetch('/api/content',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${session?.access_token||''}`},body:JSON.stringify(body)});
 const data=await r.json();return r.ok?{data:data.data}:{error:{message:data.error||'Could not save content.'}};
});
export default supabase;
