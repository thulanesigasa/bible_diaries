'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '../AppWrapper';
import { Loader, Camera, Save } from 'lucide-react';

export default function Settings() {
  const { user, profile, setProfile, showToast } = useApp();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [favoriteVerse, setFavoriteVerse] = useState(profile?.favorite_verse || '');
  const [spiritualJourney, setSpiritualJourney] = useState(profile?.spiritual_journey || '');
  
  const [saving, setSaving] = useState(false);

  // File Upload base64 helper
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
      showToast('New profile photo staged.');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showToast('Full Name cannot be empty.', 'error');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        full_name: fullName,
        avatar_url: avatarUrl,
        bio,
        favorite_verse: favoriteVerse,
        spiritual_journey: spiritualJourney
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        showToast(error.message, 'error');
      } else {
        // Fetch updated profile to ensure sync
        const updatedProfile = { ...profile, ...updateData };
        setProfile(updatedProfile);
        showToast('Settings saved successfully!');
      }
    } catch (err) {
      showToast('An error occurred while saving: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container">
      <div className="glass-panel settings-layout">
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem', fontFamily: 'var(--font-serif)' }}>
          Profile Settings
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Update your spiritual details and manage how other members see your profile.
        </p>

        <form onSubmit={handleSave} className="auth-form" style={{ gap: '1.25rem' }}>
          
          {/* Avatar Upload Area */}
          <div className="avatar-upload-area">
            <div style={{ position: 'relative' }}>
              <img 
                src={avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                alt="Avatar" 
                className="avatar-upload-preview"
              />
              <label 
                htmlFor="settings-avatar-upload" 
                style={{ position: 'absolute', bottom: '0', right: '0', backgroundColor: '#D4AF37', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContext: 'center', cursor: 'pointer', border: '2px solid #0A0D14', justifyContent: 'center' }}
                title="Change Photo"
              >
                <Camera size={12} style={{ color: '#0A0D14' }} />
                <input 
                  type="file" 
                  id="settings-avatar-upload" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '2px' }}>Change Photo</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Click the camera icon to upload a picture. JPG/PNG under 2MB.
              </p>
            </div>
          </div>

          <div className="settings-group">
            <label className="settings-label" htmlFor="settings-fullName">Full Name</label>
            <input
              type="text"
              id="settings-fullName"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
              required
            />
          </div>

          <div className="settings-group">
            <label className="settings-label" htmlFor="settings-bio">Biography (Bio)</label>
            <input
              type="text"
              id="settings-bio"
              placeholder="e.g. Walking in faith, seeker of light."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="settings-group">
            <label className="settings-label" htmlFor="settings-favoriteVerse">Favorite Bible Verse</label>
            <input
              type="text"
              id="settings-favoriteVerse"
              placeholder="e.g. Psalms 23:1"
              value={favoriteVerse}
              onChange={(e) => setFavoriteVerse(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="settings-group">
            <label className="settings-label" htmlFor="settings-spiritualJourney">My Spiritual Journey (Testimony)</label>
            <textarea
              id="settings-spiritualJourney"
              placeholder="Share how God has shaped your life..."
              value={spiritualJourney}
              onChange={(e) => setSpiritualJourney(e.target.value)}
              disabled={saving}
              style={{ minHeight: '120px', resize: 'vertical' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', marginTop: '0.5rem' }}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader className="spinner" size={16} />
                <span>Saving records...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
