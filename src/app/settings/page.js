'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '../AppWrapper';
import { Loader, Camera, Save } from 'lucide-react';

export default function Settings() {
  const { user, profile, setProfile, showToast } = useApp();

  const [firstName, setFirstName] = useState(profile?.first_name || profile?.full_name?.split(' ')[0] || '');
  const [surname, setSurname] = useState(profile?.surname || profile?.full_name?.split(' ').slice(1).join(' ') || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [address, setAddress] = useState(profile?.address || '');
  
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [favoriteVerse, setFavoriteVerse] = useState(profile?.favorite_verse || '');
  const [spiritualJourney, setSpiritualJourney] = useState(profile?.spiritual_journey || '');
  
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

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

    if (!firstName.trim() || !surname.trim()) {
      showToast('First Name and Surname cannot be empty.', 'error');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        first_name: firstName,
        surname: surname,
        full_name: `${firstName} ${surname}`,
        phone_number: phoneNumber,
        address: address,
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
    <div className="container" style={{ maxWidth: '800px' }}>
      <div className="settings-layout" style={{ padding: '0 0.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem', fontFamily: 'var(--font-serif)' }}>
          Profile Settings
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Update your personal details, contact details, and spiritual walks here.
        </p>

        {/* Tab Navigation Segmented Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            style={{
              padding: '0.75rem 1.25rem',
              fontWeight: '600',
              fontSize: '0.95rem',
              borderBottom: activeTab === 'personal' ? '2px solid var(--gold-accent)' : '2px solid transparent',
              color: activeTab === 'personal' ? 'var(--gold-accent)' : 'var(--text-secondary)'
            }}
          >
            Personal Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('spiritual')}
            style={{
              padding: '0.75rem 1.25rem',
              fontWeight: '600',
              fontSize: '0.95rem',
              borderBottom: activeTab === 'spiritual' ? '2px solid var(--gold-accent)' : '2px solid transparent',
              color: activeTab === 'spiritual' ? 'var(--gold-accent)' : 'var(--text-secondary)'
            }}
          >
            Spiritual Journey
          </button>
        </div>

        <form onSubmit={handleSave} className="auth-form" style={{ gap: '1.25rem' }}>
          
          {activeTab === 'personal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
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
                    style={{ position: 'absolute', bottom: '0', right: '0', backgroundColor: 'var(--gold-accent)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContext: 'center', cursor: 'pointer', border: '2px solid var(--bg-primary)', justifyContent: 'center' }}
                    title="Change Photo"
                  >
                    <Camera size={12} style={{ color: '#FFFFFF' }} />
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="settings-group">
                  <label className="settings-label" htmlFor="settings-firstName">First Name</label>
                  <input
                    type="text"
                    id="settings-firstName"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
                <div className="settings-group">
                  <label className="settings-label" htmlFor="settings-surname">Surname</label>
                  <input
                    type="text"
                    id="settings-surname"
                    placeholder="Surname"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
              </div>

              <div className="settings-group">
                <label className="settings-label" htmlFor="settings-phoneNumber">Phone Number</label>
                <input
                  type="tel"
                  id="settings-phoneNumber"
                  placeholder="e.g. +1 555-0199"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="settings-group">
                <label className="settings-label" htmlFor="settings-address">Address</label>
                <input
                  type="text"
                  id="settings-address"
                  placeholder="Physical Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          )}

          {activeTab === 'spiritual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
              <div className="settings-group">
                <label className="settings-label" htmlFor="settings-bio">Biography (Bio)</label>
                <input
                  type="text"
                  id="settings-bio"
                  placeholder="e.g. Seeking wisdom, loving my neighbor."
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
                  style={{ minHeight: '150px', resize: 'vertical' }}
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', marginTop: '1rem' }}
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
