"use client";
import { useRef, useState } from 'react';
import {PHONE_COUNTRIES,normalizePhone,inferredPhoneCountry,countryName} from '../lib/phone.mjs';
export default function WaitlistForm() {
  const [country,setCountry]=useState('ZA'),[phone,setPhone]=useState('');
  const normalized=normalizePhone(phone,country);
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('');
  const submitting = useRef(false);
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const form = event.currentTarget;
    const data = new FormData(form);
    setState('loading'); setMessage('');
    try {
      const response = await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ first_name:data.get('first_name'),surname:data.get('surname'),phone,phone_country:country,gender:data.get('gender'),email: data.get('email'), platform: data.get('platform'), consent: data.get('consent') === 'on', website: data.get('website') }), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error(result.error || 'We could not save your request. Please try again.');
      setState('success'); setMessage(result.message); form.reset();setPhone('');setCountry('ZA');
    } catch (error) {
      setState('error'); setMessage(error.name === 'TimeoutError' ? 'We could not confirm your request. Please try again; duplicate entries are prevented.' : error.message || 'Please try again in a moment.');
    } finally { submitting.current = false; }
  }
  return <form className="waitlist-form" onSubmit={submit} aria-busy={state === 'loading'}>
    <h3>Your next chapter starts here.</h3><p>Be first to hear when Bible Diaries launches.</p>
    <div className="name-fields"><div><label htmlFor="first_name">Name</label><input id="first_name" name="first_name" autoComplete="given-name" maxLength={80} required disabled={state==='loading'}/></div><div><label htmlFor="surname">Surname</label><input id="surname" name="surname" autoComplete="family-name" maxLength={80} required disabled={state==='loading'}/></div></div>
    <label htmlFor="phone_country">Phone country/region</label><select id="phone_country" name="phone_country" value={country} onChange={e=>setCountry(e.target.value)} disabled={state==='loading'}>{PHONE_COUNTRIES.map(c=><option value={c.code} key={c.code}>{c.name} ({c.callingCode})</option>)}</select>
    <label htmlFor="phone">Cell phone number</label><input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={40} required value={phone} onChange={e=>{setPhone(e.target.value);const region=inferredPhoneCountry(e.target.value);if(region)setCountry(region);}} disabled={state==='loading'} placeholder="082 123 4567" aria-describedby="phone-format"/><small id="phone-format">{normalized?`Saved as ${normalized.number} · ${countryName(normalized.country)}`:'Use a local number or a number starting with + and its country code. A leading local 0 is handled automatically.'} The phone region is not proof of residence or nationality.</small>
    <label htmlFor="gender">Gender</label><select id="gender" name="gender" required defaultValue="" disabled={state==='loading'}><option value="" disabled>Select</option><option value="male">Male</option><option value="female">Female</option></select>
    <label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required disabled={state === 'loading'} aria-describedby="waitlist-message"/>
    <label htmlFor="platform">Where would you like to use it?</label><select name="platform" id="platform" defaultValue="android" disabled={state === 'loading'}><option value="android">Android · Google Play</option><option value="huawei">Huawei · AppGallery</option><option value="ios">iPhone · App Store (later)</option><option value="any">Keep me updated on all platforms</option></select>
    <div className="honeypot" aria-hidden="true"><label htmlFor="website">Leave this empty</label><input id="website" name="website" tabIndex={-1} autoComplete="off"/></div>
    <label className="consent"><input name="consent" type="checkbox" required disabled={state === 'loading'}/><span>I agree to Bible Diaries using these details to manage my waiting-list request and send launch updates by email. I can request correction, deletion or unsubscribe at any time.</span></label>
    <button className="button" type="submit" disabled={state === 'loading'}>{state === 'loading' ? 'Saving your request…' : 'Join the waiting list'} <span aria-hidden="true">↗</span></button>
    <p id="waitlist-message" className={`form-message ${state}`} role={state === 'error' ? 'alert' : 'status'}>{message}</p>
    <p className="fineprint">No app account needed. Read our <a href="/waitlist-privacy">waitlist privacy notice</a>. To leave the list, <a href="mailto:support@ts-industries.com?subject=Bible%20Diaries%20waitlist%20unsubscribe">email us</a> from your registered address.</p>
  </form>;
}
