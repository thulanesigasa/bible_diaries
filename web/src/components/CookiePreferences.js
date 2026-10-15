"use client";
import { useEffect, useRef, useState } from 'react';
const key = 'bible-diaries-privacy-v1';
export function CookiePreferencesButton() {
  return <button type="button" className="privacy-preferences-button" onClick={() => window.dispatchEvent(new Event('bible-diaries-privacy'))}>Privacy preferences</button>;
}
export default function CookiePreferences() {
  const [notice, setNotice] = useState(false);
  const [saved, setSaved] = useState(false);
  const dialog = useRef(null);
  useEffect(() => {
    try { const value = JSON.parse(localStorage.getItem(key)); setNotice(value?.version !== 1 || value?.analytics !== false || value?.advertising !== false); } catch { setNotice(true); }
    const open = () => { setSaved(false); dialog.current?.showModal(); };
    window.addEventListener('bible-diaries-privacy', open);
    return () => window.removeEventListener('bible-diaries-privacy', open);
  }, []);
  function save() {
    let persisted = true;
    try { localStorage.setItem(key, JSON.stringify({ version: 1, essential: true, analytics: false, advertising: false, savedAt: new Date().toISOString() })); } catch { persisted = false; }
    setNotice(false); setSaved(!persisted);
    if (persisted) dialog.current?.close();
  }
  return <>
    {notice && <aside className="privacy-notice" aria-label="Website privacy choices"><div><strong>Your privacy, simply.</strong><p>No analytics or advertising trackers. Only essential storage is used. <a href="/cookies">Learn more</a></p></div><div><button type="button" className="button small" onClick={save}>Essential only</button><button type="button" className="privacy-preferences-button" onClick={() => { setSaved(false); dialog.current?.showModal(); }}>View preferences</button></div></aside>}
    <dialog ref={dialog} className="privacy-dialog" aria-labelledby="privacy-title" aria-describedby="privacy-description"><div className="dialog-heading"><p className="kicker">YOUR PRIVACY CHOICES</p><button type="button" aria-label="Close privacy preferences" onClick={() => dialog.current?.close()}>✕</button></div><h2 id="privacy-title">Only what is needed.</h2><p id="privacy-description">This marketing website has no optional trackers. Saving a choice does not subscribe you to emails or change your app account.</p><div className="preference-row"><div><h3>Essential storage</h3><p>Remembers your privacy choice; a secure session cookie is also used when an administrator signs in.</p></div><span>Always available</span></div><div className="preference-row"><div><h3>Analytics</h3><p>No analytics service is installed.</p></div><input type="checkbox" aria-label="Analytics — not installed" checked={false} disabled readOnly/></div><div className="preference-row"><div><h3>Advertising</h3><p>No advertising or tracking pixels are installed.</p></div><input type="checkbox" aria-label="Advertising — not installed" checked={false} disabled readOnly/></div><p className="fineprint">The saved record contains preferences and a timestamp, never a login token. You can clear it in browser settings. <a href="/cookies">Read the cookie notice</a>.</p><button type="button" className="button" onClick={save}>Save essential-only preferences</button>{saved && <p role="status">Your browser blocked storage, so this choice cannot be remembered. You can close this panel and continue.</p>}</dialog>
  </>;
}
