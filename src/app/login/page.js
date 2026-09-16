'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useApp } from '../AppWrapper';
import { BookOpen, Loader, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
        const userGender = data.user?.user_metadata?.gender;
        const greeting = userGender === 'Male' 
          ? 'Welcome back, brother!' 
          : userGender === 'Female' 
            ? 'Welcome back, sister!' 
            : 'Welcome back, brother/sister!';
        showToast(greeting);
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)', padding: '1.5rem' }}>
      <div className="diary-card auth-container" style={{ width: '100%', maxWidth: '440px', backgroundColor: 'var(--bg-primary)' }}>
        
        <div className="auth-header">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', color: 'var(--gold-accent)', marginBottom: '1rem', fontSize: '1.5rem', fontFamily: 'var(--font-serif)', fontWeight: 'bold' }}>
            <img src="/logo.png" alt="Bible Diaries" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'contain' }} />
            <span>bible_diaries</span>
          </div>
          <h2 className="auth-title" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Welcome Back</h2>
          <p className="auth-subtitle">Login to access your reflections & feed</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="settings-group">
            <label className="settings-label" htmlFor="email-or-username">Email Address</label>
            <input
              type="email"
              id="email-or-username"
              placeholder="e.g. grace@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="settings-group">
            <label className="settings-label" htmlFor="login-password">Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={16} style={{ color: 'var(--text-secondary)' }} /> : <Eye size={16} style={{ color: 'var(--text-secondary)' }} />}
              </button>
            </div>
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

        <p className="auth-link" style={{ marginTop: '1.5rem' }}>
          New to the diary?{' '}
          <Link href="/register" style={{ fontWeight: '600' }}>
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}
