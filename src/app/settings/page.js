'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Compressor from 'compressorjs';
import { useApp } from '../AppWrapper';
import { Loader, Camera, Save, Send, User, BookOpen, Sliders, Shield, Users, Bell, Bookmark, Heart, MessageSquare, HelpCircle, FileText, Lock, Trash2, Mail, Share2, Star, Database } from 'lucide-react';
import Avatar from '../../components/Avatar';

export default function Settings() {
  const { user, profile, setProfile, showToast } = useApp();
  const router = useRouter();

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
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  // Quick Post Composer state
  const [quickPostContent, setQuickPostContent] = useState('');
  const [quickPostCategory, setQuickPostCategory] = useState('Faith');
  const [creatingQuickPost, setCreatingQuickPost] = useState(false);

  // Preferences Toggles
  const [profilePrivacy, setProfilePrivacy] = useState(profile?.privacy_mode || 'public');
  const [allowDms, setAllowDms] = useState(profile?.allow_dms !== false);
  const [emailLikes, setEmailLikes] = useState(profile?.email_likes !== false);
  const [emailComments, setEmailComments] = useState(profile?.email_comments !== false);

  const fetchBookmarks = async () => {
    setLoadingBookmarks(true);
    try {
      const { data: favData, error: favError } = await supabase
        .from('favorites')
        .select('post_id')
        .eq('user_id', user.id);

      if (favError) throw favError;

      if (!favData || favData.length === 0) {
        setBookmarkedPosts([]);
        setLoadingBookmarks(false);
        return;
      }

      const postIds = favData.map(f => f.post_id);

      const { data: postsData, error: postsError } = await supabase
        .from('diaries')
        .select('*, profiles!author_id(*), likes(*), comments(*), favorites(*)')
        .in('id', postIds)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setBookmarkedPosts(postsData || []);
    } catch (err) {
      showToast('Error loading bookmarks: ' + err.message, 'error');
    } finally {
      setLoadingBookmarks(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bookmarks') {
      fetchBookmarks();
    }
  }, [activeTab]);

  const handleToggleLike = async (post) => {
    const isLiked = post.likes?.some(l => l.user_id === user.id) || false;
    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
        setBookmarkedPosts(prev => prev.map(p => 
          p.id === post.id ? { ...p, likes: p.likes.filter(l => l.user_id !== user.id) } : p
        ));
      } else {
        await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
        setBookmarkedPosts(prev => prev.map(p => 
          p.id === post.id ? { ...p, likes: [...(p.likes || []), { user_id: user.id }] } : p
        ));
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleFavorite = async (post) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);

      if (error) throw error;
      showToast('Removed from bookmarks.');
      setBookmarkedPosts(prev => prev.filter(p => p.id !== post.id));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // File Upload base64 helper with compression
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file.', 'error');
      return;
    }

    new Compressor(file, {
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
      mimeType: 'image/avif', // Will fallback to original or JPEG/WEBP if browser doesn't support AVIF canvas encoding
      success(result) {
        if (result.size > 1024 * 1024 * 5) {
          showToast('Compressed image is still too large.', 'error');
          return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
          const newAvatarUrl = reader.result;
          setAvatarUrl(newAvatarUrl);
          
          const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: newAvatarUrl })
            .eq('id', user.id);
            
          if (error) {
            showToast('Failed to save photo: ' + error.message, 'error');
          } else {
            setProfile(prev => ({ ...prev, avatar_url: newAvatarUrl }));
            showToast('Profile photo updated successfully!');
          }
        };
        reader.readAsDataURL(result);
      },
      error(err) {
        showToast('Image compression failed: ' + err.message, 'error');
      },
    });
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
        spiritual_journey: spiritualJourney,
        privacy_mode: profilePrivacy,
        allow_dms: allowDms,
        email_likes: emailLikes,
        email_comments: emailComments
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

  const handleCreateQuickPost = async (e) => {
    e.preventDefault();
    if (!quickPostContent.trim()) {
      showToast('Reflection content cannot be empty.', 'error');
      return;
    }

    setCreatingQuickPost(true);
    try {
      const { error } = await supabase.from('diaries').insert({
        author_id: user.id,
        content: quickPostContent.trim(),
        category: quickPostCategory
      });

      if (error) {
        showToast(error.message, 'error');
      } else {
        setQuickPostContent('');
        showToast('Reflection shared successfully!');
        router.push('/feed');
      }
    } catch (err) {
      showToast('Failed to create post: ' + err.message, 'error');
    } finally {
      setCreatingQuickPost(false);
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

        {/* Profile Header */}
        <div className="avatar-upload-area" style={{ marginBottom: '2rem' }}>
          <div style={{ position: 'relative' }}>
             <Avatar 
               src={avatarUrl} 
               fullName={profile?.full_name} 
               size={70} 
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
              color: activeTab === 'personal' ? 'var(--gold-accent)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <User size={16} />
            <span>Personal Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('spiritual')}
            style={{
              padding: '0.75rem 1.25rem',
              fontWeight: '600',
              fontSize: '0.95rem',
              borderBottom: activeTab === 'spiritual' ? '2px solid var(--gold-accent)' : '2px solid transparent',
              color: activeTab === 'spiritual' ? 'var(--gold-accent)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <BookOpen size={16} />
            <span>Spiritual Journey</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            style={{
              padding: '0.75rem 1.25rem',
              fontWeight: '600',
              fontSize: '0.95rem',
              borderBottom: activeTab === 'preferences' ? '2px solid var(--gold-accent)' : '2px solid transparent',
              color: activeTab === 'preferences' ? 'var(--gold-accent)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Sliders size={16} />
            <span>Preferences</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bookmarks')}
            style={{
              padding: '0.75rem 1.25rem',
              fontWeight: '600',
              fontSize: '0.95rem',
              borderBottom: activeTab === 'bookmarks' ? '2px solid var(--gold-accent)' : '2px solid transparent',
              color: activeTab === 'bookmarks' ? 'var(--gold-accent)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Bookmark size={16} />
            <span>Bookmarks</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('support')}
            style={{
              padding: '0.75rem 1.25rem',
              fontWeight: '600',
              fontSize: '0.95rem',
              borderBottom: activeTab === 'support' ? '2px solid var(--gold-accent)' : '2px solid transparent',
              color: activeTab === 'support' ? 'var(--gold-accent)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <HelpCircle size={16} />
            <span>About</span>
          </button>
        </div>

        <form onSubmit={handleSave} className="auth-form" style={{ gap: '1.25rem' }}>
          
          {activeTab === 'personal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
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

              {/* Quick reflection composer */}
              <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  Share a Daily Reflection
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1rem' }}>
                  Write a new spiritual entry directly to the public timeline from here.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <textarea
                    placeholder="Write your meditation, prayer, or scripture reflection here..."
                    value={quickPostContent}
                    onChange={(e) => setQuickPostContent(e.target.value)}
                    style={{ minHeight: '100px', resize: 'vertical' }}
                    disabled={creatingQuickPost}
                  />
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <select
                        value={quickPostCategory}
                        onChange={(e) => setQuickPostCategory(e.target.value)}
                        disabled={creatingQuickPost}
                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                      >
                        <option value="Hope">Hope</option>
                        <option value="Faith">Faith</option>
                        <option value="Love">Love</option>
                        <option value="Strength">Strength</option>
                        <option value="Gratitude">Gratitude</option>
                        <option value="Wisdom">Wisdom</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateQuickPost}
                      className="btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      disabled={creatingQuickPost || !quickPostContent.trim()}
                    >
                      {creatingQuickPost ? <Loader size={14} className="spinner" /> : <Send size={14} />}
                      <span>Publish Entry</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
              
              {/* Profile Privacy Options */}
              <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '0.25rem', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={18} style={{ color: 'var(--gold-accent)' }} />
                  <span>Profile Privacy Visibility</span>
                </h4>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', gap: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Private & Anonymous Mode</strong>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Hide your contact information and testimony from other members in the Connect tab. When disabled, your profile is public to all members.
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
              </div>

              {/* Messaging & Interaction Options */}
              <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '0.25rem', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={18} style={{ color: 'var(--gold-accent)' }} />
                  <span>Platform Fellowship</span>
                </h4>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', gap: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Allow Direct Messaging</strong>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Permit other believers to send you direct messages from their Connect feeds.
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
              </div>

              {/* Notification Settings */}
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '0.25rem', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bell size={18} style={{ color: 'var(--gold-accent)' }} />
                  <span>Notification Settings</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(15, 23, 42, 0.04)', gap: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Likes Notification Alerts</strong>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Receive transactional email alerts when someone appreciates or likes your diary posts.
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

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', gap: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Comments Notification Alerts</strong>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Receive email alerts immediately when someone writes a comment under your reflections.
                      </p>
                    </div>
                    <div className="checkbox-apple">
                      <input 
                        type="checkbox" 
                        id="email-comments-toggle"
                        checked={emailComments}
                        onChange={(e) => setEmailComments(e.target.checked)}
                      />
                      <label htmlFor="email-comments-toggle"></label>
                    </div>
                  </div>

                </div>
              </div>

              {/* Account Security & Data */}
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '0.25rem', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={18} style={{ color: 'var(--gold-accent)' }} />
                  <span>Account & Security</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(15, 23, 42, 0.04)', gap: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Change Password</strong>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Update your account password securely.
                      </p>
                    </div>
                    <button type="button" className="btn-secondary" onClick={() => showToast('Coming soon!')} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                      Update
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(15, 23, 42, 0.04)', gap: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Data & Storage</strong>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Download a copy of all your reflections and personal data.
                      </p>
                    </div>
                    <button type="button" className="btn-secondary" onClick={() => showToast('Coming soon!')} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                      <Database size={14} style={{ marginRight: 4, display: 'inline' }} /> Download
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', gap: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Delete Account</strong>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Permanently delete your account and remove all data from our servers.
                      </p>
                    </div>
                    <button type="button" onClick={() => showToast('Delete account requested')} style={{ color: '#EF4444', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>

                </div>
              </div>

            </div>
          )}

          {activeTab !== 'bookmarks' && activeTab !== 'support' && (
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
          )}
        </form>

        {activeTab === 'support' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', marginTop: '0.5rem', marginBottom: '0.25rem' }}>Community</h3>
            <div className="diary-card glass-panel" style={{ cursor: 'pointer' }} onClick={() => showToast('Coming soon!')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Share2 size={24} style={{ color: 'var(--primary-color)' }} />
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600' }}>Invite Friends</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Share the app with your fellow believers.</p>
                </div>
              </div>
            </div>

            <div className="diary-card glass-panel" style={{ cursor: 'pointer' }} onClick={() => showToast('Coming soon!')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Star size={24} style={{ color: 'var(--primary-color)' }} />
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600' }}>Rate the App</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Leave a review if you enjoy using Bible Diaries.</p>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', marginTop: '1rem', marginBottom: '0.25rem' }}>Support & Legal</h3>
            <div className="diary-card glass-panel" style={{ cursor: 'pointer' }} onClick={() => showToast('Coming soon!')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Mail size={24} style={{ color: 'var(--primary-color)' }} />
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600' }}>Contact Support</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Send us a message or report a bug.</p>
                </div>
              </div>
            </div>

            <div className="diary-card glass-panel" style={{ cursor: 'pointer' }} onClick={() => showToast('Coming soon!')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <HelpCircle size={24} style={{ color: 'var(--primary-color)' }} />
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600' }}>FAQs & Help Center</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Find answers to common questions.</p>
                </div>
              </div>
            </div>

            <div className="diary-card glass-panel" style={{ cursor: 'pointer' }} onClick={() => showToast('Coming soon!')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Shield size={24} style={{ color: 'var(--primary-color)' }} />
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600' }}>Privacy Policy</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Read our data and privacy commitments.</p>
                </div>
              </div>
            </div>

            <div className="diary-card glass-panel" style={{ cursor: 'pointer' }} onClick={() => showToast('Coming soon!')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <FileText size={24} style={{ color: 'var(--primary-color)' }} />
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600' }}>Terms of Service</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Review our terms and conditions.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {loadingBookmarks ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Loader size={32} className="spinner" style={{ color: 'var(--primary-color)' }} />
              </div>
            ) : bookmarkedPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                No bookmarks yet.
              </div>
            ) : (
              bookmarkedPosts.map(post => (
                <div key={post.id} className="diary-card glass-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Avatar src={post.profiles?.avatar_url} fullName={post.profiles?.full_name} size={36} />
                      <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '600' }}>{post.profiles?.full_name}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className="badge category-badge">{post.category}</span>
                  </div>
                  
                  {post.title && <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{post.title}</h3>}
                  {post.scripture && (
                    <blockquote style={{ borderLeft: '3px solid var(--primary-color)', paddingLeft: '1rem', paddingVertical: '0.5rem', marginBottom: '1rem', backgroundColor: 'var(--background-secondary)', borderRadius: '4px' }}>
                      <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{post.scripture}</p>
                    </blockquote>
                  )}
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                    {post.content}
                  </p>

                  <div className="card-actions">
                    <button 
                      className="icon-btn" 
                      onClick={() => handleToggleLike(post)}
                      style={{ color: post.likes?.some(l => l.user_id === user?.id) ? 'var(--primary-color)' : 'inherit' }}
                    >
                      <Heart size={18} fill={post.likes?.some(l => l.user_id === user?.id) ? 'var(--primary-color)' : 'none'} />
                      <span>{post.likes?.length || 0}</span>
                    </button>
                    <button className="icon-btn" onClick={() => router.push(`/post/${post.id}`)}>
                      <MessageSquare size={18} />
                      <span>{post.comments?.length || 0}</span>
                    </button>
                    <button className="icon-btn" onClick={() => handleToggleFavorite(post)} style={{ color: 'var(--primary-color)' }}>
                      <Bookmark size={18} fill="currentColor" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
