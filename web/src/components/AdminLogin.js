"use client";
import { useRef, useState } from "react";
export default function AdminLogin({ configured, moderation = false }) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch(
        moderation ? "/api/moderation/login" : "/api/admin/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.get("email"),
            password: data.get("password"),
            code: data.get("code"),
          }),
          signal: AbortSignal.timeout(30000),
        },
      );
      const result = await response.json();
      if (!response.ok || result.success !== true)
        throw new Error(result.error || "Unable to sign in. Please try again.");
      form.reset();
      window.location.assign(
        moderation ? "/admin/moderation" : "/admin/waitlist",
      );
    } catch (error) {
      setMessage(
        error.name === "TimeoutError"
          ? "Sign-in timed out. Please try again."
          : error.message || "Sign-in is temporarily unavailable.",
      );
    } finally {
      const password = form.elements.namedItem("password");
      if (password) password.value = "";
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="admin-login-form" onSubmit={submit} aria-busy={busy}>
      <h2>
        {moderation
          ? "Moderator sign-in"
          : "Waiting-list administrator sign-in"}
      </h2>
      <p>
        {moderation
          ? "Use an account explicitly assigned a Bible Diaries moderation role."
          : "Use your verified Bible Diaries waiting-list administrator account."}
      </p>
      {!configured && (
        <p className="admin-notice" role="status">
          Admin sign-in needs server configuration before it can be used.
          Contact the site owner.
        </p>
      )}
      <label htmlFor="admin-email">Email address</label>
      <input
        name="email"
        id="admin-email"
        type="email"
        autoComplete="username"
        maxLength={254}
        required
        disabled={!configured || busy}
      />
      <label htmlFor="admin-password">Password</label>
      <input
        name="password"
        id="admin-password"
        type="password"
        autoComplete="current-password"
        maxLength={1024}
        required
        disabled={!configured || busy}
      />
      <label htmlFor="admin-code">Authenticator code</label>
      <input
        name="code"
        id="admin-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        disabled={!configured || busy}
      />
      <button type="submit" className="button" disabled={!configured || busy}>
        {busy ? "Signing in…" : "Sign in securely"}{" "}
        <span aria-hidden="true">↗</span>
      </button>
      <p role="alert" className="admin-error">
        {message}
      </p>
      <p className="fineprint">
        Access is restricted to approved administrators. A verified
        authenticator is required for both workspaces. Enrol it in app Settings
        → Security first. Sessions expire automatically. For account help,
        contact <a href="mailto:support@ts-industries.com">support</a>.
      </p>
    </form>
  );
}
