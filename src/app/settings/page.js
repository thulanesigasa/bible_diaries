'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Compressor from 'compressorjs';
import { useApp } from '../AppWrapper';
import { 
  Loader, 
  Camera, 
  Save, 
  User, 
  BookOpen, 
  Sliders, 
  Shield, 
  Users, 
  Bell, 
  Bookmark, 
  LogOut 
} from 'lucide-react';
import Avatar from '../../components/Avatar';

export default function Settings() {
  const { user, profile, setProfile, showToast } = useApp();
  const router = useRouter();

  // Helper to parse stored phone into country code and local number
  const parsePhone = (raw) => {
    if (!raw) return { code: '+27', num: '' };
    const codes = ['+27', '+234', '+254', '+233', '+263', '+267', '+260', '+268', '+264', '+266', '+258', '+265', '+255', '+256', '+1', '+44', '+61', '+91'];
    for (const c of codes) {
      if (raw.startsWith(c)) {
        return { code: c, num: raw.slice(c.length).replace(/^0+/, '') };
      }
    }
    return { code: '+27', num: raw.replace(/^0+/, '') };
  };

  const initialPhone = parsePhone(profile?.phone_number || '');

  // Personal Fields
  const [firstName, setFirstName] = useState(profile?.first_name || profile?.full_name?.split(' ')[0] || '');
  const [surname, setSurname] = useState(profile?.surname || profile?.full_name?.split(' ').slice(1).join(' ') || '');
  const [countryCode, setCountryCode] = useState(initialPhone.code);
  const [phoneNumber, setPhoneNumber] = useState(initialPhone.num);
  const [address, setAddress] = useState(profile?.address || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

  // Spiritual Fields
  const [bio, setBio] = useState(profile?.bio || '');
  const [favoriteVerse, setFavoriteVerse] = useState(profile?.favorite_verse || '');
  const [spiritualJourney, setSpiritualJourney] = useState(profile?.spiritual_journey || '');

  // Preferences Toggles
  const [profilePrivacy, setProfilePrivacy] = useState(profile?.privacy_mode || 'public');
  const [allowDms, setAllowDms] = useState(profile?.allow_dms !== false);
  const [emailLikes, setEmailLikes] = useState(profile?.email_likes !== false);
  const [emailComments, setEmailComments] = useState(profile?.email_comments !== false);

  const [saving, setSaving] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  // Sync profile when loaded
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || profile.full_name?.split(' ')[0] || '');
      setSurname(profile.surname || profile.full_name?.split(' ').slice(1).join(' ') || '');
      const parsed = parsePhone(profile.phone_number || '');
      setCountryCode(parsed.code);
      setPhoneNumber(parsed.num);
      setAddress(profile.address || '');
      setAvatarUrl(profile.avatar_url || '');
      setBio(profile.bio || '');
      setFavoriteVerse(profile.favorite_verse || '');
      setSpiritualJourney(profile.spiritual_journey || '');
      setProfilePrivacy(profile.privacy_mode || 'public');
      setAllowDms(profile.allow_dms !== false);
      setEmailLikes(profile.email_likes !== false);
      setEmailComments(profile.email_comments !== false);
    }
  }, [profile]);

  // Fetch bookmarks count
  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      try {
        const { count, error } = await supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        if (!error && count !== null) {
          setBookmarkCount(count);
        }
      } catch (e) {}
    };
    fetchCount();
  }, [user]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024 * 10) {
      showToast('Image size should be less than 10MB', 'error');
      return;
    }

    new Compressor(file, {
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
      mimeType: 'image/webp',
      success: (compressedResult) => {
        const reader = new FileReader();
        reader.readAsDataURL(compressedResult);
        reader.onloadend = async () => {
          const base64data = reader.result;
          setAvatarUrl(base64data);

          // Auto-save the new avatar
          const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: base64data })
            .eq('id', user.id);

          if (error) {
            showToast('Failed to save avatar: ' + error.message, 'error');
          } else {
            setProfile(prev => ({ ...prev, avatar_url: base64data }));
            showToast('Profile photo updated successfully!');
          }
        };
      },
      error: (err) => {
        showToast('Error compressing image: ' + err.message, 'error');
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !surname.trim()) {
      showToast('First Name and Surname are required.', 'error');
      return;
    }

    // Validation rule: Strip duplicate leading zeros
    const cleanPhone = phoneNumber.replace(/^0+/, '');
    const fullPhoneNumber = cleanPhone ? `${countryCode}${cleanPhone}` : '';

    setSaving(true);
    try {
      const updateData = {
        first_name: firstName.trim(),
        surname: surname.trim(),
        full_name: `${firstName.trim()} ${surname.trim()}`,
        phone_number: fullPhoneNumber,
        address: address.trim(),
        avatar_url: avatarUrl,
        bio: bio.trim(),
        favorite_verse: favoriteVerse.trim(),
        spiritual_journey: spiritualJourney.trim(),
        privacy_mode: profilePrivacy,
        allow_dms: allowDms,
        email_likes: emailLikes,
        email_comments: emailComments
      };

      const { error } = await supabase
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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      showToast('Logged out successfully.');
      router.push('/login');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '820px', padding: '1.5rem 1rem 4rem' }}>
      
      {/* Title & Introduction in Body */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-serif)' }}>
          Profile & Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Manage your personal identity, contact information, spiritual testimony, and privacy directly in one place.
        </p>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        
        {/* Profile Card Header in Body */}
        <div className="diary-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative' }}>
            <Avatar 
              src={avatarUrl} 
              fullName={`${firstName} ${surname}`} 
              size={80} 
            />
            <label 
              htmlFor="settings-avatar-upload" 
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                backgroundColor: 'var(--gold-accent)',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '2px solid var(--bg-primary)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
              }}
              title="Change Profile Photo"
            >
              <Camera size={14} style={{ color: '#FFFFFF' }} />
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
            <h2 style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              {`${firstName} ${surname}`.trim() || 'Believer'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
              {user?.email}
            </p>
            <span style={{ fontSize: '0.75rem', color: 'var(--gold-accent)', fontWeight: '600', marginTop: '0.35rem', display: 'inline-block' }}>
              Tap camera to upload new photo (JPG/PNG under 10MB)
            </span>
          </div>
        </div>

        {/* Section 1: Personal Information */}
        <div className="diary-card" style={{ padding: '1.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <User size={20} style={{ color: 'var(--gold-accent)' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
              Personal Information
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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

          {/* Two-part Phone Number with Country Code Dropdown */}
          <div className="settings-group" style={{ marginBottom: '1rem' }}>
            <label className="settings-label" htmlFor="settings-phoneNumber">Phone Number</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                id="settings-countryCode"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                style={{
                  width: '115px',
                  padding: '10px 8px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  fontWeight: '600'
                }}
              >
                <option value="+27">🇿🇦 +27</option>
                <option value="+234">🇳🇬 +234</option>
                <option value="+254">🇰🇪 +254</option>
                <option value="+233">🇬🇭 +233</option>
                <option value="+263">🇿🇼 +263</option>
                <option value="+267">🇧🇼 +267</option>
                <option value="+260">🇿🇲 +260</option>
                <option value="+268">🇸🇿 +268</option>
                <option value="+264">🇳🇦 +264</option>
                <option value="+266">🇱🇸 +266</option>
                <option value="+258">🇲🇿 +258</option>
                <option value="+265">🇲🇼 +265</option>
                <option value="+255">🇹🇿 +255</option>
                <option value="+256">🇺🇬 +256</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+61">🇦🇺 +61</option>
                <option value="+91">🇮🇳 +91</option>
              </select>
              <input
                type="tel"
                id="settings-phoneNumber"
                placeholder="71 234 5678"
                value={phoneNumber}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
                  setPhoneNumber(clean);
                }}
                style={{ flex: 1 }}
                disabled={saving}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              Note: Numbers starting with 0 will automatically have the leading 0 stripped so the international code is preserved.
            </span>
          </div>

          <div className="settings-group">
            <label className="settings-label" htmlFor="settings-address">Physical Address</label>
            <input
              type="text"
              id="settings-address"
              placeholder="e.g. 77 Scripture Lane, Glory Town"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        {/* Section 2: Spiritual Journey */}
        <div className="diary-card" style={{ padding: '1.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <BookOpen size={20} style={{ color: 'var(--gold-accent)' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
              Spiritual Walk & Testimony
            </h3>
          </div>

          <div className="settings-group" style={{ marginBottom: '1rem' }}>
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

          <div className="settings-group" style={{ marginBottom: '1rem' }}>
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
              placeholder="Share how God has shaped your spiritual walk..."
              value={spiritualJourney}
              onChange={(e) => setSpiritualJourney(e.target.value)}
              disabled={saving}
              style={{ minHeight: '120px', resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Section 3: Preferences & Privacy */}
        <div className="diary-card" style={{ padding: '1.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <Sliders size={20} style={{ color: 'var(--gold-accent)' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
              Preferences & Privacy
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Private & Anonymous Mode</strong>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Hide your contact info and spiritual testimony from public directory browse.
                </p>
              </div>
              <div className="checkbox-apple">
                <input 
                  type="checkbox" 
                  id="privacy-mode-toggle"
                  checked={profilePrivacy === 'private'}
                  onChange={(e) => setProfilePrivacy(e.target.checked ? 'private' : 'public')}
                />
                <label htmlFor="privacy-mode-toggle"></label>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Allow Direct Messaging</strong>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Allow fellowship members to initiate private direct messages with you.
                </p>
              </div>
              <div className="checkbox-apple">
                <input 
                  type="checkbox" 
                  id="allow-dms-toggle"
                  checked={allowDms}
                  onChange={(e) => setAllowDms(e.target.checked)}
                />
                <label htmlFor="allow-dms-toggle"></label>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Email Notifications</strong>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Receive alerts when other believers like or comment on your reflections.
                </p>
              </div>
              <div className="checkbox-apple">
                <input 
                  type="checkbox" 
                  id="email-likes-toggle"
                  checked={emailLikes}
                  onChange={(e) => setEmailLikes(e.target.checked)}
                />
                <label htmlFor="email-likes-toggle"></label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Bookmarks Quick Link */}
        <div 
          className="diary-card" 
          onClick={() => router.push('/feed')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '1.25rem 1.75rem', 
            backgroundColor: 'var(--bg-primary)', 
            borderRadius: '14px', 
            border: '1px solid var(--border-color)',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(212, 163, 89, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bookmark size={20} style={{ color: 'var(--gold-accent)' }} />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-primary)' }}>Saved Bookmarks</strong>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {bookmarkCount} saved reflection{bookmarkCount === 1 ? '' : 's'} in your sanctuary
              </p>
            </div>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--gold-accent)', fontWeight: '600' }}>View Feed →</span>
        </div>

        {/* Actions Footer in Body */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={saving}
            style={{ flex: 1, padding: '14px 24px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
          >
            {saving ? (
              <>
                <Loader size={18} className="spinner" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save Changes</span>
              </>
            )}
          </button>

          <button 
            type="button" 
            onClick={handleSignOut}
            style={{ 
              padding: '14px 20px', 
              borderRadius: '8px', 
              backgroundColor: '#FEF2F2', 
              border: '1px solid #FECACA', 
              color: '#EF4444', 
              fontWeight: '600', 
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>

      </form>
    </div>
  );
}
