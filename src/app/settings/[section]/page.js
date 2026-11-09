"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import AppPolicies from "../../../components/AppPolicies";
import ReadingPreferences from "../../../components/ReadingPreferences";
import { supabase } from "../../../lib/supabase";
import { useDiarySettings } from "../../../lib/diary-settings";
import { useApp } from "../../AppWrapper";
import {
  ACHIEVEMENTS,
  SETTINGS_GROUPS,
} from "../../../../shared/diary-settings.mjs";
async function exportData(userId) {
  let ownership = [],
    bookmarks = [];
  for (const [table, list] of [
    ["diary_owners", ownership],
    ["favorites", bookmarks],
  ]) {
    for (let offset = 0; ; offset += 500) {
      const r = await supabase
        .from(table)
        .select("post_id")
        .eq("user_id", userId)
        .order("post_id")
        .range(offset, offset + 499);
      if (r.error) throw Error("Export could not finish.");
      list.push(...r.data);
      if (r.data.length < 500) break;
    }
  }
  let reflections = [];
  for (let i = 0; i < ownership.length; i += 100) {
    const r = await supabase
      .from("diaries")
      .select(
        "id,title,scripture,content,category,visibility,is_anonymous,created_at",
      )
      .in(
        "id",
        ownership.slice(i, i + 100).map((x) => x.post_id),
      );
    if (r.error) throw Error("Export could not finish.");
    reflections.push(...r.data);
  }
  return JSON.stringify(
    {
      format: "bible-diaries-v1",
      exportedAt: new Date().toISOString(),
      reflections,
      bookmarks,
    },
    null,
    2,
  );
}
export default function Section({ params }) {
  const { section } = use(params),
    { user, profile, setProfile } = useApp(),
    { settings, save, error, ready } = useDiarySettings(user?.id);
  const [items, setItems] = useState([]),
    [earned, setEarned] = useState([]),
    [progress, setProgress] = useState({}),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [start, setStart] = useState("22:00"),
    [end, setEnd] = useState("07:00"),
    [exportPassword, setExportPassword] = useState("");
  useEffect(() => {
    setStart(settings.quiet_start);
    setEnd(settings.quiet_end);
  }, [settings.quiet_start, settings.quiet_end]);
  async function run(fn) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e.message || "Could not complete this request.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!user) return;
    let active = true;
    async function load() {
      let r;
      if (section === "achievements") {
        const [a, p] = await Promise.all([
          supabase
            .from("diary_achievements")
            .select("*")
            .eq("user_id", user.id),
          supabase.rpc("my_diary_progress"),
        ]);
        if (a.error || p.error) throw Error("Achievements could not load.");
        if (active) {
          setEarned(a.data);
          setProgress(p.data);
        }
        const unseen = a.data
          .filter((x) => !x.seen_at)
          .map((x) => x.achievement_id);
        if (unseen.length) {
          const marked = await supabase
            .from("diary_achievements")
            .update({ seen_at: new Date().toISOString() })
            .eq("user_id", user.id)
            .in("achievement_id", unseen);
          if (marked.error) throw Error("Could not mark achievements as seen.");
        }
      }
      if (section === "blocked")
        r = await supabase
          .from("blocked_accounts")
          .select("*")
          .eq("user_id", user.id);
      if (section === "saved")
        r = await supabase
          .from("favorites")
          .select("post_id,diaries(id,title,content)")
          .eq("user_id", user.id)
          .limit(100);
      if (section === "sessions") r = await supabase.rpc("my_diary_sessions");
      if (r?.error) throw Error("This section could not load.");
      if (active && r) setItems(r.data || []);
    }
    load().catch((e) => {
      if (active) setMessage(e.message);
    });
    return () => {
      active = false;
    };
  }, [user, section]);
  const toggle = (label, description, value, fn) => (
    <label
      className="diary-settings-row"
      style={{ flexDirection: "row", justifyContent: "space-between" }}
    >
      <span>
        <strong>{label}</strong>
        <small style={{ display: "block", marginTop: 7 }}>{description}</small>
      </span>
      <input
        type="checkbox"
        disabled={busy}
        checked={!!value}
        onChange={(e) => run(() => fn(e.target.checked))}
      />
    </label>
  );
  const persist = (patch) => save(patch);
  const changeProfile = async (patch) => {
    const r = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (r.error) throw Error("Could not save privacy settings.");
    setProfile({ ...profile, ...patch });
  };
  async function download(encrypted) {
    let data = await exportData(user.id);
    if (encrypted) {
      if (exportPassword.length < 12)
        throw Error("Use an export password of at least 12 characters.");
      const salt = crypto.getRandomValues(new Uint8Array(16)),
        iv = crypto.getRandomValues(new Uint8Array(12)),
        enc = new TextEncoder(),
        material = await crypto.subtle.importKey(
          "raw",
          enc.encode(exportPassword),
          "PBKDF2",
          false,
          ["deriveKey"],
        ),
        key = await crypto.subtle.deriveKey(
          { name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
          material,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt"],
        ),
        ciphertext = new Uint8Array(
          await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            enc.encode(data),
          ),
        ),
        hex = (a) =>
          Array.from(a, (x) => x.toString(16).padStart(2, "0")).join("");
      data = JSON.stringify({
        format: "bible-diaries-encrypted-v1",
        kdf: "PBKDF2-SHA256",
        iterations: 210000,
        cipher: "AES-256-GCM",
        salt: hex(salt),
        iv: hex(iv),
        ciphertext: hex(ciphertext),
      });
    }
    const url = URL.createObjectURL(
        new Blob([data], { type: "application/json" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = `bible-diaries${encrypted ? ".encrypted" : ""}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportPassword("");
  }
  return (
    <main className="diary-settings">
      <Link href="/settings">← Settings</Link>
      <h1>
        {SETTINGS_GROUPS.find((x) => x[0] === section)?.[1] || "Settings"}
      </h1>
      {(message || error) && <p role="status">{message || error}</p>}
      {section === "reading" && <ReadingPreferences settings={settings} disabled={busy || !ready} onChange={patch => run(() => persist(patch))} />}
      {section === "privacy" && (
        <>
          {toggle(
            "Private profile",
            "Hide your profile from browsing. Existing posts keep their own visibility.",
            profile?.privacy_mode === "private",
            (v) => changeProfile({ privacy_mode: v ? "private" : "public" }),
          )}
          {toggle(
            "Allow direct messages",
            "Accept private conversations.",
            profile?.allow_dms !== false,
            (v) => changeProfile({ allow_dms: v }),
          )}
          {[
            ["default_private", "Private entries by default"],
            ["default_anonymous", "Anonymous posting by default"],
            ["default_comments", "Allow comments by default"],
            ["default_likes", "Allow likes by default"],
          ].map(([key, label]) => (
            <div key={key}>
              {toggle(
                label,
                "Applies to new reflections; change before publishing.",
                settings[key],
                (v) => persist({ [key]: v }),
              )}
            </div>
          ))}
          <p>
            Bookmarks stay private. Public reflections may be copied by people
            who see them.
          </p>
        </>
      )}
      {section === "notifications" && (
        <>
          {["likes", "comments", "bookmarks", "shares", "posts"].map((x) => (
            <div key={x}>
              {toggle(
                x[0].toUpperCase() + x.slice(1),
                "Include new interactions in the activity inbox.",
                settings["notify_" + x],
                (v) => persist({ ["notify_" + x]: v }),
              )}
            </div>
          ))}
          <Link href="/activity">Open Activity & Notifications →</Link>
          <p>
            Controls the in-app inbox; does not activate email or push delivery.
          </p>
        </>
      )}
      {section === "quiet" && (
        <>
          {toggle(
            "Quiet hours",
            "Pause unread activity indicators. The inbox remains available.",
            settings.quiet_enabled,
            (v) => persist({ quiet_enabled: v }),
          )}
          <p>Device-local time. A window crossing midnight is supported.</p>
          <label>
            Start{" "}
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            End{" "}
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <button
            disabled={busy}
            onClick={() =>
              run(() => persist({ quiet_start: start, quiet_end: end }))
            }
          >
            Save quiet hours
          </button>
        </>
      )}
      {section === "achievements" && (
        <>
          <p>Personal milestones, not a measure of anyone’s faith.</p>
          {ACHIEVEMENTS.map((a) => {
            const e = earned.find((x) => x.achievement_id === a.id),
              n = Math.min(progress[a.category] || 0, a.target);
            return (
              <div className="diary-settings-row" key={a.id}>
                <strong>
                  {e ? "✓ " : ""}
                  {a.title}
                </strong>
                <span>
                  {e
                    ? `Earned ${new Date(e.earned_at).toLocaleDateString()}`
                    : `${n} / ${a.target} ${a.category}`}
                </span>
                <progress
                  aria-label={a.title}
                  max={a.target}
                  value={e ? a.target : n}
                />
              </div>
            );
          })}
        </>
      )}
      {section === "security" && (
        <>
          <h2>Password & account access</h2>
          <Link href="/reset-password">
            Change your password using a recovery email →
          </Link>
          <h2>Capture protection</h2>
          <p>
            Native password and PIN entry uses screen capture protection.
            Websites cannot reliably blank built-in or third-party screen
            recordings. Keep password fields masked and stop recording before
            typing credentials.
          </p>
          <h2>Native app lock</h2>
          <p>
            PIN, biometric unlock, inactivity locking and the app-switcher
            shield are managed in the Android/iOS Bible Diaries app, on each
            device. They are not browser security controls.
          </p>
        </>
      )}
      {section === "blocked" && (
        <>
          {!items.length && (
            <p>No blocked accounts. Block a member from their profile.</p>
          )}
          {items.map((x) => (
            <div key={x.blocked_user_id} className="diary-settings-row">
              <span>Account {x.blocked_user_id.slice(0, 8)}</span>
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const r = await supabase
                      .from("blocked_accounts")
                      .delete()
                      .eq("user_id", user.id)
                      .eq("blocked_user_id", x.blocked_user_id);
                    if (r.error) throw Error("Could not unblock account.");
                    setItems(
                      items.filter(
                        (y) => y.blocked_user_id !== x.blocked_user_id,
                      ),
                    );
                  })
                }
              >
                Unblock
              </button>
            </div>
          ))}
        </>
      )}
      {section === "saved" && (
        <>
          <p>Your latest 100 private bookmarks.</p>
          {items
            .filter((x) => x.diaries)
            .map((x) => (
              <Link
                className="diary-settings-row"
                key={x.post_id}
                href={`/post/${x.post_id}`}
              >
                {x.diaries.title ||
                  x.diaries.content?.slice(0, 100) ||
                  "Reflection"}
              </Link>
            ))}
          {!items.length && <p>No saved reflections yet.</p>}
        </>
      )}
      {section === "data" && (
        <>
          <p>
            Export your own reflections and bookmark references. Readable JSON
            contains personal information. Keep it private.
          </p>
          <label>
            Encrypted export password{" "}
            <input
              type="password"
              autoComplete="new-password"
              value={exportPassword}
              onChange={(e) => setExportPassword(e.target.value)}
            />
          </label>
          <button disabled={busy} onClick={() => run(() => download(true))}>
            Export encrypted backup
          </button>
          <button disabled={busy} onClick={() => run(() => download(false))}>
            Export readable JSON
          </button>
          <p>
            AES-256-GCM with PBKDF2-SHA256. Keep your export password; it cannot
            be recovered. Import is not currently offered.
          </p>
        </>
      )}
      {section === "sessions" && (
        <>
          <p>
            Sessions from the authentication service. Already downloaded copies
            cannot be recalled.
          </p>
          {items.map((x) => (
            <div key={x.id} className="diary-settings-row">
              <strong>{x.current ? "This session" : "Other session"}</strong>
              <span>{x.user_agent || "Device details unavailable"}</span>
              <small>
                {x.updated_at ? new Date(x.updated_at).toLocaleString() : ""}
              </small>
            </div>
          ))}
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await supabase.auth.signOut({ scope: "others" });
                if (r.error) throw r.error;
                const s = await supabase.rpc("my_diary_sessions");
                if (s.error) throw s.error;
                setItems(s.data);
                setMessage("Other sessions signed out.");
              })
            }
          >
            Sign out other devices
          </button>
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await supabase.auth.signOut({ scope: "global" });
                if (r.error) throw r.error;
              })
            }
          >
            Sign out all devices
          </button>
        </>
      )}
      {section === "support" && (
        <>
          <h2>Support</h2>
          <p>
            Include the error text, app/browser version and approximate time.
            Never send passwords, PINs or one-time codes.
          </p>
          <a href="mailto:support@ts-industries.com">
            support@ts-industries.com
          </a>
          <Link href="/guidelines">Community guidelines →</Link>
          <p>
            Support is not an emergency service. If someone is in immediate
            danger, contact local emergency services or a trusted person who can
            help immediately.
          </p>
        </>
      )}
      {section === "legal" && <AppPolicies />}

    </main>
  );
}
