'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useApp } from '../AppWrapper';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  Send, 
  Loader, 
  Filter, 
  User,
  X
} from 'lucide-react';

const CATEGORIES = ['All', 'Hope', 'Faith', 'Love', 'Strength', 'Gratitude', 'Wisdom'];

export default function FiltersPage() {
  const { user, showToast } = useApp();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering State
  const [activeCategory, setActiveCategory] = useState('All');

  // Comments Drawer State (per post)
  const [openComments, setOpenComments] = useState({}); // post_id -> boolean
  const [commentInputs, setCommentInputs] = useState({}); // post_id -> string
  const [commentLoading, setCommentLoading] = useState({});

  // Active Profile Modal State
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Fetch Feed posts
  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('diaries')
        .select('*, profiles!author_id(*), likes(*), comments(*, profiles!author_id(*))')
        .order('created_at', { ascending: false });

      if (error) {
        showToast(error.message, 'error');
      } else {
        setPosts(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category');
      if (cat) {
        setActiveCategory(cat);
      }
    }
  }, []);

  // Liking functionality
  const handleLike = async (postId) => {
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const hasLiked = post.likes?.some(l => l.user_id === user.id);

    try {
      if (hasLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
        
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              likes: p.likes.filter(l => l.user_id !== user.id)
            };
          }
          return p;
        }));
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: user.id });

        if (error) throw error;

        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              likes: [...(p.likes || []), { post_id: postId, user_id: user.id }]
            };
          }
          return p;
        }));
      }
    } catch (err) {
      showToast('Failed to update like: ' + err.message, 'error');
    }
  };

  // Favoriting functionality
  const handleFavorite = async (postId) => {
    if (!user) return;
    
    const isFav = await checkIsFavorite(postId);

    try {
      if (isFav) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
        showToast('Removed from favorites.');
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ post_id: postId, user_id: user.id });

        if (error) throw error;
        showToast('Saved to favorites!');
      }
      fetchPosts();
    } catch (err) {
      showToast('Failed to bookmark: ' + err.message, 'error');
    }
  };

  const checkIsFavorite = async (postId) => {
    const { data } = await supabase
      .from('favorites')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', user.id);
    return data && data.length > 0;
  };

  // Comment posting functionality
  const handlePostComment = async (postId) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    setCommentLoading(prev => ({ ...prev, [postId]: true }));
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          content: text.trim()
        });

      if (error) {
        showToast(error.message, 'error');
      } else {
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        showToast('Comment added!');
        fetchPosts();
      }
    } catch (err) {
      showToast('Error commenting: ' + err.message, 'error');
    } finally {
      setCommentLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  // Sharing functionality
  const handleShare = async (post) => {
    const textToShare = `"${post.content}" - Written by ${post.profiles?.full_name} on bible_diaries #${post.category}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'bible_diaries Reflection',
          text: textToShare,
          url: window.location.href,
        });
        showToast('Shared successfully!');
      } catch (err) {
        copyToClipboard(textToShare);
      }
    } else {
      copyToClipboard(textToShare);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Reflection copied to clipboard!');
  };

  // Toggle comments expand drawer
  const toggleComments = (postId) => {
    setOpenComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  // Filter posts
  const filteredPosts = activeCategory === 'All' 
    ? posts 
    : posts.filter(p => p.category === activeCategory);

  // Time formatter
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="container">
      <div className="feed-layout">
        
        {/* Sidebar Filtering Tabs */}
        <aside className="sidebar-sticky">
          <div style={{ padding: '0 0.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--gold-accent)' }}>
              <Filter size={18} /> Categories
            </h3>
            <div className="category-list">
              {CATEGORIES.map((cat) => {
                const count = cat === 'All' 
                  ? posts.length 
                  : posts.filter(p => p.category === cat).length;
                
                return (
                  <button
                    key={cat}
                    className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    <span>{cat}</span>
                    <span className="count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Feed Timeline Content */}
        <section>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-serif)', marginBottom: '0.25rem' }}>
              Explore Reflections
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Filter the diaries shared by the community by spiritual categories.
            </p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Loader size={28} className="spinner" style={{ color: 'var(--gold-accent)' }} />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="empty-state" style={{ border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              No diaries published under the {activeCategory} category yet.
            </div>
          ) : (
            <div className="feed-list">
              {filteredPosts.map((post) => {
                const liked = post.likes?.some(l => l.user_id === user?.id);
                
                return (
                  <article key={post.id} className="diary-card">
                    
                    {/* Header: Author Metadata */}
                    <div 
                      className="diary-card-header"
                      onClick={() => router.push(`/post/${post.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div 
                        className="diary-card-author"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (post.profiles?.id) {
                            router.push(`/profile/${post.profiles.id}`);
                          }
                        }}
                      >
                        <img 
                          src={post.profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                          alt={post.profiles?.full_name} 
                          className="diary-card-avatar"
                        />
                        <div>
                          <div className="diary-card-author-name">{post.profiles?.full_name}</div>
                          <div className="diary-card-time">{formatTime(post.created_at)}</div>
                        </div>
                      </div>

                      <span 
                        className="diary-card-category"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCategory(post.category);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {post.category}
                      </span>
                    </div>

                    {/* Content Section */}
                    <div 
                      className="diary-card-content"
                      onClick={() => router.push(`/post/${post.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      {post.content}
                    </div>

                    {/* Action Hub */}
                    <div className="diary-card-actions">
                      <button 
                        className={`action-btn ${liked ? 'active-like' : ''}`}
                        onClick={() => handleLike(post.id)}
                      >
                        <Heart size={18} />
                        <span>{post.likes?.length || 0}</span>
                      </button>

                      <button 
                        className="action-btn"
                        onClick={() => router.push(`/post/${post.id}`)}
                      >
                        <MessageSquare size={18} />
                        <span>{post.comments?.length || 0}</span>
                      </button>

                      <button 
                        className="action-btn"
                        onClick={() => handleFavorite(post.id)}
                      >
                        <Bookmark size={18} />
                        <span>Save</span>
                      </button>

                      <button 
                        className="action-btn"
                        onClick={() => handleShare(post)}
                      >
                        <Share2 size={18} />
                        <span>Share</span>
                      </button>
                    </div>

                  </article>
                );
              })}
            </div>
          )}

        </section>
      </div>

      {/* User Profile Modal Dialogue */}
      {selectedProfile && (
        <div className="modal-overlay" onClick={() => setSelectedProfile(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedProfile(null)}>
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center' }}>
              <img 
                src={selectedProfile.avatar_url} 
                alt={selectedProfile.full_name} 
                style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--gold-accent)' }}
              />
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{selectedProfile.full_name}</h2>
                {selectedProfile.bio && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{selectedProfile.bio}</p>}
              </div>

              {selectedProfile.favorite_verse && (
                <div style={{ padding: '1rem', background: 'rgba(14, 165, 233, 0.04)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', width: '100%' }}>
                  <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--gold-accent)', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    Favorite Bible Scripture
                  </h4>
                  <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
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
