import React,{useEffect,useRef,useState} from 'react';
import {AppState,Linking,Modal,Platform,Text,TouchableOpacity,View,StyleSheet} from 'react-native';
import Constants from 'expo-constants';
import {storeRelease} from '../../shared/store-release.mjs';
export default function StoreUpdateNotice({onVisible}:{onVisible:(value:boolean)=>void}){
 const [release,setRelease]=useState<any>(null),last=useRef(0),dismissed=useRef('');
 useEffect(()=>{
  if(Platform.OS==='web'||__DEV__)return;
  let active=true;
  async function check(){
   if(Date.now()-last.current<900000)return;last.current=Date.now();
   try{const address=process.env.EXPO_PUBLIC_RELEASE_MANIFEST_URL;if(!address||new URL(address).protocol!=='https:')return;
    const response=await fetch(address,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)return;
    const build=Platform.OS==='android'?Constants.platform?.android?.versionCode:Number(Constants.platform?.ios?.buildNumber);
    const found=storeRelease(await response.json(),Platform.OS,build);
    if(active&&found&&dismissed.current!==found.version){setRelease(found);onVisible(true);}
   }catch{/* A missing store listing never interrupts use of the installed app. */}
  }
  void check();const sub=AppState.addEventListener('change',s=>{if(s==='active')void check();});
  return()=>{active=false;sub.remove();};
 },[]);
 function dismiss(){dismissed.current=release?.version||'';setRelease(null);onVisible(false);}
 return <Modal visible={!!release} transparent animationType="fade" onRequestClose={dismiss}><View style={s.backdrop}><View style={s.panel}><Text style={s.title}>A new app version is available</Text><Text style={s.copy}>Bible Diaries {release?.version} includes changes that need a store update. Your installed app will remain available while you update.</Text>{release?.stores.map((store:any)=><TouchableOpacity accessibilityRole="button" key={store.url} style={s.button} onPress={()=>Linking.openURL(store.url).catch(()=>{})}><Text style={s.buttonText}>Open {store.label}</Text></TouchableOpacity>)}<TouchableOpacity accessibilityRole="button" style={s.later} onPress={dismiss}><Text>Later</Text></TouchableOpacity></View></View></Modal>;
}
const s=StyleSheet.create({backdrop:{flex:1,backgroundColor:'rgba(15,23,42,.5)',justifyContent:'center',padding:24},panel:{backgroundColor:'white',padding:24,borderRadius:16,gap:18},title:{fontSize:21,fontWeight:'700',color:'#172033'},copy:{fontSize:14,lineHeight:22,color:'#475569'},button:{backgroundColor:'#0ea5e9',padding:15,borderRadius:12,alignItems:'center'},buttonText:{color:'white',fontWeight:'600'},later:{padding:12,alignItems:'center'}});
