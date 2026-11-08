'use client';
import Link from 'next/link';
import {useApp} from '../AppWrapper';
import {SETTINGS_GROUPS} from '../../../shared/diary-settings.mjs';
export default function Settings(){const {user,profile}=useApp();return <main className="diary-settings"><h1>Settings</h1><p>{profile?.full_name} · {user?.email}</p><Link className="diary-settings-row" href="/reviews"><strong>My reviews & appeals ›</strong><span>Manage held drafts, editing and appeals.</span></Link>{SETTINGS_GROUPS.map(([key,title,description])=><Link className="diary-settings-row" href={`/settings/${key}`} key={key}><strong>{title} ›</strong><span>{description}</span></Link>)}</main>;}
