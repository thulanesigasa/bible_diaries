import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform,AppState} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {createSecureStorage} from './secure-storage.mjs';
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
const storage=Platform.OS==='web'?{
 getItem:async k=>webMemory.get(k)||null,
 setItem:async(k,v)=>{webMemory.set(k,v);},
 removeItem:async k=>{webMemory.delete(k);}
}:createSecureStorage(SecureStore,AsyncStorage);
const client=createClient(supabaseUrl,supabaseAnonKey,{auth:{storage,autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});
export const supabase=withContentWrites(client,async body=>{
 const {data,error}=await client.functions.invoke('secure-content',{body});
 if(error){let message='Could not save content.';try{message=(await error.context.json()).error||message;}catch{}return {error:{message}};}
 return {data:data.data};
});
if(Platform.OS!=='web')AppState.addEventListener('change',state=>{if(state==='active')client.auth.startAutoRefresh();else client.auth.stopAutoRefresh();});
export default supabase;
