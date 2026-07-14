'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useApp } from '../AppWrapper';
import { Loader, Camera } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [favoriteVerse, setFavoriteVerse] = useState('');
  const [spiritualJourney, setSpiritualJourney] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { showToast } = useApp();
  const router = useRouter();

  // Helper to handle profile image uploads (base64)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024 * 2) {
      showToast('Image size should be less than 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result);
      showToast('Profile image uploaded successfully.');
    };
    reader.readAsDataURL(file);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!email || !password || !fullName) {
      showToast('Email, Password, and Full Name are required.', 'error');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', // standard fallback
            bio,
            favorite_verse: favoriteVerse,
            spiritual_journey: spiritualJourney
          }
        }
      });

      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Registration successful! Welcome to the flock.');
        router.push('/feed');
      }
    } catch (err) {
      showToast('An error occurred during registration.', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0D14', padding: '2rem 1.5rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem', borderRadius: 'var(--radius-md)' }}>
        <div className="auth-header" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#D4AF37', marginBottom: '0.5rem', fontSize: '1.5rem', fontFamily: 'var(--font-serif)', fontWeight: 'bold' }}>
            bible_diaries
          </div>
          <h2 className="auth-title" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Create Your Account</h2>
          <p className="auth-subtitle">Join the community to share your walk of faith</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form" style={{ gap: '1rem' }}>
          
          <div className="avatar-upload-area">
            <div style={{ position: 'relative' }}>
              <img 
                src={avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                alt="Avatar preview" 
                className="avatar-upload-preview"
              />
              <label 
                htmlFor="avatar-upload" 
                style={{ position: 'absolute', bottom: '0', right: '0', backgroundColor: '#D4AF37', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContext: 'center', cursor: 'pointer', border: '2px solid #0A0D14', justifyContent: 'center' }}
                title="Upload Avatar Image"
              >
                <Camera size={12} style={{ color: '#0A0D14' }} />
                <input 
                  type="file" 
                  id="avatar-upload" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '2px' }}>Profile Photo</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Upload a picture of yourself, or we will apply a default avatar.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="settings-group">
              <label className="settings-label" htmlFor="fullName">Full Name *</label>
              <input
                type="text"
                id="fullName"
                placeholder="e.g. Elijah Bennett"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="settings-group">
              <label className="settings-label" htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                placeholder="brother@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="settings-group">
            <label className="settings-label" htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="settings-group">
            <label className="settings-label" htmlFor="bio">Short Bio</label>
            <input
              type="text"
              id="bio"
              placeholder="e.g. Seeking wisdom, loving my neighbor."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="settings-group">
            <label className="settings-label" htmlFor="favoriteVerse">Favorite Bible Verse</label>
            <input
              type="text"
              id="favoriteVerse"
              placeholder="e.g. Romans 8:28"
              value={favoriteVerse}
              onChange={(e) => setFavoriteVerse(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="settings-group">
            <label className="settings-label" htmlFor="spiritualJourney">My Spiritual Journey (Testimony)</label>
            <textarea
              id="spiritualJourney"
              placeholder="Describe your faith, walk with God, or what brings you to writing bible diaries..."
              value={spiritualJourney}
              onChange={(e) => setSpiritualJourney(e.target.value)}
              disabled={loading}
              style={{ minHeight: '80px', resize: 'vertical' }}
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
                <span>Registering profile...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <p className="auth-link" style={{ marginTop: '1.25rem' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ fontWeight: '600' }}>
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
