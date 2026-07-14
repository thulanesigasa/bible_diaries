'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useApp } from '../AppWrapper';
import { BookOpen, Loader } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useApp();
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Welcome back, brother/sister!');
        router.push('/feed');
      }
    } catch (err) {
      showToast('An unexpected error occurred.', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0D14', padding: '1.5rem' }}>
      <div className="glass-panel auth-container" style={{ width: '100%', maxWidth: '440px' }}>
        <div className="auth-header">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#D4AF37', marginBottom: '1rem', fontSize: '1.5rem', fontFamily: 'var(--font-serif)', fontWeight: 'bold' }}>
            ⛪ bible_diaries
          </div>
          <h2 className="auth-title" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Welcome Back</h2>
          <p className="auth-subtitle">Login to access your reflections & feed</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="settings-group">
            <label className="settings-label" htmlFor="email-or-username">Email or Name</label>
            <input
              type="text"
              id="email-or-username"
              placeholder="e.g. grace@example.com or Grace"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="settings-group">
            <label className="settings-label" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader className="spinner" size={16} />
                <span>Checking records...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <p className="auth-link">
          New to the diary?{' '}
          <Link href="/register" style={{ fontWeight: '600' }}>
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}
