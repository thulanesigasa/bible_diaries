import React from 'react';
import {TouchableOpacity,View,Text} from 'react-native';
import {Bell} from 'lucide-react-native';
import {useRouter} from 'expo-router';
import {useApp} from '../app/_layout';
import {useActivityNotifications} from './ActivityNotifications';
export default function ActivityBell(){const {accent}=useApp(),{count}=useActivityNotifications(),router=useRouter();return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Activity and Notifications, ${count} unread`} onPress={()=>router.push('/activity')} style={{padding:12,marginRight:3}}><Bell size={22} color={accent}/>{count>0&&<View style={{position:'absolute',right:1,top:3,paddingHorizontal:4,minWidth:17,borderRadius:9,backgroundColor:accent,alignItems:'center'}}><Text style={{fontSize:10,color:'#fff',fontWeight:'700'}}>{count>99?'99+':count}</Text></View>}</TouchableOpacity>;}
