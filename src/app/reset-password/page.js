'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabase';
export default function ResetPassword(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[ready,setReady]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setReady(Boolean(data.session)));const {data:{subscription}}=supabase.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY'||event==='SIGNED_IN')setReady(true);});return()=>subscription.unsubscribe();},[]);
 async function submit(event){event.preventDefault();setBusy(true);try{
 if(ready){if(password.length<12||password!==confirm){setMessage('Use at least 12 characters and matching passwords.');return;}const {error}=await supabase.auth.updateUser({password});if(error)throw error;await supabase.auth.signOut({scope:'global'});setReady(false);setPassword('');setConfirm('');setMessage('Password changed. Sign in again on your devices.');}
 else{const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+'/reset-password'});if(error)throw error;setMessage('If this address has an account, follow the recovery email. Expired links can be replaced with a new request.');}
 }catch{setMessage('Could not complete recovery. Try a new link or contact support.');}finally{setBusy(false);}}
 return <main style={{maxWidth:480,margin:'60px auto',padding:24}}><h1>Reset your password</h1><p>Use a recovery link sent to your account email.</p><form onSubmit={submit}>{ready?<><label>New password<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm password<input type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label></>:<label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>}<button type="submit" disabled={busy}>{ready?'Save new password':'Send recovery email'}</button></form><p role="status">{message}</p><a href="/login">Return to sign in</a></main>;
}
