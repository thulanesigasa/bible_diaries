"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { ageAt } from "../../../shared/launch-safety.mjs";
export default function Register() {
  const [first, setFirst] = useState(""),
    [surname, setSurname] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [birth, setBirth] = useState(""),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const age = ageAt(birth);
    if (age === null || age < 13) {
      setMessage(
        "Enter a valid birth date. Accounts are available from age 13.",
      );
      return;
    }
    if (password.length < 12 || password !== confirm || !accepted) {
      setMessage(
        "Use at least 12 characters, match both passwords and accept the terms.",
      );
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: first.trim(),
            surname: surname.trim(),
            full_name: `${first.trim()} ${surname.trim()}`,
          },
        },
      });
      if (error) throw error;
      setPassword("");
      setConfirm("");
      setMessage(
        "Check your email to confirm your address, then sign in and complete the secure age and consent check. If you already have an account, sign in or use password recovery.",
      );
    } catch (e) {
      setMessage(
        e.message || "Registration could not be confirmed. Retry later.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="launch-panel">
      <p>BIBLE DIARIES</p>
      <h1>Begin your journey</h1>
      <p>
        Accounts are for ages 13+. Members under 18 need approval from a
        separate verified adult guardian account before participating.
      </p>
      <form onSubmit={submit}>
        <label>
          First name
          <input
            required
            value={first}
            maxLength={80}
            onChange={(e) => setFirst(e.target.value)}
            autoComplete="given-name"
          />
        </label>
        <label>
          Surname
          <input
            required
            value={surname}
            maxLength={80}
            onChange={(e) => setSurname(e.target.value)}
            autoComplete="family-name"
          />
        </label>
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            maxLength={254}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label>
          Birth date
          <input
            type="date"
            required
            value={birth}
            onChange={(e) => setBirth(e.target.value)}
          />
        </label>
        <p>
          The birth date above is an on-device eligibility check. You will
          record it securely after email confirmation; it is not sent in signup
          metadata.
        </p>
        <label>
          Password
          <input
            type="password"
            minLength={12}
            maxLength={128}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirm password
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <p>
          <Link href="/terms">Terms</Link> ·{" "}
          <Link href="/privacy">Privacy</Link> ·{" "}
          <Link href="/community-guidelines">Community standards</Link> ·{" "}
          <Link href="/child-safety">Child safety</Link>
        </p>
        <label className="launch-check">
          <input
            type="checkbox"
            required
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          I accept the terms and community standards and acknowledge the privacy
          notice.
        </label>
        <button disabled={busy || !accepted}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      {!!message && <p role="status">{message}</p>}
      <Link href="/login">Already registered? Sign in</Link>
    </main>
  );
}
