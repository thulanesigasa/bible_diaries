"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { ageAt, POLICY_VERSION } from "../../shared/launch-safety.mjs";
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export default function RegistrationFlow({ existing = false }) {
  const router = useRouter(),
    [step, setStep] = useState(existing ? 1 : 0),
    [first, setFirst] = useState(""),
    [surname, setSurname] = useState(""),
    [email, setEmail] = useState(""),
    [year, setYear] = useState(""),
    [month, setMonth] = useState(""),
    [day, setDay] = useState(""),
    [guardian, setGuardian] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [message, setMessage] = useState(""),
    [account, setAccount] = useState(null);
  const birth =
      year && month && day
        ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        : "",
    age = ageAt(birth),
    days =
      year && month
        ? new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate()
        : 31;
  useEffect(() => {
    if (day && Number(day) > days) setDay(String(days));
  }, [days, day]);
  useEffect(() => {
    if (!existing) return;
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (active) {
        setAccount(user);
        setEmail(user?.email || "");
      }
    });
    return () => {
      active = false;
    };
  }, [existing]);
  function dateChange(setter, value) {
    setter(value);
    setAccepted(false);
    setMessage("");
  }
  async function submit(e) {
    e.preventDefault();
    setMessage("");
    if (busy) return;
    if (step === 0) {
      if (!first.trim() || !surname.trim()) {
        setMessage("Enter your name and surname.");
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      if (age === null || age < 13) {
        setMessage(
          "Select a valid birth date. Accounts are available from age 13.",
        );
        return;
      }
      if (
        age < 18 &&
        (!guardian.trim() ||
          guardian.trim().toLowerCase() === email.toLowerCase())
      ) {
        setMessage("Enter a separate guardian email address.");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2 && !accepted) return;
    if (step === 2 && !existing) {
      setStep(3);
      return;
    }
    if (!existing && (password.length < 12 || password !== confirm)) {
      setMessage("Use at least 12 characters and match both passwords.");
      return;
    }
    setBusy(true);
    try {
      const eligibility = {
        birth_date: birth,
        guardian_email: age < 18 ? guardian.trim().toLowerCase() : null,
        accepted: true,
        policy_version: POLICY_VERSION,
      };
      if (existing) {
        if (!account) throw Error("Sign in again to complete registration.");
        const { data, error } = await supabase.rpc(
          "complete_account_setup",
          eligibility,
        );
        if (error) throw error;
        window.dispatchEvent(
          new CustomEvent("diary-eligibility-changed", {
            detail: { userId: account.id, status: data },
          }),
        );
        router.replace("/feed");
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: first.trim(),
              surname: surname.trim(),
              full_name: `${first.trim()} ${surname.trim()}`,
              signup_eligibility: eligibility,
            },
          },
        });
        if (error) throw error;
        setPassword("");
        setConfirm("");
        setDone(true);
        setMessage(
          "Check your email to confirm your address, then sign in. Your birth date and consent were included in signup; you will not enter them again after sign-in. Members under 18 still need guardian approval. If you already have an account, sign in or use password recovery.",
        );
      }
    } catch (e) {
      setMessage(
        e.message || "Registration could not be confirmed. Retry later.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="launch-panel registration-flow">
      <p className="registration-brand">BIBLE DIARIES</p>
      <h1>
        {done
          ? "Check your email"
          : existing
            ? "Complete your registration"
            : "Begin your journey"}
      </h1>
      {!done && (
        <>
          <p>
            {existing
              ? "Finish the missing signup details once. Your account and existing password stay in place."
              : `Step ${step + 1} of 4 · ${["Personal details", "Birth date", "Terms & privacy", "Create password"][step]}`}
          </p>
          <div className="registration-progress" aria-hidden="true">
            {Array.from({ length: existing ? 3 : 4 }, (_, i) => (
              <span
                key={i}
                style={{ background: i <= step ? "#0369a1" : "#e2e8f0" }}
              />
            ))}
          </div>
          <form onSubmit={submit}>
            {step === 0 && (
              <>
                <p>
                  Start with your account details. Optional profile information
                  can be added later in Settings.
                </p>
                <label>
                  First name
                  <input
                    required
                    maxLength={80}
                    value={first}
                    onChange={(e) => setFirst(e.target.value)}
                    autoComplete="given-name"
                  />
                </label>
                <label>
                  Surname
                  <input
                    required
                    maxLength={80}
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    autoComplete="family-name"
                  />
                </label>
                <label>
                  Email address
                  <input
                    type="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>
              </>
            )}
            {step === 1 && (
              <>
                <h2>When were you born?</h2>
                <p>
                  Your birth date is kept in a restricted account record.
                  Accounts are available from age 13.
                </p>
                <fieldset className="birth-picker">
                  <legend>Birth date</legend>
                  <label>
                    Day
                    <select
                      aria-label="Day"
                      required
                      value={day}
                      onChange={(e) => dateChange(setDay, e.target.value)}
                    >
                      <option value="">Day</option>
                      {Array.from({ length: days }, (_, i) => (
                        <option key={i} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Month
                    <select
                      aria-label="Month"
                      required
                      value={month}
                      onChange={(e) => dateChange(setMonth, e.target.value)}
                    >
                      <option value="">Month</option>
                      {months.map((m, i) => (
                        <option key={m} value={i + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Year
                    <select
                      aria-label="Year"
                      required
                      value={year}
                      onChange={(e) => dateChange(setYear, e.target.value)}
                    >
                      <option value="">Year</option>
                      {Array.from(
                        { length: 121 },
                        (_, i) => new Date().getUTCFullYear() - i,
                      ).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
                {age !== null && age < 18 && (
                  <label>
                    Parent or legal guardian email
                    <input
                      type="email"
                      required
                      maxLength={254}
                      value={guardian}
                      onChange={(e) => {
                        setGuardian(e.target.value);
                        setAccepted(false);
                      }}
                    />
                    <small>
                      A separate verified adult guardian account must approve
                      participation.
                    </small>
                  </label>
                )}
              </>
            )}
            {step === 2 && (
              <>
                <h2>Before you join</h2>
                <p>
                  Submitted text, including private entries and messages, is
                  processed by OpenAI moderation. Read the notices before
                  accepting. These links open a separate tab so your signup
                  details stay here.
                </p>
                <nav
                  className="registration-notices"
                  aria-label="Signup notices"
                >
                  {[
                    ["Terms of Use", "/terms"],
                    ["Privacy Policy", "/privacy"],
                    ["Community Expectations", "/policies/community"],
                    ["Child Safety Standards", "/child-safety"],
                  ].map(([label, path]) => (
                    <a
                      key={path}
                      href={path}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {label} ↗
                    </a>
                  ))}
                </nav>
                <label className="launch-check">
                  <input
                    type="checkbox"
                    required
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                  />
                  I accept the terms and community standards and acknowledge the
                  privacy notice.
                </label>
              </>
            )}
            {step === 3 && (
              <>
                <h2>Create your password</h2>
                <p>
                  Use at least 12 characters and a unique password or
                  passphrase.
                </p>
                <label>
                  Password
                  <input
                    type="password"
                    required
                    minLength={12}
                    maxLength={128}
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
                    maxLength={128}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                </label>
              </>
            )}
            {!!message && <p role="alert">{message}</p>}
            <button disabled={busy || (step === 2 && !accepted)}>
              {busy
                ? "Saving…"
                : step === 3
                  ? "Create account"
                  : step === 2
                    ? existing
                      ? "Finish registration"
                      : "Create password"
                    : "Continue"}
            </button>
            {step > (existing ? 1 : 0) && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setStep(step - 1);
                  setMessage("");
                }}
              >
                Back
              </button>
            )}
          </form>
        </>
      )}
      {done && <p role="status">{message}</p>}
      {existing ? (
        <button
          disabled={busy}
          onClick={() => supabase.auth.signOut({ scope: "local" })}
        >
          Sign out
        </button>
      ) : (
        <Link href="/login">Already registered? Sign in</Link>
      )}
    </main>
  );
}
