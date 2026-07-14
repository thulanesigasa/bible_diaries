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

  const handleQuickLogin = async (targetEmail, targetPassword, targetName, targetSurname) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPassword,
      });

      if (!error) {
        showToast(`Logged in successfully as ${targetName}!`);
        router.push('/feed');
        return;
      }

      // If credentials do not exist on live Supabase database, register the mock account
      if (error && (error.message.includes('Invalid login') || error.message.includes('not found')) && !supabase.isMock) {
        showToast(`Account not found on live database. Registering ${targetName}...`);
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: targetEmail,
          password: targetPassword,
          options: {
            data: {
              first_name: targetName,
              surname: targetSurname,
              full_name: `${targetName} ${targetSurname}`,
              phone_number: '+15550199',
              address: '77 Scripture Lane, Heaven Sent',
              avatar_url: targetName === 'Elijah' 
                ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' 
                : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
              bio: targetName === 'Elijah' 
                ? 'Seeking grace daily. Teacher of scripture and explorer of spiritual journaling.' 
                : 'Worship leader, writer, and tea lover. Spreading Hope.',
              favorite_verse: targetName === 'Elijah' 
                ? 'Proverbs 3:5-6 - Trust in the Lord with all your heart...' 
                : 'Romans 15:13 - May the God of hope fill you with all joy and peace...',
              spiritual_journey: targetName === 'Elijah'
                ? "I started writing down reflections 5 years ago, and it changed how I pray. Bible Diaries is a dream come true."
                : "My journey began in the choir. Reflections are my way of documenting God's faithfulness through the ups and downs."
            }
          }
        });

        if (signUpError) {
          showToast(`Live registration failed: ${signUpError.message}`, 'error');
        } else {
          // Attempt sign in one more time in case auto-confirm is enabled
          const { error: secondSignInError } = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password: targetPassword,
          });
          
          if (!secondSignInError) {
            showToast(`Registered and signed in as ${targetName}!`);
            router.push('/feed');
          } else {
            showToast(`Registered successfully. Please check your Supabase Auth logs or verify email.`, 'error');
          }
        }
      } else {
        showToast(error.message, 'error');
      }
    } catch (err) {
      showToast('An unexpected error occurred during quick sign in.', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0D14', padding: '1.5rem' }}>
      <div className="glass-panel auth-container" style={{ width: '100%', maxWidth: '440px' }}>
        
        {/* Environment Toggle Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          marginBottom: '1.25rem'
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Database Mode: <strong style={{ color: supabase.isMock ? '#E5C158' : '#34D399' }}>{supabase.isMock ? 'Simulation (Local)' : 'Production (Live)'}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              const currentMock = localStorage.getItem('bd_force_mock') === 'true';
              localStorage.setItem('bd_force_mock', currentMock ? 'false' : 'true');
              showToast('Switching database environment...');
              setTimeout(() => {
                window.location.reload();
              }, 600);
            }}
            style={{
              color: 'var(--gold-accent)',
              fontSize: '0.75rem',
              fontWeight: '600',
              textDecoration: 'underline',
              border: 'none',
              background: 'none',
              padding: 0,
              cursor: 'pointer'
            }}
          >
            Toggle Mode
          </button>
        </div>

        <div className="auth-header">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#D4AF37', marginBottom: '1rem', fontSize: '1.5rem', fontFamily: 'var(--font-serif)', fontWeight: 'bold' }}>
            bible_diaries
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
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '2.75rem' }}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                  border: 'none',
                  background: 'none'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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

        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', textAlign: 'center', fontWeight: '500' }}>
            Quick Test Logins
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-primary"
              style={{
                fontSize: '0.8rem',
                padding: '8px 12px',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
              onClick={() => {
                handleQuickLogin('elijah.bennett@gmail.com', 'password', 'Elijah', 'Bennett');
              }}
            >
              Elijah Bennett
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{
                fontSize: '0.8rem',
                padding: '8px 12px',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
              onClick={() => {
                handleQuickLogin('grace.taylor@gmail.com', 'password', 'Grace', 'Taylor');
              }}
            >
              Grace Taylor
            </button>
          </div>
        </div>

        <p className="auth-link" style={{ marginTop: '1.25rem' }}>
          New to the diary?{' '}
          <Link href="/register" style={{ fontWeight: '600' }}>
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}
