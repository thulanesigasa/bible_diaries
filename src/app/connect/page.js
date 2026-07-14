'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useApp } from '../AppWrapper';
import { Search, MessageSquare, Loader, X, User } from 'lucide-react';
import Avatar from '../../components/Avatar';

export default function Connect() {
  const { user, showToast } = useApp();
  const router = useRouter();
  const [profiles, setProfiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*');

        if (error) {
          showToast(error.message, 'error');
        } else {
          // Filter out current user from directory
          setProfiles(data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch = 
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.bio && p.bio.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.favorite_verse && p.favorite_verse.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // We can display everyone, highlighting self with a badge, or filtering
    return matchesSearch;
  });

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-serif)' }}>
          Connect with the Community
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Discover other brothers and sisters sharing their walk of faith. Click on a profile to read their spiritual journey.
        </p>

        {/* Search Bar */}
        <div style={{ position: 'relative', maxWidth: '480px' }}>
          <input
            type="text"
            placeholder="Search by name, bio, or favorite scripture..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.75rem' }}
          />
          <Search 
            size={18} 
            style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader size={28} className="spinner" style={{ color: '#D4AF37' }} />
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="glass-panel empty-state">
          No members found matching your search.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredProfiles.map((p) => (
            <div 
              key={p.id} 
              className="connect-row"
              onClick={() => router.push(`/profile/${p.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1.25rem',
                borderBottom: '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
            >
              <Avatar 
                src={p.avatar_url} 
                fullName={p.full_name} 
                email={p.email} 
                size={48}
                style={{ border: '1.5px solid rgba(14, 165, 233, 0.2)' }}
              />
              
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  {p.full_name}
                  {user && user.id === p.id && (
                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(15,23,42,0.05)', borderRadius: '10px', color: 'var(--text-muted)' }}>
                      You
                    </span>
                  )}
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  {p.bio || 'No biography written yet.'}
                </p>
              </div>

              {p.favorite_verse && (
                <div style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--gold-accent)', maxWidth: '280px', textAlign: 'right' }}>
                  "{p.favorite_verse.split('-')[0].trim()}"
                </div>
              )}

              <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', marginLeft: '1rem' }}>
                View Walk
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Selected Profile Modal */}
      {selectedProfile && (
        <div className="modal-overlay" onClick={() => setSelectedProfile(null)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedProfile(null)}>
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center' }}>
              <img 
                src={selectedProfile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                alt={selectedProfile.full_name} 
                style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--gold-accent)' }}
              />
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{selectedProfile.full_name}</h2>
                {selectedProfile.bio && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{selectedProfile.bio}</p>}
              </div>

              {selectedProfile.favorite_verse && (
                <div style={{ padding: '1rem', background: 'rgba(212, 175, 55, 0.04)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', width: '100%' }}>
                  <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--gold-accent)', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    Favorite Bible Scripture
                  </h4>
                  <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.05rem', color: '#E5E7EB' }}>
                    "{selectedProfile.favorite_verse}"
                  </p>
                </div>
              )}

              {selectedProfile.spiritual_journey && (
                <div style={{ textAlign: 'left', width: '100%' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>
                    My Testimony & Spiritual Journey
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {selectedProfile.spiritual_journey}
                  </p>
                </div>
              )}

              {/* Chat Action button if not self */}
              {user && user.id !== selectedProfile.id && (
                <a 
                  href={`/chat/${selectedProfile.id}`}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', textDecoration: 'none' }}
                >
                  <MessageSquare size={18} />
                  <span>Send Private Message</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
