'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { BookOpen, MessageSquare, Users, Settings, LogOut, Loader, Heart } from 'lucide-react';

const AppContext = createContext({
  user: null,
  profile: null,
  setProfile: () => {},
  showToast: () => {},
  loading: true
});

export const useApp = () => useContext(AppContext);

export default function AppWrapper({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const router = useRouter();
  const pathname = usePathname();

  const showToast = (message, type = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    let active = true;

    // Load auth session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        // Fetch additional profile fields
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id);

          if (data && data[0]) {
            setProfile(data[0]);
          } else {
            // Fallback profile if row doesn't exist yet
            setProfile({
              id: currentUser.id,
              full_name: currentUser.user_metadata?.full_name || 'Anonymous Believer',
              avatar_url: currentUser.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              bio: currentUser.user_metadata?.bio || '',
              favorite_verse: currentUser.user_metadata?.favorite_verse || '',
              spiritual_journey: currentUser.user_metadata?.spiritual_journey || ''
            });
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Redirect handling based on auth state
  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login' || pathname === '/register';

    if (!user && !isAuthPage) {
      router.push('/login');
    } else if (user && isAuthPage) {
      router.push('/feed');
    }
  }, [user, loading, pathname, router]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('Logged out successfully.');
      router.push('/login');
    }
  };

  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', backgroundColor: '#0A0D14' }}>
        <Loader className="spinner" style={{ color: '#D4AF37', width: '32px', height: '32px' }} />
        <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontFamily: 'serif' }}>Aligning hearts...</p>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ user, profile, setProfile, showToast, loading }}>
      {!isAuthPage && user && (
        <header className="app-header">
          <Link href="/feed" className="app-logo">
            bible_<span>diaries</span>
          </Link>
          
          <nav className="app-nav">
            <Link href="/feed" className={`nav-link ${pathname === '/feed' ? 'active' : ''}`}>
              <BookOpen size={18} />
              <span>Feed</span>
            </Link>
            <Link href="/connect" className={`nav-link ${pathname.startsWith('/connect') ? 'active' : ''}`}>
              <Users size={18} />
              <span>Connect</span>
            </Link>
            <Link href="/chat" className={`nav-link ${pathname.startsWith('/chat') ? 'active' : ''}`}>
              <MessageSquare size={18} />
              <span>Chat</span>
            </Link>
            <Link href="/settings" className={`nav-link ${pathname === '/settings' ? 'active' : ''}`}>
              <Settings size={18} />
              <span>Settings</span>
            </Link>
            
            {profile && (
              <div className="user-badge">
                <img 
                  src={profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                  alt={profile.full_name} 
                  className="user-badge-avatar"
                />
                <span className="user-badge-name">{profile.full_name}</span>
                <button onClick={handleLogout} className="nav-link" style={{ cursor: 'pointer', padding: '0.4rem', border: 'none', background: 'transparent' }} title="Logout">
                  <LogOut size={18} style={{ color: '#EF4444' }} />
                </button>
              </div>
            )}
          </nav>
        </header>
      )}

      <main style={{ flex: 1 }}>{children}</main>

      {/* Toast Notification HUD */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type === 'error' ? 'error' : ''}`}>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}
