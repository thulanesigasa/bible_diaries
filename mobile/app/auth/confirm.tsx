import React,{useEffect,useRef,useState} from 'react';
import {View,Text,TouchableOpacity,StyleSheet,Platform,ActivityIndicator} from 'react-native';
import * as Linking from 'expo-linking';
import {useRouter} from 'expo-router';
import {supabase} from '../../src/lib/supabase';
import {confirmEmailReturn,NATIVE_AUTH_RETURN} from '../../../shared/auth-return.mjs';
export default function EmailConfirmation(){
 const router=useRouter(),[status,setStatus]=useState('checking'),[nativeLink,setNativeLink]=useState(''),processing=useRef(false);
 useEffect(()=>{
  let active=true;
  async function receive(raw:string|null){
   if(!raw||processing.current)return;processing.current=true;
   const origin=Platform.OS==='web'?(globalThis as any).location?.origin:undefined;
   const mobile=Platform.OS==='web'&&new URL(raw).searchParams.get('client')==='mobile';
   // Remove credentials from browser history before any other navigation.
   if(Platform.OS==='web')(globalThis as any).history?.replaceState(null,'','/auth/confirm'+(mobile?'?client=mobile':''));
   try{
    const result=await confirmEmailReturn(supabase,raw,{webOrigin:origin,configured:process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL});
    if(!active)return;
    setStatus('verified');
    if(mobile){const p=new URLSearchParams({...result.tokens,type:'signup'});setNativeLink(NATIVE_AUTH_RETURN+'#'+p.toString());}
    else router.replace('/(tabs)');
   }catch{if(active)setStatus('invalid');}finally{processing.current=false;}
  }
  if(Platform.OS==='web')void receive((globalThis as any).location?.href);
  else void Linking.getInitialURL().then(receive);
  const sub=Linking.addEventListener('url',({url})=>void receive(url));
  return()=>{active=false;sub.remove();};
 },[]);
 return <View style={s.page}>{status==='checking'?<><ActivityIndicator color="#0ea5e9"/><Text style={s.title}>Verifying your account…</Text></>:<><Text accessibilityRole="header" style={s.title}>{status==='verified'?'Account verified':'Verification link unavailable'}</Text><Text style={s.copy}>{status==='verified'?'Your email address is verified. You can now log into Bible Diaries.':'This link may have expired or already been used. If you have verified your email, sign in. Otherwise request a new verification link from signup.'}</Text>{nativeLink&&<TouchableOpacity accessibilityRole="button" style={s.button} onPress={()=>Linking.openURL(nativeLink).catch(()=>{})}><Text style={s.buttonText}>Open Bible Diaries app</Text></TouchableOpacity>}<TouchableOpacity accessibilityRole="button" style={s.button} onPress={()=>router.replace(status==='verified'?'/(tabs)':'/(auth)/login')}><Text style={s.buttonText}>{status==='verified'?'Continue in browser':'Go to sign in'}</Text></TouchableOpacity></>}</View>;
}
const s=StyleSheet.create({page:{flex:1,justifyContent:'center',padding:28,gap:20,backgroundColor:'white'},title:{fontSize:23,fontWeight:'700',color:'#172033'},copy:{fontSize:15,lineHeight:24,color:'#475569'},button:{minHeight:50,padding:15,borderRadius:12,backgroundColor:'#0ea5e9',alignItems:'center'},buttonText:{color:'white',fontWeight:'600'}});
