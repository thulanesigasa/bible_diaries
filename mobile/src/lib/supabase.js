import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform,AppState} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {createSecureStorage} from './secure-storage.mjs';
import {createBrowserSessionStorage} from '../../../shared/browser-session.mjs';
import {withContentWrites} from './content-client.mjs';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://fspfwidfdnqvpgmipate.supabase.co';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzcGZ3aWRmZG5xdnBnbWlwYXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMDYzOTYsImV4cCI6MjA5OTU4MjM5Nn0.tqA4ABfDhZP_PdH2Wv-FrQWzFGfG8vgaTnyZKwFMtHM';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Warning: Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.');
}

const webMemory=new Map();
const cookieBridge=typeof window!=='undefined'&&Platform.OS==='web'&&process.env.EXPO_PUBLIC_BROWSER_SESSION_BRIDGE==='1';
const memoryStorage={
 getItem:async k=>webMemory.get(k)||null,
 setItem:async(k,v)=>{webMemory.set(k,v);},
 removeItem:async k=>{webMemory.delete(k);}
};
const storage=Platform.OS==='web'?(cookieBridge?createBrowserSessionStorage():memoryStorage):createSecureStorage(SecureStore,AsyncStorage);
const client=createClient(supabaseUrl,supabaseAnonKey,{auth:{storage,autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});
export async function invokeDiaryFunction(name, body) {
 if(cookieBridge){
  const path=name==='secure-content'?'/api/content':name==='delete-account'?'/api/account-delete':null;
  if(!path)return {error:{message:'This operation is unavailable.'}};
  try{const {data:{session}}=await client.auth.getSession();const response=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json',authorization:`Bearer ${session?.access_token||''}`},body:JSON.stringify(body)});const result=await response.json();return response.ok?{data:result}:{error:{message:result.error||'Could not complete this request.',code:result.code,submission_id:result.submission_id,context:{json:async()=>result}}};}catch{return {error:{message:'The service is unavailable. Please try again.'}};}
 }
 return client.functions.invoke(name,{body});
}
export const supabase=withContentWrites(client,async body=>{
 const {data,error}=await invokeDiaryFunction('secure-content',body);
 if(error){let payload={};try{payload=await error.context.json();}catch{}return {error:{message:payload.error||error.message||'Could not save content.',code:payload.code||error.code,submission_id:payload.submission_id||error.submission_id}};}
 return {data:data.data};
});
if(Platform.OS!=='web')AppState.addEventListener('change',state=>{if(state==='active')client.auth.startAutoRefresh();else client.auth.stopAutoRefresh();});
export default supabase;
