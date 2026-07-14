'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useApp } from '../../AppWrapper';
import { 
  ArrowLeft,
  MessageSquare,
  Loader
} from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage({ params }) {
  const resolvedParams = use(params);
  const profileId = resolvedParams?.id;

  const { user, showToast } = useApp();
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileDetails = async () => {
    if (!profileId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) {
        showToast(error.message, 'error');
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, [profileId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
        <Loader size={32} className="spinner" style={{ color: 'var(--gold-accent)' }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container" style={{ maxWidth: '600px', padding: '3rem 1rem', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', marginBottom: '1rem' }}>
          Profile Not Found
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          This user profile does not exist or has been deactivated.
        </p>
        <Link href="/feed" className="btn-primary" style={{ display: 'inline-flex', padding: '10px 20px' }}>
          Return to Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '650px', padding: '2rem 1rem' }}>
      
      {/* Back Button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button 
          onClick={() => router.back()} 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="diary-card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        
        {/* Avatar Image */}
        <img 
          src={profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
          alt={profile.full_name} 
          style={{ 
            width: '110px', 
            height: '110px', 
            borderRadius: '50%', 
            objectFit: 'cover', 
            border: '3px solid var(--gold-accent)',
            boxShadow: 'var(--shadow-md)' 
          }}
        />

        {/* User Info */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {profile.full_name}
          </h2>
          {profile.bio ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontStyle: 'italic', maxWidth: '450px', margin: '0.5rem auto 0' }}>
              "{profile.bio}"
            </p>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.5rem auto 0' }}>
              Fellow believer on bible_diaries
            </p>
          )}
        </div>

        {/* Favorite Scripture Section */}
        {profile.favorite_verse && (
          <div style={{ 
            padding: '1.25rem', 
            background: 'rgba(14, 165, 233, 0.03)', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius-md)', 
            width: '100%',
            textAlign: 'center',
            marginTop: '0.5rem'
          }}>
            <h4 style={{ 
              fontSize: '0.75rem', 
              textTransform: 'uppercase', 
              color: 'var(--gold-accent)', 
              letterSpacing: '1px', 
              marginBottom: '0.5rem',
              fontWeight: '600'
            }}>
              Favorite Bible Scripture
            </h4>
            <p style={{ 
              fontFamily: 'var(--font-serif)', 
              fontStyle: 'italic', 
              fontSize: '1.1rem', 
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: '1.5'
            }}>
              "{profile.favorite_verse}"
            </p>
          </div>
        )}

        {/* Testimony & Spiritual Journey */}
        {profile.spiritual_journey && (
          <div style={{ width: '100%', textAlign: 'left', marginTop: '0.5rem' }}>
            <h4 style={{ 
              fontSize: '0.9rem', 
              color: 'var(--text-primary)', 
              marginBottom: '0.5rem', 
              fontWeight: '600',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '0.25rem'
            }}>
              Spiritual Testimony & Journey
            </h4>
            <p style={{ 
              fontSize: '0.95rem', 
              color: 'var(--text-secondary)', 
              lineHeight: '1.6', 
              whiteSpace: 'pre-wrap',
              margin: 0 
            }}>
              {profile.spiritual_journey}
            </p>
          </div>
        )}

        {/* Messaging button */}
        {user && user.id !== profile.id && (
          <a 
            href={`/chat/${profile.id}`}
            className="btn-primary"
            style={{ 
              width: '100%', 
              justifyContent: 'center', 
              marginTop: '1.5rem', 
              padding: '12px 24px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.95rem'
            }}
          >
            <MessageSquare size={18} />
            <span>Send Private Message</span>
          </a>
        )}

      </div>
    </div>
  );
}
