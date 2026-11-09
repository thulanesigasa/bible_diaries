import React,{createContext,forwardRef,useContext,useEffect,useImperativeHandle,useMemo,useRef,useState} from 'react';
import {Keyboard,KeyboardAvoidingView,Platform,ScrollView,ScrollViewProps,TextInput as NativeInput,TextInputProps,View,ViewProps} from 'react-native';
type Field={node:NativeInput|null;enabled:boolean};
const Form=createContext<null|{register:(field:Field)=>()=>void;next:(field:Field)=>boolean;reveal:()=>void}>(null);
export function KeyboardFrame({children,style}:ViewProps){
 const host=useRef<View>(null),[top,setTop]=useState(0);
 return <View ref={host} style={[{flex:1},style]} onLayout={()=>host.current?.measureInWindow((_x,y)=>setTop(y))}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={top}>{children}</KeyboardAvoidingView></View>;
}
export function KeyboardForm({children,style,...props}:ScrollViewProps){
 const scroll=useRef<ScrollView>(null),fields=useRef<Field[]>([]),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const context=useMemo(()=>({
  register(field:Field){fields.current.push(field);return()=>{fields.current=fields.current.filter(f=>f!==field);};},
  next(field:Field){const next=fields.current.slice(fields.current.indexOf(field)+1).find(f=>f.enabled&&f.node);next?.node?.focus();return !!next;},
  reveal(){if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>{if(Platform.OS==='web'){(globalThis as any).document?.activeElement?.scrollIntoView?.({block:'nearest'});return;}const input=NativeInput.State.currentlyFocusedInput();if(input&&Keyboard.isVisible())scroll.current?.getScrollResponder()?.scrollResponderScrollNativeHandleToKeyboard(input,28,true);},80);}
 }),[]);
 useEffect(()=>{const sub=Keyboard.addListener('keyboardDidShow',context.reveal);return()=>{sub.remove();if(timer.current)clearTimeout(timer.current);};},[context]);
 return <Form.Provider value={context}><KeyboardFrame style={style}><ScrollView {...props} ref={scroll} style={{flex:1}} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" onLayout={context.reveal}>{children}</ScrollView></KeyboardFrame></Form.Provider>;
}
export type FormInput=NativeInput;
export const FormInput=forwardRef<NativeInput,TextInputProps>(function FormInput(props,ref){
 const context=useContext(Form),node=useRef<NativeInput>(null),field=useRef<Field>({node:null,enabled:true});field.current.enabled=props.editable!==false;
 useImperativeHandle(ref,()=>node.current!,[]);useEffect(()=>context?.register(field.current),[context]);
 const finalKey=['done','go','send','search'].includes(props.returnKeyType||'');
 return <NativeInput {...props} ref={value=>{node.current=value;field.current.node=value;}}
  returnKeyType={props.returnKeyType??(props.multiline?'default':'next')}
  blurOnSubmit={props.blurOnSubmit??(!props.multiline&&finalKey)}
  submitBehavior={props.submitBehavior??(props.multiline?'newline':finalKey?'blurAndSubmit':'submit')}
  onFocus={e=>{props.onFocus?.(e);context?.reveal();}}
  onContentSizeChange={e=>{props.onContentSizeChange?.(e);context?.reveal();}}
  onSubmitEditing={e=>{if(props.onSubmitEditing)props.onSubmitEditing(e);else if(!props.multiline&&!context?.next(field.current)){node.current?.blur();Keyboard.dismiss();}}}/>;
});
