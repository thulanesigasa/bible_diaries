"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
const platforms = [['android','Google Play','Initial release'],['huawei','Huawei AppGallery','Initial release'],['ios','Apple App Store','Later release'],['any','All platforms','General updates']];
const number = value => new Intl.NumberFormat('en-ZA').format(value);
const time = value => new Intl.DateTimeFormat('en-ZA',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Johannesburg'}).format(new Date(value));
export default function AdminDashboard({ email }) {
  const [stats,setStats] = useState(null);
  const [busy,setBusy] = useState(true);
  const [error,setError] = useState('');
  const [signingOut,setSigningOut] = useState(false);
  const controller = useRef(null);
  const load = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController(); controller.current = current;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/stats',{cache:'no-store',signal:AbortSignal.any([current.signal,AbortSignal.timeout(15000)])});
      if (response.status === 401) { window.location.replace('/admin/login'); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load waiting-list figures.');
      if (!current.signal.aborted) setStats(data);
    } catch(e) { if (!current.signal.aborted) setError(e.name === 'TimeoutError' ? 'The request timed out. Please refresh.' : e.message || 'Waiting-list figures are temporarily unavailable.'); }
    finally { if (!current.signal.aborted) setBusy(false); }
  },[]);
  useEffect(() => { load(); return () => controller.current?.abort(); },[load]);
  async function logout() {
    if (signingOut) return;
    setSigningOut(true); setError('');
    try { const response = await fetch('/api/admin/logout',{method:'POST',signal:AbortSignal.timeout(15000)}); if (!response.ok) throw new Error('Unable to sign out. Please try again.'); window.location.replace('/admin/login'); }
    catch(e) { setError(e.message || 'Unable to sign out. Please try again.'); setSigningOut(false); }
  }
  const largest = stats ? Math.max(1,...stats.daily.map(row=>row.count)) : 1;
  return <>
    <div className="admin-heading"><div><p className="kicker">BIBLE DIARIES / WAITING LIST</p><h1>A growing beginning.</h1><p>Monitor launch interest and where people want to join.</p></div><div className="admin-session"><span>{email}</span><button type="button" className="button outline small" onClick={logout} disabled={signingOut}>{signingOut ? 'Signing out…' : 'Sign out'}</button></div></div>
    <div className="admin-toolbar"><span>All dates shown in South African time · SAST</span><button type="button" className="button small" onClick={load} disabled={busy}>{busy ? 'Refreshing…' : 'Refresh figures'}</button></div>
    {error && <p className="admin-notice admin-error" role="alert">{error}</p>}
    {!stats && busy && <p role="status" className="admin-loading">Loading waiting-list figures…</p>}
    {stats && <div aria-busy={busy}>
      <div className="admin-metrics">{[['Total signups',stats.total],['Today',stats.today],['Last 7 days',stats.last7Days],['Last 30 days',stats.last30Days]].map(([label,value])=><article className="admin-metric" key={label}><h2>{label}</h2><p>{number(value)}</p><span>{label === 'Total signups' ? 'Unique email addresses' : 'Includes today'}</span></article>)}</div>
      {stats.total === 0 && <p className="admin-empty" role="status">No signups have been recorded yet. Once the live waiting list is active, new registrations will appear in these figures.</p>}
      <div className="admin-detail-grid"><section className="admin-chart-panel" aria-labelledby="daily-title"><div className="admin-panel-heading"><div><p className="kicker">THE PAST MONTH</p><h2 id="daily-title">A little growth, every day.</h2></div><span>{number(stats.last30Days)} signups</span></div><div className="admin-bars" role="img" aria-label={`Daily signups over the last 30 days: ${stats.last30Days} in total. Exact daily values are available in the table below.`}>{stats.daily.map(row=><div key={row.date}><span style={{height:`${row.count / largest * 100}%`}} title={`${row.date}: ${row.count} signups`}/></div>)}</div><div className="admin-chart-axis"><span>{stats.daily[0].date}</span><span>{stats.daily[29].date}</span></div><details className="admin-daily-table"><summary>View daily counts in a table</summary><table><caption>Daily waiting-list registrations, SAST</caption><thead><tr><th scope="col">Date</th><th scope="col">Signups</th></tr></thead><tbody>{stats.daily.map(row=><tr key={row.date}><td>{row.date}</td><td>{number(row.count)}</td></tr>)}</tbody></table></details></section>
      <section className="admin-platforms" aria-labelledby="platform-title"><p className="kicker">WHERE THEY WANT TO JOIN</p><h2 id="platform-title">Platform preferences.</h2>{platforms.map(([key,label,note])=><div className="admin-platform" key={key}><div><h3>{label}</h3><p>{note}</p></div><div><strong>{number(stats.platforms[key])}</strong><span>{stats.total ? Math.round(stats.platforms[key]/stats.total*100) : 0}%</span></div></div>)}<p className="fineprint">Each email is counted once, using its original platform preference. These figures describe interest, not installed app users.</p></section></div>
      <div className="admin-footnote"><p>Latest signup: <strong>{stats.latestSignup ? time(stats.latestSignup) + ' SAST' : 'None yet'}</strong></p><p>Figures updated: {time(stats.updatedAt)} SAST</p></div>
    </div>}
    <p className="admin-privacy-note">This dashboard displays aggregate counts. Subscriber addresses are not sent to your browser. A waiting-list signup does not mean an app account has been created or that email ownership was verified.</p>
  </>;
}
