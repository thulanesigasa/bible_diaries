"use client";

import EligibilityGate from "../components/EligibilityGate";
import "../components/launch-safety.css";
import { AchievementBell } from "../components/DiaryShortcuts";
import { useDiarySettings } from "../lib/diary-settings";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  BookOpen,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  Loader,
  Heart,
  Filter,
} from "lucide-react";
import Avatar from "../components/Avatar";

const PUBLIC_PAGES = new Set([
  "/",
  "/about",
  "/features",
  "/how-it-works",
  "/pc",
  "/faq",
  "/support",
  "/safety",
  "/security",
  "/community-guidelines",
  "/legal",
  "/privacy",
  "/terms",
  "/cookies",
  "/child-safety",
  "/account-deletion",
  "/guardian",
]);
const AppContext = createContext({
  user: null,
  profile: null,
  setProfile: () => {},
  showToast: () => {},
  loading: true,
});

export const useApp = () => useContext(AppContext);

export default function AppWrapper({ children }) {
  const [user, setUser] = useState(null);
  const userIdRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const { settings: readingSettings, reload: reloadReading } = useDiarySettings(
    user?.id,
  );
  useEffect(() => {
    window.addEventListener("diary-settings-changed", reloadReading);
    return () =>
      window.removeEventListener("diary-settings-changed", reloadReading);
  }, [reloadReading]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const router = useRouter();
  const pathname = usePathname();
  const isPublicPage =
    PUBLIC_PAGES.has(pathname) ||
    pathname.startsWith("/help/") ||
    pathname.startsWith("/policies/");

  const showToast = (message, type = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    let active = true;

    // Load auth session
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(async () => {
        if (!active) return;

        const currentUser = session?.user || null;
        userIdRef.current = currentUser?.id || null;
        setUser(currentUser);
        setProfile(null);

        if (currentUser) {
          // Fetch additional profile fields
          try {
            const { data, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", currentUser.id);

            if (!active || userIdRef.current !== currentUser.id) return;
            if (data && data[0]) {
              const { data: contacts } = await supabase
                .from("profile_contacts")
                .select("address,phone_number")
                .eq("user_id", currentUser.id)
                .maybeSingle();
              if (active && userIdRef.current === currentUser.id)
                setProfile({ ...data[0], ...contacts });
            } else {
              // Fallback profile if row doesn't exist yet
              setProfile({
                id: currentUser.id,
                full_name:
                  currentUser.user_metadata?.full_name || "Anonymous Believer",
                avatar_url: currentUser.user_metadata?.avatar_url || null,
                bio: currentUser.user_metadata?.bio || "",
                favorite_verse: currentUser.user_metadata?.favorite_verse || "",
                spiritual_journey:
                  currentUser.user_metadata?.spiritual_journey || "",
              });
            }
          } catch (err) {
            console.error("Operation failed.");
          }
        } else {
          setProfile(null);
        }

        if (active) setLoading(false);
      }, 0);
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Redirect handling based on auth state
  useEffect(() => {
    if (loading) return;

    const isAuthPage =
      pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/reset-password";

    if (
      !user &&
      ((!isAuthPage && !isPublicPage) || pathname === "/complete-registration")
    ) {
      router.push("/login");
    } else if (user && isAuthPage && pathname !== "/reset-password") {
      router.push("/feed");
    }
  }, [user, loading, pathname, router, isPublicPage]);

  // Handle dynamic gender styling class on body
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (profile) {
        if (profile.gender === "Female") {
          document.body.classList.add("theme-female");
        } else {
          document.body.classList.remove("theme-female");
        }
      } else {
        if (pathname !== "/register") {
          document.body.classList.remove("theme-female");
        }
      }
    }
  }, [profile, pathname]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Logged out successfully.");
      router.push("/login");
    }
  };

  const isAuthPage =
    isPublicPage ||
    pathname === "/complete-registration" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/reset-password";

  if (loading && !isPublicPage) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: "1rem",
          backgroundColor: "var(--bg-secondary)",
        }}
      >
        <Loader
          className="spinner"
          style={{ color: "var(--gold-accent)", width: "32px", height: "32px" }}
        />
        <p
          style={{
            color: "var(--text-secondary)",
            fontStyle: "italic",
            fontFamily: "serif",
          }}
        >
          Aligning hearts...
        </p>
      </div>
    );
  }

  return (
    <EligibilityGate
      user={user}
      onReady={async () => {
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        if (data) {
          const { data: contacts } = await supabase
            .from("profile_contacts")
            .select("address,phone_number")
            .eq("user_id", user.id)
            .maybeSingle();
          if (userIdRef.current === user.id)
            setProfile({ ...data, ...contacts });
        }
      }}
      bypass={
        isPublicPage ||
        pathname === "/reset-password" ||
        pathname === "/complete-registration"
      }
    >
      <AppContext.Provider
        value={{ user, profile, setProfile, showToast, loading }}
      >
        <div
          className={!isAuthPage && user ? "app-layout-wrapper" : ""}
          style={{
            "--diary-font-size": `${readingSettings.font_size}px`,
            "--diary-line-spacing": readingSettings.line_spacing,
            "--diary-font-family":
              readingSettings.font_family === "serif"
                ? "Georgia,serif"
                : readingSettings.font_family === "mono"
                  ? "monospace"
                  : "Arial,sans-serif",
          }}
        >
          {!isAuthPage && user && (
            <header className="app-header">
              <Link
                href="/feed"
                className="app-logo"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                <img
                  src="/logo.png"
                  alt="Bible Diaries"
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "4px",
                    objectFit: "contain",
                  }}
                />
                <span>
                  bible_<span>diaries</span>
                </span>
              </Link>

              {pathname === "/feed" && <AchievementBell />}
              <nav className="app-nav">
                <Link
                  href="/feed"
                  className={`nav-link ${pathname === "/feed" ? "active" : ""}`}
                >
                  <BookOpen size={18} />
                  <span>Feed</span>
                </Link>
                <Link
                  href="/filters"
                  className={`nav-link ${pathname === "/filters" ? "active" : ""}`}
                >
                  <Filter size={18} />
                  <span>Filters</span>
                </Link>
                <Link
                  href="/connect"
                  className={`nav-link ${pathname.startsWith("/connect") ? "active" : ""}`}
                >
                  <Users size={18} />
                  <span>Connect</span>
                </Link>
                <Link
                  href="/chat"
                  className={`nav-link ${pathname.startsWith("/chat") ? "active" : ""}`}
                >
                  <MessageSquare size={18} />
                  <span>Chat</span>
                </Link>
                <Link
                  href="/settings"
                  className={`nav-link ${pathname.startsWith("/settings") ? "active" : ""}`}
                >
                  <Settings size={18} />
                  <span>Settings</span>
                </Link>

                {profile && (
                  <div className="user-badge">
                    <Link
                      href="/settings"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <Avatar
                        src={profile.avatar_url}
                        fullName={profile.full_name}
                        email={user?.email}
                        size={32}
                        style={{
                          border: "1.5px solid rgba(14, 165, 233, 0.2)",
                        }}
                      />
                      <span className="user-badge-name">
                        {profile.full_name}
                      </span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="nav-link"
                      style={{
                        cursor: "pointer",
                        padding: "0.4rem",
                        border: "none",
                        background: "transparent",
                        marginLeft: "0.5rem",
                      }}
                      title="Logout"
                    >
                      <LogOut size={18} style={{ color: "#EF4444" }} />
                    </button>
                  </div>
                )}
              </nav>
            </header>
          )}

          <main
            style={{
              flex: 1,
              overflowY: !isAuthPage && user ? "auto" : "visible",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ flex: 1 }}>{children}</div>

            {!isAuthPage && user && (
              <footer className="app-footer" style={{ marginTop: "auto" }}>
                <div className="container footer-grid">
                  <div>
                    <div className="footer-logo">
                      bible_<span>diaries</span>
                    </div>
                    <p className="footer-desc">
                      Empowering believers with daily reflections, journaling,
                      and fellowship. Share your spiritual walk.
                    </p>
                    <div className="footer-socials">
                      <a
                        href="https://github.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-social-link"
                      >
                        <svg
                          style={{ width: "20px", height: "20px" }}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                          <path d="M9 18c-4.51 2-5-2-7-2"></path>
                        </svg>
                      </a>
                      <a
                        href="https://linkedin.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-social-link"
                      >
                        <svg
                          style={{ width: "20px", height: "20px" }}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                          <rect x="2" y="9" width="4" height="12"></rect>
                          <circle cx="4" cy="4" r="2"></circle>
                        </svg>
                      </a>
                      <a
                        href="https://tiktok.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-social-link"
                      >
                        <svg
                          style={{ width: "20px", height: "20px" }}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
                        </svg>
                      </a>
                    </div>
                  </div>
                  <div>
                    <h4 className="footer-title">Reflections</h4>
                    <ul className="footer-links">
                      <li className="footer-link-item">
                        <Link href="/feed">Daily Feed</Link>
                      </li>
                      <li className="footer-link-item">
                        <Link href="/filters">Filtered Search</Link>
                      </li>
                      <li className="footer-link-item">
                        <Link href="/feed">Highlights</Link>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="footer-title">Community</h4>
                    <ul className="footer-links">
                      <li className="footer-link-item">
                        <Link href="/connect">Fellowship</Link>
                      </li>
                      <li className="footer-link-item">
                        <Link href="/chat">Private Chats</Link>
                      </li>
                      <li className="footer-link-item">
                        <Link href="/settings">Profiles</Link>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="footer-title">Legal</h4>
                    <ul className="footer-links">
                      <li className="footer-link-item">
                        <Link href="/privacy">Privacy Policy</Link>
                      </li>
                      <li className="footer-link-item">
                        <Link href="/terms">Terms of Service</Link>
                      </li>
                      <li className="footer-link-item">
                        <Link href="/guidelines">Community Guidelines</Link>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="container footer-bottom">
                  <span>© 2026 T.S INDUSTRIES. ALL RIGHTS RESERVED.</span>
                  <span>Designed for the modern believer.</span>
                </div>
              </footer>
            )}
          </main>
        </div>

        {/* Toast Notification HUD */}
        <div className="toast-container">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast ${toast.type === "error" ? "error" : ""}`}
            >
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      </AppContext.Provider>
    </EligibilityGate>
  );
}
