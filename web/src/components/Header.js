"use client";
import { useEffect, useRef, useState } from 'react';
import Logo from './Logo';
function NavigationLinks({ onNavigate }) {
  return <>
    <a href="/about" onClick={onNavigate}>Our story</a><a href="/features" onClick={onNavigate}>Features</a><a href="/pc" onClick={onNavigate}>On PC</a><a href="/safety" onClick={onNavigate}>Safety</a><a href="/support" onClick={onNavigate}>Support</a><a href="/legal" onClick={onNavigate}>Legal</a><a href="/#waitlist" className="button small" onClick={onNavigate}>Join the waiting list <span aria-hidden="true">↗</span></a>
  </>;
}
export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);
  const toggleRef = useRef(null);
  const closeMenu = () => { if (menuRef.current) menuRef.current.open = false; };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    const desktop = window.matchMedia('(min-width: 1001px)');
    const resize = () => { if (desktop.matches && menuRef.current) menuRef.current.open = false; };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && menuRef.current?.open) {
        menuRef.current.open = false;
        toggleRef.current?.focus();
      }
    };
    const closeOutside = (event) => {
      if (menuRef.current?.open && !menuRef.current.contains(event.target)) menuRef.current.open = false;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    desktop.addEventListener('change', resize);
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('focusin', closeOutside);
    return () => {
      window.removeEventListener('scroll', onScroll);
      desktop.removeEventListener('change', resize);
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('focusin', closeOutside);
    };
  }, []);

  return <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}><div className="wrap nav-bar">
    <a href="/" className="brand" aria-label="Bible Diaries home" onClick={closeMenu}><Logo/><span>Bible <b>Diaries</b></span></a>
    <nav className="navigation desktop-navigation" aria-label="Main navigation"><NavigationLinks/></nav>
    {/* Native disclosure remains operable before hydration or without JavaScript. */}
    <details ref={menuRef} className="mobile-navigation">
      {/* From Uiverse.io by JulanDeAlb; native summary supplies keyboard/expanded semantics. */}
      <summary ref={toggleRef} id="menu-toggle" className="menu-toggle hamburger" aria-label="Navigation menu" aria-controls="site-navigation">
        <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false">
          <path className="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"/>
          <path className="line" d="M7 16 27 16"/>
        </svg>
      </summary>
      <nav id="site-navigation" className="navigation" aria-label="Mobile navigation"><NavigationLinks onNavigate={closeMenu}/></nav>
    </details>
  </div></header>;
}
