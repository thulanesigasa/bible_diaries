"use client";
import { useEffect, useState } from 'react';
import Logo from './Logo';
export default function Header() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape') { setOpen(false); document.getElementById('menu-toggle')?.focus(); } };
    const desktop = window.matchMedia('(min-width: 1001px)');
    const resize = () => { if (desktop.matches) setOpen(false); };
    window.addEventListener('keydown', close); desktop.addEventListener('change', resize);
    return () => { window.removeEventListener('keydown', close); desktop.removeEventListener('change', resize); };
  }, []);
  return <header className="site-header"><div className="wrap nav-bar">
    <a href="/" className="brand" aria-label="Bible Diaries home"><Logo/><span>Bible <b>Diaries</b></span></a>
    <button id="menu-toggle" className="menu-toggle" type="button" aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen(!open)}>{open ? 'Close ✕' : 'Menu ☰'}</button>
    <nav id="site-navigation" className={open ? 'navigation open' : 'navigation'} aria-label="Main navigation" onClick={(event) => { if (event.target.closest('a')) setOpen(false); }}>
      <a href="/about">Our story</a><a href="/features">Features</a><a href="/pc">On PC</a><a href="/safety">Safety</a><a href="/support">Support</a><a href="/legal">Legal</a><a href="/#waitlist" className="button small">Join the waiting list <span aria-hidden="true">↗</span></a>
    </nav>
  </div></header>;
}
