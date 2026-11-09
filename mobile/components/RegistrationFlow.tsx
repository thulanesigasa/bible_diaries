import React,{useEffect,useRef,useState} from 'react';
import {View,Text,TouchableOpacity,StyleSheet,Image,Keyboard,DeviceEventEmitter,ActivityIndicator} from 'react-native';
import {useRouter} from 'expo-router';
import {Check,Eye,EyeOff} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {supabase} from '../src/lib/supabase';
import {useSecurePasswordCapture} from '../src/hooks/useSecurePasswordCapture';
import {KeyboardForm,FormInput as TextInput} from './KeyboardForm';
import PhoneInput from './PhoneInput';
import Avatar from './Avatar';
import DateOfBirthPicker from './DateOfBirthPicker';
import PolicyLinks from './PolicyLinks';
import {ageAt,POLICY_VERSION} from '../../shared/launch-safety.mjs';
import {validUsername,signupPasswordChecks} from '../../shared/signup-fields.mjs';
import {userError} from '../../shared/user-error.mjs';
const STEPS=['Personal details','Profile details','Birth date','Terms & privacy','Create password'];
export default function RegistrationFlow({existing=false}:{existing?:boolean}){
 const router=useRouter(),guard=useSecurePasswordCapture(),pending=useRef(false);
 const [step,setStep]=useState(existing?2:0),[first,setFirst]=useState(''),[surname,setSurname]=useState(''),[username,setUsername]=useState(''),[email,setEmail]=useState(''),[gender,setGender]=useState(''),[countryCode,setCountryCode]=useState('+27'),[phone,setPhone]=useState(''),[address,setAddress]=useState(''),[avatar,setAvatar]=useState<string|null>(null),[birth,setBirth]=useState(''),[guardian,setGuardian]=useState(''),[accepted,setAccepted]=useState(false),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[showPassword,setShowPassword]=useState(false),[showConfirm,setShowConfirm]=useState(false),[busy,setBusy]=useState(false),[photoBusy,setPhotoBusy]=useState(false),[message,setMessage]=useState(''),[done,setDone]=useState(false),[account,setAccount]=useState<any>(null);
 const accent=gender==='Female'?'#EC4899':'#0EA5E9',age=ageAt(birth),checks=signupPasswordChecks(password);
 useEffect(()=>{if(!existing)return;let active=true;supabase.auth.getUser().then(({data:{user}}:any)=>{if(active){setAccount(user);setEmail(user?.email||'');}});return()=>{active=false;};},[existing]);
 useEffect(()=>{if(step===4&&!done)void guard.enableProtection();else guard.disableProtection();return()=>guard.disableProtection();},[step,done]);
 function errorFor(n:number){
  if(n===0&&(!first.trim()||!surname.trim()||!validUsername(username)||!/^\S+@\S+\.\S+$/.test(email.trim())))return 'Enter your name, surname, a username (3–24 letters, numbers or underscores) and a valid email address.';
  if(n===1&&(!['Male','Female'].includes(gender)||(phone&&!/^\+[1-9]\d{6,14}$/.test(countryCode+phone))))return 'Select Male or Female and check your phone number, if provided.';
  if(n===2&&(age===null||age<13||age>120))return 'Select your birth date. Accounts are available from age 13.';
  if(n===2&&age!==null&&age<18&&(!/^\S+@\S+\.\S+$/.test(guardian.trim())||guardian.trim().toLowerCase()===email.trim().toLowerCase()))return 'Enter a separate parent or legal guardian email address.';
  if(n===3&&!accepted)return 'Read and accept the terms and community standards, and acknowledge the privacy notice.';
  if(n===4&&(!checks.every((c:any)=>c.valid)||password!==confirm))return 'Use at least 12 characters, a number and a special character, and match both passwords.';
  return '';
 }
 function next(){if(busy||photoBusy)return;const error=errorFor(step);setMessage(error);if(error)return;Keyboard.dismiss();if(existing&&step===3){void submit();return;}setStep(step+1);}
 async function pickPhoto(){
  setPhotoBusy(true);try{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.8});if(result.canceled)return;const a=result.assets[0];if(a.fileSize&&a.fileSize>10485760)throw Error('Choose a photo under 10 MB.');const photo=await ImageManipulator.manipulateAsync(a.uri,[{resize:{width:512}}],{compress:0.75,format:ImageManipulator.SaveFormat.WEBP,base64:true});if(!photo.base64||photo.base64.length>2796204)throw Error('Choose a smaller photo.');setAvatar(`data:image/webp;base64,${photo.base64}`);}catch(e){setMessage(userError(e,'Could not select this photo. Try again.'));}finally{setPhotoBusy(false);}
 }
 async function submit(){
  if(pending.current||photoBusy)return;
  for(const n of existing?[2,3]:[0,1,2,3,4]){const error=errorFor(n);if(error){setMessage(error);setStep(n);return;}}
  pending.current=true;setBusy(true);setMessage('');setShowPassword(false);setShowConfirm(false);
  try{
   const eligibility={birth_date:birth,guardian_email:(age ?? 0)<18?guardian.trim().toLowerCase():null,accepted:true,policy_version:POLICY_VERSION};
   if(existing){if(!account)throw Error('Sign in again to complete registration.');const {data,error}=await supabase.rpc('complete_account_setup',eligibility);if(error)throw error;DeviceEventEmitter.emit('diary-eligibility-changed',{userId:account.id,status:data});router.replace('/(tabs)');}
   else{const {error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{first_name:first.trim(),surname:surname.trim(),full_name:`${first.trim()} ${surname.trim()}`,username:username.trim().toLowerCase(),gender,phone_number:phone?countryCode+phone:null,address:address.trim()||null,avatar_url:avatar,signup_eligibility:eligibility}}});if(error)throw error;setPassword('');setConfirm('');guard.onPasswordBlur();setDone(true);setMessage('Check your email to confirm your address, then sign in. Your birth date and consent were included in signup; you will not enter them again. Members under 18 still need guardian approval.');}
  }catch(e){setMessage(userError(e,'Registration could not be confirmed. Retry later. If your details are valid, try a different username.'));}finally{pending.current=false;setBusy(false);}
 }
 const input=(label:string,value:string,set:(v:string)=>void,extra:any={})=><View key={label} style={s.inputGroup}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} style={s.input} value={value} onChangeText={set} editable={!busy} maxLength={80} returnKeyType="next" {...extra}/></View>;
 return <KeyboardForm key={step} style={s.container} contentContainerStyle={s.scrollContainer}>
  <View style={s.card}>
   <View style={s.header}><View style={s.logoRow}><Image source={require('../assets/images/icon.png')} style={{width:28,height:28,marginRight:8}} resizeMode="contain"/><Text style={[s.logoText,{color:accent}]}>Bible Diaries</Text></View><Text accessibilityRole="header" style={s.title}>{done?'Check your email':existing?'Complete your registration':'Create Your Account'}</Text><Text style={s.subtitle}>{existing?'Finish the missing signup details once. Your existing password stays in place.':'Join our community to share and browse diaries'}</Text></View>
   {!done&&<>
    <View style={s.stepIndicatorRow}>{STEPS.slice(existing?2:0,existing?4:5).map((label,n,arr)=>{const i=n+(existing?2:0);return <View key={label} style={n<arr.length-1?s.stepWrapper:s.stepWrapperLast}><View accessibilityLabel={`Step ${n+1}: ${label}${i===step?', current':''}`} style={[s.stepDot,i<=step&&{backgroundColor:accent,borderColor:accent}]}>{i<step?<Check size={14} color="white"/>:<Text style={[s.stepDotText,i===step&&{color:'white'}]}>{n+1}</Text>}</View>{n<arr.length-1&&<View style={[s.stepLine,i<step&&{backgroundColor:accent}]}/>}</View>;})}</View>
    <Text style={[s.label,{marginBottom:16}]}>Step {existing?step-1:step+1} of {existing?2:5} · {STEPS[step]}</Text>
    <View style={s.form}>
     {step===0&&<>{input('First name',first,setFirst,{autoComplete:'given-name',autoCapitalize:'words'})}{input('Surname',surname,setSurname,{autoComplete:'family-name',autoCapitalize:'words'})}{input('Username',username,setUsername,{maxLength:24,autoCapitalize:'none',autoCorrect:false,autoComplete:'username'})}<Text style={s.note}>Your username is visible to other members. Use 3–24 letters, numbers or underscores.</Text>{input('Email address',email,setEmail,{maxLength:254,keyboardType:'email-address',autoCapitalize:'none',autoComplete:'email',onSubmitEditing:next})}</>}
     {step===1&&<><Text style={s.label}>Gender</Text><View style={s.genderRow}>{['Male','Female'].map(value=><TouchableOpacity key={value} accessibilityRole="radio" accessibilityLabel={value} accessibilityState={{checked:gender===value}} disabled={busy} onPress={()=>setGender(value)} style={[s.genderBtn,gender===value&&{backgroundColor:accent,borderColor:accent}]}><Text style={[s.genderText,gender===value&&s.genderTextActive]}>{value}</Text></TouchableOpacity>)}</View><Text style={s.label}>Phone number · optional</Text><PhoneInput countryCode={countryCode} phoneNumber={phone} onCountryCodeChange={setCountryCode} onPhoneNumberChange={setPhone} editable={!busy} accent={accent}/>{input('Physical address',address,setAddress,{maxLength:500,autoComplete:'street-address',placeholder:'Optional'})}<View style={s.avatarContainer}><Avatar src={avatar} fullName={first||'New'} size={64}/><View style={{flex:1,gap:10}}><Text style={s.label}>Profile photo · optional</Text><TouchableOpacity accessibilityRole="button" onPress={pickPhoto} disabled={photoBusy||busy}><Text style={{color:accent}}>{photoBusy?'Preparing photo…':avatar?'Change photo':'Choose photo'}</Text></TouchableOpacity>{avatar&&<TouchableOpacity accessibilityRole="button" onPress={()=>setAvatar(null)}><Text style={s.note}>Remove photo</Text></TouchableOpacity>}</View></View><Text style={s.note}>Your photo is part of your profile. Your phone and address stay in owner-only contact records. You may skip these optional details. A supplied phone number is not verified.</Text></>}
     {step===2&&<><Text style={s.label}>When were you born?</Text><Text style={s.note}>Select your birth date using the picker. It is kept in a restricted account record, not your public profile. Accounts are for ages 13 and above.</Text><DateOfBirthPicker value={birth} onChange={v=>{setBirth(v);setAccepted(false);setMessage('');}}/>{age!==null&&age<18&&<>{input('Guardian email',guardian,v=>{setGuardian(v);setAccepted(false);},{maxLength:254,keyboardType:'email-address',autoCapitalize:'none',onSubmitEditing:next})}<Text style={s.note}>A separate verified adult account using this address must approve participation. Email verification alone does not prove legal guardianship.</Text></>}</>}
     {step===3&&<><Text style={s.label}>Before you join</Text><Text style={s.note}>Read each notice on its own screen. Submitted text, including private entries and messages, is checked through OpenAI moderation. Public reflections can be copied by others.</Text><PolicyLinks/><TouchableOpacity accessibilityRole="checkbox" accessibilityState={{checked:accepted}} disabled={busy} style={{paddingVertical:12}} onPress={()=>setAccepted(!accepted)}><Text style={s.note}>{accepted?'☑':'☐'} I accept the terms and community standards and acknowledge the privacy notice.</Text></TouchableOpacity></>}
     {step===4&&<><Text style={s.label}>Create your password</Text><View style={{gap:6}}>{checks.map((c:any)=><Text key={c.label} style={{fontSize:12,color:c.valid?'#15803d':'#64748b'}}>{c.valid?'✓':'○'} {c.label}</Text>)}<Text style={{fontSize:12,color:confirm&&confirm===password?'#15803d':'#64748b'}}>{confirm&&confirm===password?'✓':'○'} Passwords match</Text></View>{[['Password',password,setPassword,showPassword,setShowPassword],['Confirm password',confirm,setConfirm,showConfirm,setShowConfirm]].map(([label,value,set,reveal,toggle]:any)=><View key={label} style={s.inputGroup}><Text style={s.label}>{label}</Text><View style={{position:'relative',justifyContent:'center'}}><TextInput accessibilityLabel={label} style={[s.input,{paddingRight:48}]} value={value} onChangeText={set} editable={!busy} maxLength={128} secureTextEntry={!reveal} autoCapitalize="none" autoCorrect={false} textContentType="newPassword" onFocus={guard.onPasswordFocus} onBlur={()=>{toggle(false);guard.onPasswordBlur();}} returnKeyType={label==='Password'?'next':'done'} onSubmitEditing={label==='Confirm password'?submit:undefined}/><TouchableOpacity accessibilityRole="button" accessibilityLabel={`${reveal?'Hide':'Show'} ${label.toLowerCase()}`} style={s.eyeBtnAbsolute} onPress={async()=>{if(!reveal&&(await guard.enableProtection())===false){setMessage("Could not protect this screen. Close the recorder and try again.");return;}toggle(!reveal);}}>{reveal?<EyeOff size={18} color="#475569"/>:<Eye size={18} color="#475569"/>}</TouchableOpacity></View></View>)}</>}
     {!!message&&<Text accessibilityRole="alert" style={s.error}>{message}</Text>}
     <View style={s.btnRow}>{step>(existing?2:0)&&<TouchableOpacity accessibilityRole="button" disabled={busy||photoBusy} style={s.btnSecondary} onPress={()=>{Keyboard.dismiss();guard.onPasswordBlur();setShowPassword(false);setShowConfirm(false);setStep(step-1);setMessage('');}}><Text style={s.btnSecondaryText}>Back</Text></TouchableOpacity>}<TouchableOpacity accessibilityRole="button" disabled={busy||photoBusy||(step===3&&!accepted)} style={[s.btnPrimary,{flex:1,backgroundColor:accent},(busy||photoBusy||(step===3&&!accepted))&&s.btnDisabled]} onPress={step===4?submit:next}>{busy?<ActivityIndicator color="white"/>:<Text style={s.btnText}>{step===4?'Create account':step===3?existing?'Finish registration':'Create password':'Continue'}</Text>}</TouchableOpacity></View>
    </View>
   </>}
   {done&&<Text accessibilityRole="alert" style={s.note}>{message}</Text>}
   <TouchableOpacity accessibilityRole="button" disabled={busy} style={s.footerLinkRow} onPress={()=>existing?supabase.auth.signOut({scope:'local'}):router.replace('/(auth)/login')}><Text style={[s.linkText,{color:accent}]}>{existing?'Sign out':'Already registered? Sign in'}</Text></TouchableOpacity>
  </View>
 </KeyboardForm>;
}

const s = StyleSheet.create({
  note:{fontSize:13,lineHeight:21,color:"#64748b"},
  error:{fontSize:13,lineHeight:21,color:"#b91c1c"},
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepWrapperLast: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  stepDotTextActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    height: 2,
    flex: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 8,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#0F172A',
  },
  eyeBtnAbsolute: {
    position: 'absolute',
    right: 14,
    padding: 6,
    zIndex: 10,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.04)',
  },
  avatarCameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 14,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  avatarSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  btnPrimary: {
    borderRadius: 0,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  btnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 0,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerLinkText: {
    fontSize: 13,
    color: '#475569',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  genderBtn: {
    flex: 1,
    height: 44,
    borderRadius: 0,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.04)',
  },
  genderText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  genderTextActive: {
    color: '#FFFFFF',
  },
});
