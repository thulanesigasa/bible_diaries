"use client";
import Link from "next/link";
import {
  UserRound,
  Trophy,
  Type,
  LockKeyhole,
  ShieldCheck,
  Bell,
  Moon,
  Bookmark,
  UserRoundX,
  Download,
  MonitorSmartphone,
  CircleHelp,
  FileText,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";
import { useApp } from "../AppWrapper";
import Avatar from "../../components/Avatar";
import { SETTINGS_GROUPS } from "../../../shared/diary-settings.mjs";
import { SETTINGS_SECTIONS } from "../../../shared/settings-presentation.mjs";
const icons = {
  account: UserRound,
  achievements: Trophy,
  reading: Type,
  privacy: LockKeyhole,
  security: ShieldCheck,
  notifications: Bell,
  quiet: Moon,
  saved: Bookmark,
  blocked: UserRoundX,
  data: Download,
  sessions: MonitorSmartphone,
  support: CircleHelp,
  legal: FileText,
};
function Row({ href, title, description, Icon }) {
  return (
    <Link className="settings-menu-row" href={href}>
      <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
      <span className="settings-menu-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <ChevronRight size={17} aria-hidden="true" />
    </Link>
  );
}
export default function Settings() {
  const { user, profile } = useApp();
  return (
    <main className="diary-settings settings-index">
      <h1>Settings</h1>
      <Link href="/settings/account" className="settings-profile">
        <Avatar
          size={52}
          src={profile?.avatar_url}
          fullName={profile?.full_name}
          email={user?.email}
        />
        <span className="settings-menu-copy">
          <strong>{profile?.full_name || "Your Bible Diaries"}</strong>
          <small>{user?.email}</small>
          <span>Edit your profile</span>
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </Link>
      <Row
        href="/settings/safety"
        title="Safety & reports"
        description="Raise concerns and track outcomes"
        Icon={ShieldCheck}
      />
      <Row
        href="/settings/guardian"
        title="Guardian permissions"
        description="Approve or withdraw participation"
        Icon={UserRound}
      />
      <Row
        href="/reviews"
        title="My reviews & appeals"
        description="Held posts, decisions and appeals"
        Icon={ClipboardCheck}
      />
      {SETTINGS_SECTIONS.map(([heading, keys]) => (
        <section className="settings-menu-group" key={heading}>
          <h2>{heading}</h2>
          {keys.map((key) => {
            const item = SETTINGS_GROUPS.find((x) => x[0] === key);
            return (
              item && (
                <Row
                  key={key}
                  href={`/settings/${key}`}
                  title={item[1]}
                  description={item[2]}
                  Icon={icons[key]}
                />
              )
            );
          })}
        </section>
      ))}
      <p className="settings-footer">Bible Diaries · Your walk. Your words.</p>
    </main>
  );
}
