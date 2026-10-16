"use client";
import { useEffect, useRef, useState } from 'react';
import Logo from './Logo';
export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef(null);
  const navigationRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    const desktop = window.matchMedia('(min-width: 1001px)');
    const resize = () => { if (desktop.matches) setOpen(false); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    desktop.addEventListener('change', resize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      desktop.removeEventListener('change', resize);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const closeOutside = (event) => {
      if (!toggleRef.current?.contains(event.target) && !navigationRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('focusin', closeOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('focusin', closeOutside);
    };
  }, [open]);

  return <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}><div className="wrap nav-bar">
    <a href="/" className="brand" aria-label="Bible Diaries home" onClick={() => setOpen(false)}><Logo/><span>Bible <b>Diaries</b></span></a>
    {/* From Uiverse.io by JulanDeAlb; button state preserves keyboard access. */}
    <button ref={toggleRef} id="menu-toggle" className="menu-toggle hamburger" type="button" aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen(previous => !previous)}>
      <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false">
        <path className="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"/>
        <path className="line" d="M7 16 27 16"/>
      </svg>
    </button>
    <nav ref={navigationRef} id="site-navigation" className={open ? 'navigation open' : 'navigation'} aria-label="Main navigation" onClick={(event) => { if (event.target.closest('a')) setOpen(false); }}>
      <a href="/about">Our story</a><a href="/features">Features</a><a href="/pc">On PC</a><a href="/safety">Safety</a><a href="/support">Support</a><a href="/legal">Legal</a><a href="/#waitlist" className="button small">Join the waiting list <span aria-hidden="true">↗</span></a>
    </nav>
  </div></header>;
}
