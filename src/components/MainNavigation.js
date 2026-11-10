'use client';
import {useRef} from 'react';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
export default function MainNavigation({appUrl}){
 const menu=useRef(null);
 const links=<><Link href="/#experience">Explore</Link><Link href="/#on-every-screen">On your devices</Link><Link href="/faq">FAQ</Link><Link href="/support">Support</Link><Link className="main-small-button" href={appUrl+'/login'}>Open the app <ArrowUpRight size={14}/></Link></>;
 return <><nav className="main-desktop-nav" aria-label="Website navigation">{links}</nav><details className="main-mobile-navigation" ref={menu}><summary aria-label="Open website menu" className="main-menu-toggle"><svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true"><path className="main-menu-line main-menu-loop" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"/><path className="main-menu-line" d="M7 16 27 16"/></svg></summary><nav aria-label="Mobile website navigation" onClick={event=>{if(event.target.closest('a'))menu.current?.removeAttribute('open');}} onKeyDown={event=>{if(event.key==='Escape'){menu.current?.removeAttribute('open');menu.current?.querySelector('summary')?.focus();}}}>{links}</nav></details></>;
}
