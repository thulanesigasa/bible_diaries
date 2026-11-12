import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {AppState,DeviceEventEmitter,View,Text,TouchableOpacity,StyleSheet} from 'react-native';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Bell,X} from 'lucide-react-native';
import {useApp} from '../app/_layout';
import {useMemberAccess} from './EligibilityGate';
import {createActivityMonitor,notificationText} from '../../shared/activity-monitor.mjs';
import {DEFAULT_SETTINGS,isQuietTime} from '../../shared/diary-settings.mjs';
const empty={count:0,error:false,refresh:()=>{}};
const ActivityContext=createContext(empty);
export const useActivityNotifications=()=>useContext(ActivityContext);
export default function ActivityNotifications({children}:{children:React.ReactNode}){
 const {user,supabase,accent}=useApp(),allowed=useMemberAccess(),router=useRouter(),insets=useSafeAreaInsets();
 const [foreground,setForeground]=useState(AppState.currentState!=='background'&&AppState.currentState!=='inactive');
 const [snapshot,setSnapshot]=useState<any>({owner:'',unread:0,settings:DEFAULT_SETTINGS}),[error,setError]=useState(false),[notice,setNotice]=useState<any>(null),[clock,setClock]=useState(new Date());
 const refresh=useRef<()=>void>(()=>{});
 useEffect(()=>{const s=AppState.addEventListener('change',state=>setForeground(state==='active'));return()=>s.remove();},[]);
 useEffect(()=>{
  setSnapshot({owner:'',unread:0,settings:DEFAULT_SETTINGS});setNotice(null);setError(false);
  if(!user?.id||!allowed||!foreground)return;
  let active=true,channel:any,timer:ReturnType<typeof setTimeout>|undefined;
  const monitor=createActivityMonitor({
   read:async()=>{const r=await supabase.rpc('diary_notification_snapshot');if(r.error)throw r.error;return r.data;},
   onSnapshot:(data:any)=>{if(!active)return;setSnapshot({...data,owner:user.id});setError(false);setClock(new Date());if(data.changed)DeviceEventEmitter.emit('diary-activity-changed',{userId:user.id});},
   onNotice:(rows:any[])=>{if(!active)return;setNotice({owner:user.id,text:rows.length===1?notificationText(rows[0]):`${rows.length} new activity updates.`,key:Date.now()});},
   onError:()=>{if(active)setError(true);}
  });
  refresh.current=()=>{void monitor.refresh();};void monitor.refresh();
  // Debounce broadcast bursts; keep a low-frequency fallback when sockets disconnect.
  const signal=()=>{if(timer)clearTimeout(timer);timer=setTimeout(()=>void monitor.refresh(),150);};
  void supabase.realtime.setAuth().then(()=>{if(!active)return;channel=supabase.channel(`diary-activity:${user.id}`,{config:{private:true}}).on('broadcast',{event:'activity'},signal).subscribe((status:string)=>{if(status==='SUBSCRIBED')signal();});}).catch(()=>{});
  const poll=setInterval(()=>void monitor.refresh(),120000),tick=setInterval(()=>setClock(new Date()),30000);
  const read=DeviceEventEmitter.addListener('diary-activity-read',(e:any)=>{if(e.userId===user.id)signal();});
  const prefs=DeviceEventEmitter.addListener('diary-settings-changed',(e:any)=>{if(e.userId===user.id)signal();});
  return()=>{active=false;monitor.stop();refresh.current=()=>{};clearInterval(poll);clearInterval(tick);if(timer)clearTimeout(timer);read.remove();prefs.remove();if(channel)void supabase.removeChannel(channel);};
 },[user?.id,allowed,foreground,supabase]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),7000);return()=>clearTimeout(timer);},[notice?.key]);
 const current=allowed&&foreground&&snapshot.owner===user?.id;
 const quiet=isQuietTime(snapshot.settings,clock);
 const count=current&&!quiet?Math.max(0,Number(snapshot.unread)||0):0;
 return <ActivityContext.Provider value={{count,error:current&&error,refresh:()=>refresh.current()}}><View style={{flex:1}}>{children}
  {current&&!quiet&&notice?.owner===user?.id&&<View accessibilityLiveRegion="polite" style={[s.banner,{top:insets.top+64,borderLeftColor:accent}]}><Bell size={21} color={accent}/><TouchableOpacity accessibilityRole="button" accessibilityLabel={`${notice.text} Open Activity and Notifications`} style={s.copy} onPress={()=>{setNotice(null);router.push('/activity');}}><Text style={s.title}>Bible Diaries</Text><Text style={s.body}>{notice.text}</Text><Text style={[s.open,{color:accent}]}>View activity →</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="Dismiss notification" style={s.dismiss} onPress={()=>setNotice(null)}><X size={18} color="#64748b"/></TouchableOpacity></View>}
 </View></ActivityContext.Provider>;
}
const s=StyleSheet.create({banner:{position:'absolute',left:18,right:18,zIndex:9998,backgroundColor:'white',borderWidth:1,borderColor:'#dce6ee',borderLeftWidth:3,padding:16,flexDirection:'row',alignItems:'flex-start',gap:12,shadowColor:'#172033',shadowOpacity:.12,shadowRadius:18,elevation:8},copy:{flex:1,gap:4},title:{fontSize:12,fontWeight:'700',color:'#172033'},body:{fontSize:14,lineHeight:21,color:'#475569'},open:{fontSize:12,fontWeight:'600',marginTop:3},dismiss:{minHeight:36,minWidth:36,alignItems:'center',justifyContent:'center'}});
