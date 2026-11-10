"use client";
import { useRef, useState } from 'react';
import {PHONE_COUNTRIES,normalizePhone,inferredPhoneCountry,countryName} from '../lib/phone.mjs';
export default function WaitlistForm() {
  const [country,setCountry]=useState('ZA'),[phone,setPhone]=useState('');
  const [step,setStep]=useState(0),[state,setState]=useState('idle'),[message,setMessage]=useState('');
  const formRef=useRef(null),headingRef=useRef(null),touch=useRef(null),submitting=useRef(false);
  const busy=state==='loading', normalized=normalizePhone(phone,country);
  function showStep(next){setStep(next);setMessage('');requestAnimationFrame(()=>headingRef.current?.focus({preventScroll:true}));}
  function validate(index){
    const fields=Array.from(formRef.current.querySelectorAll(`[data-form-step="${index}"] input,[data-form-step="${index}"] select`));
    const phoneField=formRef.current.elements.namedItem('phone');
    phoneField.setCustomValidity(normalizePhone(phone,country)?'':'Enter a valid cell phone number and check its country/region.');
    const invalid=fields.find(field=>!field.checkValidity());
    if(invalid){setStep(index);requestAnimationFrame(()=>{invalid.focus();invalid.reportValidity();});return false;}
    return true;
  }
  function next(){if(!busy&&validate(0))showStep(1);}
  function swipeEnd(event){
    const start=touch.current;touch.current=null;if(!start||busy)return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y;
    if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.7){if(step===0)next();else showStep(0);}
  }
  async function submit(event) {
    event.preventDefault();
    if(submitting.current)return;
    if(step===0){next();return;}
    if(!validate(0)||!validate(1))return;
    submitting.current=true;
    const form=event.currentTarget,data=new FormData(form);
    setState('loading');setMessage('');
    try {
      const response=await fetch('/api/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({first_name:data.get('first_name'),surname:data.get('surname'),phone,phone_country:country,gender:data.get('gender'),email:data.get('email'),platform:data.get('platform'),consent:data.get('consent')==='on',website:data.get('website')}),signal:AbortSignal.timeout(15000)});
      const result=await response.json();
      if(!response.ok||result.success!==true)throw new Error(result.error||'We could not save your request. Please try again.');
      setState('success');setMessage(result.message);form.reset();setPhone('');setCountry('ZA');setStep(0);
    }catch(error){setState('error');setMessage(error.name==='TimeoutError'?'We could not confirm your request. Please try again; duplicate entries are prevented.':error.message||'Please try again in a moment.');}
    finally{submitting.current=false;}
  }
  return <form ref={formRef} className="waitlist-form" onSubmit={submit} noValidate aria-busy={busy}>
    <h3>Your next chapter starts here.</h3><p>Be first to hear when Bible Diaries launches.</p>
    <ol className="waitlist-progress" aria-label="Waiting-list progress">{['Your details','Your preferences'].map((label,index)=><li key={label}><button type="button" aria-current={step===index?'step':undefined} disabled={busy} onClick={()=>index===0?showStep(0):next()}><span>{index+1}</span>{label}</button></li>)}</ol>
    <p className="waitlist-step-heading" ref={headingRef} tabIndex={-1} aria-live="polite">Step {step+1} of 2 · {step===0?'A little introduction':'Make it yours'}</p>
    <div className="waitlist-slides" onPointerDown={event=>{if(event.target.closest('input,select,button,a'))return;touch.current={x:event.clientX,y:event.clientY};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerUp={swipeEnd} onPointerCancel={()=>{touch.current=null;}}>
      <div className="waitlist-track" style={{transform:`translateX(-${step*100}%)`}}>
        <fieldset data-form-step="0" className={`waitlist-slide ${step===0?'is-current':''}`} inert={step!==0} aria-hidden={step!==0} disabled={busy}>
          <legend className="sr-only">Your details</legend>
          <div className="name-fields"><div><label htmlFor="first_name">Name</label><input id="first_name" name="first_name" autoComplete="given-name" maxLength={80} required/></div><div><label htmlFor="surname">Surname</label><input id="surname" name="surname" autoComplete="family-name" maxLength={80} required/></div></div>
          <label htmlFor="phone_country">Phone country/region</label><select id="phone_country" name="phone_country" value={country} onChange={e=>setCountry(e.target.value)}>{PHONE_COUNTRIES.map(c=><option value={c.code} key={c.code}>{c.name} ({c.callingCode})</option>)}</select>
          <label htmlFor="phone">Cell phone number</label><input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={40} required value={phone} onChange={e=>{setPhone(e.target.value);const region=inferredPhoneCountry(e.target.value);if(region)setCountry(region);e.target.setCustomValidity('');}} placeholder="082 123 4567" aria-describedby="phone-format"/>
          <small id="phone-format">{normalized?`Saved as ${normalized.number} · ${countryName(normalized.country)}`:'Use a local number or a number starting with + and its country code. A leading local 0 is handled automatically.'} The phone region is not proof of residence or nationality.</small>
          <button className="button waitlist-next" type="button" onClick={next}>Continue to preferences <span aria-hidden="true">→</span></button>
        </fieldset>
        <fieldset data-form-step="1" className={`waitlist-slide ${step===1?'is-current':''}`} inert={step!==1} aria-hidden={step!==1} disabled={busy}>
          <legend className="sr-only">Your preferences</legend>
          <label htmlFor="gender">Gender</label><select id="gender" name="gender" required defaultValue=""><option value="" disabled>Select</option><option value="male">Male</option><option value="female">Female</option></select>
          <label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required aria-describedby="waitlist-message"/>
          <label htmlFor="platform">Where would you like to use it?</label><select name="platform" id="platform" defaultValue="android"><option value="android">Android · Google Play</option><option value="huawei">Huawei · AppGallery</option><option value="ios">iPhone · App Store (later)</option><option value="any">Keep me updated on all platforms</option></select>
          <label className="consent"><input name="consent" type="checkbox" required/><span>I agree to Bible Diaries using these details to manage my waiting-list request and send launch updates by email. I can request correction, deletion or unsubscribe at any time.</span></label>
          <div className="waitlist-form-actions"><button type="button" className="waitlist-back" onClick={()=>showStep(0)}>← Back</button><button className="button" type="submit">{busy?'Saving your request…':'Join the waiting list'} <span aria-hidden="true">↗</span></button></div>
        </fieldset>
      </div>
    </div>
    <p className="waitlist-swipe-hint">Swipe across to change steps, or use the buttons. Your details stay in the form.</p>
    <div className="honeypot" aria-hidden="true"><label htmlFor="website">Leave this empty</label><input id="website" name="website" tabIndex={-1} autoComplete="off"/></div>
    <p id="waitlist-message" className={`form-message ${state}`} role={state==='error'?'alert':'status'}>{message}</p>
    <p className="fineprint">No app account needed. Read our <a href="/waitlist-privacy">waitlist privacy notice</a>. To leave the list, <a href="mailto:support@ts-industries.com?subject=Bible%20Diaries%20waitlist%20unsubscribe">email us</a> from your registered address.</p>
  </form>;
}
