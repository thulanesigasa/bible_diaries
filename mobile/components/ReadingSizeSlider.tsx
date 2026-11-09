import React, { useRef, useState } from 'react';
import { View, Text, PanResponder, StyleSheet } from 'react-native';
export default function ReadingSizeSlider({ value, disabled, accent, onChange, onComplete }: {value: number; disabled: boolean; accent: string; onChange: (value: number) => void; onComplete: (value: number) => void}) {
  const [width, setWidth] = useState(1), current = useRef({value, disabled, onChange, onComplete, width});
  current.current = {value, disabled, onChange, onComplete, width};
  const position = useRef(0), latest = useRef(value);
  const update = (x: number) => {const p=current.current;const n=Math.max(8,Math.min(24,Math.round(8+Math.max(0,Math.min(p.width-24,x-12))/Math.max(1,p.width-24)*16)));latest.current=n;p.onChange(n);};
  const responder=useRef(PanResponder.create({
    onStartShouldSetPanResponder:()=>!current.current.disabled,
    onMoveShouldSetPanResponder:()=>!current.current.disabled,
    onPanResponderGrant:e=>{position.current=e.nativeEvent.locationX;update(position.current);},
    onPanResponderMove:(_e,g)=>update(position.current+g.dx),
    onPanResponderRelease:()=>current.current.onComplete(latest.current),
    onPanResponderTerminate:()=>current.current.onComplete(latest.current),
    onPanResponderTerminationRequest:()=>false,
  })).current;
  return <View><View style={[s.touch,disabled&&{opacity:.45}]} {...responder.panHandlers} onLayout={e=>setWidth(e.nativeEvent.layout.width)} accessible accessibilityRole="adjustable" aria-valuemin={8} aria-valuemax={24} aria-valuenow={value} accessibilityLabel="Reading text size" accessibilityHint="Swipe up or down to adjust by one point, or drag the slider." accessibilityValue={{min:8,max:24,now:value,text:`${value} points`}} accessibilityState={{disabled}} accessibilityActions={[{name:'increment'},{name:'decrement'}]} onAccessibilityAction={e=>{if(disabled)return;const n=Math.max(8,Math.min(24,value+(e.nativeEvent.actionName==='increment'?1:-1)));onChange(n);onComplete(n);}}>
    <View pointerEvents="none" style={s.track}><View style={{height:4,borderRadius:2,backgroundColor:accent,width:`${(value-8)/16*100}%`}} /></View><View pointerEvents="none" style={[s.thumb,{left:Math.max(0,(width-24)*(value-8)/16),borderColor:accent}]} />
  </View><View style={s.ends}><Text style={s.end}>8</Text><Text style={s.end}>Drag to choose any size</Text><Text style={s.end}>24</Text></View></View>;
}
const s=StyleSheet.create({touch:{height:48,justifyContent:'center'},track:{height:4,backgroundColor:'#e2e8f0',borderRadius:2,marginHorizontal:12},thumb:{position:'absolute',width:24,height:24,borderRadius:12,borderWidth:2,backgroundColor:'white',top:12},ends:{flexDirection:'row',justifyContent:'space-between'},end:{fontSize:11,color:'#64748b'}});
