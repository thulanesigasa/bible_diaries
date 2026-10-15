"use client";
import { useRef, useState } from 'react';
export default function WaitlistForm() {
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
      const response = await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), platform: data.get('platform'), consent: data.get('consent') === 'on', website: data.get('website') }), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error(result.error || 'We could not save your request. Please try again.');
      setState('success'); setMessage(result.message); form.reset();
    } catch (error) {
      setState('error'); setMessage(error.name === 'TimeoutError' ? 'We could not confirm your request. Please try again; duplicate entries are prevented.' : error.message || 'Please try again in a moment.');
    } finally { submitting.current = false; }
  }
  return <form className="waitlist-form" onSubmit={submit} aria-busy={state === 'loading'}>
    <h3>Your next chapter starts here.</h3><p>Be first to hear when Bible Diaries launches.</p>
    <label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required disabled={state === 'loading'} aria-describedby="waitlist-message"/>
    <label htmlFor="platform">Where would you like to use it?</label><select name="platform" id="platform" defaultValue="android" disabled={state === 'loading'}><option value="android">Android · Google Play</option><option value="huawei">Huawei · AppGallery</option><option value="ios">iPhone · App Store (later)</option><option value="any">Keep me updated on all platforms</option></select>
    <div className="honeypot" aria-hidden="true"><label htmlFor="website">Leave this empty</label><input id="website" name="website" tabIndex={-1} autoComplete="off"/></div>
    <label className="consent"><input name="consent" type="checkbox" required disabled={state === 'loading'}/><span>I agree to receive Bible Diaries launch updates by email. I can unsubscribe at any time.</span></label>
    <button className="button" type="submit" disabled={state === 'loading'}>{state === 'loading' ? 'Saving your request…' : 'Join the waiting list'} <span aria-hidden="true">↗</span></button>
    <p id="waitlist-message" className={`form-message ${state}`} role={state === 'error' ? 'alert' : 'status'}>{message}</p>
    <p className="fineprint">No app account needed. Read our <a href="/waitlist-privacy">waitlist privacy notice</a>. To leave the list, <a href="mailto:support@ts-industries.com?subject=Bible%20Diaries%20waitlist%20unsubscribe">email us</a> from your registered address.</p>
  </form>;
}
