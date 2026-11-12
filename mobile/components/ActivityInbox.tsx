import React, { useCallback, useRef, useState } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, DeviceEventEmitter } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Heart, MessageCircle, Bookmark, Share2, BookOpen, ShieldCheck, CheckCheck, Bell, ChevronRight } from 'lucide-react-native';
import { useApp } from '../app/_layout';
import Avatar from './Avatar';
import { ACTIVITY_LABELS } from '../../shared/diary-settings.mjs';
import { ACTIVITY_FILTERS, activityDay, mergeActivity } from '../../shared/activity-presentation.mjs';
import { moderationTitle } from '../../shared/moderation-notifications.mjs';
const icons:Record<string,any>={like:Heart,comment_like:Heart,comment:MessageCircle,reply:MessageCircle,bookmark:Bookmark,share:Share2,post:BookOpen};
export default function ActivityInbox() {
  const { user, supabase, accent }=useApp(),router=useRouter();
  const [rows,setRows]=useState<any[]>([]),[filter,setFilter]=useState('all'),[error,setError]=useState(''),[loading,setLoading]=useState(true),[more,setMore]=useState(false),[marking,setMarking]=useState(false);
  const generation=useRef(0),paging=useRef({community:0,system:0,communityMore:true,systemMore:true}),pending=useRef(false),items=useRef<any[]>([]);
  const load=useCallback(async(append=false)=>{
    if(!user)return;
    if(append&&pending.current)return;
    const version=++generation.current;pending.current=true;setLoading(true);setError('');
    const cursor=append?paging.current:{community:0,system:0,communityMore:true,systemMore:true};
    try{
      let community:any[]=[];let system:any[]=[];
      const requests=[];
      if(filter!=='system'&&cursor.communityMore){
        let q=supabase.from('diary_activity').select('id,actor_id,post_id,kind,created_at,read_at').eq('recipient_id',user.id).order('created_at',{ascending:false}).order('id',{ascending:false});
        if(filter==='like')q=q.in('kind',['like','comment_like']);else if(filter==='comment')q=q.in('kind',['comment','reply']);else if(filter!=='all')q=q.eq('kind',filter);
        requests.push(q.range(cursor.community,cursor.community+29).then((r:any)=>{if(r.error)throw r.error;community=r.data||[];}));
      }
      if((filter==='all'||filter==='system')&&cursor.systemMore)requests.push(supabase.from('moderation_notifications').select('id,outcome,target,content_id,reason,created_at,read_at').eq('user_id',user.id).order('created_at',{ascending:false}).order('id',{ascending:false}).range(cursor.system,cursor.system+29).then((r:any)=>{if(r.error)throw r.error;system=r.data||[];}));
      await Promise.all(requests);
      const actorIds=[...new Set(community.filter(x=>x.kind!=='bookmark').map(x=>x.actor_id).filter(Boolean))];let profiles:Record<string,any>={};
      if(actorIds.length){const p=await supabase.from('profiles').select('id,full_name,avatar_url').in('id',actorIds);profiles=Object.fromEntries((p.data||[]).map((x:any)=>[x.id,x]));}
      community=community.map(x=>({...x,name:x.kind==='bookmark'?'Someone':x.actor_id?profiles[x.actor_id]?.full_name||'A community member':'An anonymous member',avatar:x.kind==='bookmark'?null:profiles[x.actor_id]?.avatar_url}));
      if(version!==generation.current)return;
      const next=mergeActivity(community,system),merged=append?mergeActivity([...items.current.filter(x=>x.source==='community'),...next.filter(x=>x.source==='community')],[...items.current.filter(x=>x.source==='system'),...next.filter(x=>x.source==='system')]):next;
      items.current=merged;setRows(merged);
      paging.current={community:cursor.community+community.length,system:cursor.system+system.length,communityMore:filter!=='system'&&cursor.communityMore&&community.length===30,systemMore:(filter==='all'||filter==='system')&&cursor.systemMore&&system.length===30};
      setMore(paging.current.communityMore||paging.current.systemMore);
    }catch{if(version===generation.current)setError('Activity could not load. Pull down to retry.');}
    finally{if(version===generation.current){setLoading(false);pending.current=false;}}
  },[filter,user?.id,supabase]);
  useFocusEffect(useCallback(()=>{items.current=[];setRows([]);void load();const listener=DeviceEventEmitter.addListener('diary-activity-changed',(e:any)=>{if(e.userId===user?.id&&!pending.current)void load();});return()=>{generation.current++;pending.current=false;listener.remove();};},[load]));
  async function mark(item?:any){
    if(marking||!user)return false;setMarking(true);
    try{
      const at=new Date().toISOString(),sources=item?[item.source]:['community','system'];
      const results=await Promise.all(sources.map(source=>{let q=supabase.from(source==='system'?'moderation_notifications':'diary_activity').update({read_at:at}).eq(source==='system'?'user_id':'recipient_id',user.id);if(item)q=q.eq('id',item.id);else q=q.is('read_at',null);return q;}));
      if(results.some(r=>r.error))throw Error();
      const updated=items.current.map(x=>!item||x.key===item.key?{...x,read_at:at}:x);items.current=updated;setRows(updated);DeviceEventEmitter.emit('diary-activity-read',{userId:user.id});return true;
    }catch{await load();setError('Could not mark every notification as read. Refresh and retry.');return false;}finally{setMarking(false);}
  }
  const header=<View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{ACTIVITY_FILTERS.map(([key,label]:string[])=><TouchableOpacity key={key} accessibilityRole="button" accessibilityState={{selected:filter===key}} onPress={()=>setFilter(key)} style={[s.filter,filter===key&&{backgroundColor:accent}]}><Text style={{fontSize:12,fontWeight:'600',color:filter===key?'white':'#475569'}}>{label}</Text></TouchableOpacity>)}</ScrollView><View style={s.topline}><Text style={s.section}>Your activity</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Mark all notifications as read" disabled={marking} onPress={()=>mark()} style={s.readButton}><CheckCheck size={17} color={accent}/><Text style={{fontSize:12,color:accent}}>Mark all read</Text></TouchableOpacity></View>{!!error&&<Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}</View>;
  return <FlatList style={s.screen} contentContainerStyle={s.content} data={rows} keyExtractor={x=>x.key} ListHeaderComponent={header} refreshing={loading} onRefresh={()=>load()} ListEmptyComponent={!loading?<View style={s.empty}><Bell size={32} color="#9aaabd"/><Text style={s.emptyTitle}>You’re all caught up</Text><Text style={s.emptyHint}>{filter==='system'?'Review decisions will appear here.':'New interactions will appear here. Bookmark identities stay private.'}</Text></View>:<ActivityIndicator color={accent} style={{marginTop:40}}/>} renderItem={({item,index})=>{
    const system=item.source==='system',Icon=system?ShieldCheck:icons[item.kind]||Bell,day=activityDay(item.created_at),showDay=index===0||day!==activityDay(rows[index-1].created_at);
    return <View>{showDay&&<Text style={s.day}>{day}</Text>}<TouchableOpacity accessibilityRole="button" disabled={marking} style={[s.row,!item.read_at&&s.unread]} onPress={async()=>{if(await mark(item))router.push((system?item.outcome==='approved'&&item.target==='diaries'&&item.content_id?`/post/${item.content_id}`:'/reviews':`/post/${item.post_id}`) as any);}}>
      <View style={s.avatar}>{system||item.kind==='bookmark'?<View style={s.systemIcon}><Icon size={23} color={accent}/></View>:<><Avatar size={44} src={item.avatar} fullName={item.name}/><View style={s.badge}><Icon size={11} color={item.kind==='like'||item.kind==='comment_like'?'#eb6393':accent}/></View></>}</View>
      <View style={s.copy}>{system?<><Text style={s.label}>{moderationTitle(item)}</Text><Text style={s.body} numberOfLines={2}>{item.reason}</Text></>:<Text style={s.body}><Text style={s.label}>{item.name}</Text> {ACTIVITY_LABELS[item.kind as keyof typeof ACTIVITY_LABELS]}.</Text>}<Text style={s.time}>{new Date(item.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}{day==='Earlier'?` · ${new Date(item.created_at).toLocaleDateString()}`:''}</Text></View>
      {!item.read_at?<View style={[s.dot,{backgroundColor:accent}]}/>:<ChevronRight size={15} color="#b0bac8"/>}
    </TouchableOpacity></View>;
  }} ListFooterComponent={more?<TouchableOpacity accessibilityRole="button" disabled={loading} onPress={()=>load(true)} style={s.load}><Text style={{color:accent,fontSize:13}}>Load earlier activity</Text></TouchableOpacity>:null}/>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:'white'},content:{paddingBottom:100},filters:{paddingHorizontal:18,paddingVertical:15,gap:8},filter:{minHeight:36,paddingHorizontal:14,justifyContent:'center',borderRadius:18,backgroundColor:'#f2f5f8'},topline:{paddingHorizontal:20,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},section:{fontSize:14,fontWeight:'600',color:'#172033'},readButton:{minHeight:44,flexDirection:'row',alignItems:'center',gap:5},day:{fontSize:12,fontWeight:'600',color:'#718096',paddingHorizontal:20,paddingTop:14,paddingBottom:6},row:{flexDirection:'row',alignItems:'center',paddingHorizontal:20,paddingVertical:15,gap:13,minHeight:84},unread:{backgroundColor:'#f6faff'},avatar:{width:44,height:44},badge:{position:'absolute',right:-2,bottom:-2,backgroundColor:'white',padding:3,borderRadius:10},systemIcon:{width:44,height:44,borderRadius:22,backgroundColor:'#eaf3ff',justifyContent:'center',alignItems:'center'},copy:{flex:1,minWidth:0,gap:4},label:{fontSize:13,fontWeight:'600',color:'#172033'},body:{fontSize:13,lineHeight:19,color:'#435064'},time:{fontSize:11,color:'#8b97a7'},dot:{width:7,height:7,borderRadius:4},error:{fontSize:12,lineHeight:18,color:'#b91c1c',paddingHorizontal:20,paddingVertical:10},empty:{alignItems:'center',paddingHorizontal:30,paddingTop:65,gap:12},emptyTitle:{fontSize:16,fontWeight:'600',color:'#334155'},emptyHint:{fontSize:13,lineHeight:20,textAlign:'center',color:'#718096'},load:{alignItems:'center',padding:20}});
