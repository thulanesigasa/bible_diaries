'use client';

import { useState, useEffect, useRef } from 'react';
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
  Plus, 
  Filter, 
  AlertCircle,
  Eye,
  CheckCircle,
  User,
  X,
  Edit2,
  Trash2
} from 'lucide-react';
import Avatar from '../../components/Avatar';

const CATEGORIES = ['All', 'Hope', 'Faith', 'Love', 'Strength', 'Gratitude', 'Wisdom'];

export default function Feed() {
  const { user, profile, showToast } = useApp();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Post Creator State
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Faith');
  const [submitting, setSubmitting] = useState(false);
  const [modStatus, setModStatus] = useState(null); // 'checking', 'flagged', 'clean'
  const [modReason, setModReason] = useState('');

  // Filtering State
  const [activeCategory, setActiveCategory] = useState('All');

  // Comments Drawer State (per post)
  const [openComments, setOpenComments] = useState({}); // post_id -> boolean
  const [commentInputs, setCommentInputs] = useState({}); // post_id -> string
  const [commentLoading, setCommentLoading] = useState({});

  // Active Profile Modal State
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Edit State
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingContent, setEditingContent] = useState('');

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
  }, []);

  // Post entry processing with AI Content Moderator
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) {
      showToast('Reflection content cannot be empty.', 'error');
      return;
    }

    setSubmitting(true);
    setModStatus('checking');
    setModReason('');

    try {
      // Call the API route for OpenAI moderation check
      const res = await fetch('/api/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
      });

      if (!res.ok) {
        throw new Error('Moderation service error.');
      }

      const check = await res.json();

      if (check.flagged) {
        setModStatus('flagged');
        setModReason(check.reason || 'Explicit content detected.');
        showToast('Message blocked by AI Moderation.', 'error');
        setSubmitting(false);
        return;
      }

      // If clean, proceed to insert
      setModStatus('clean');
      const { data, error } = await supabase
        .from('diaries')
        .insert({
          author_id: user.id,
          content: newContent,
          category: newCategory
        });

      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Diary shared on the global feed!');
        setNewContent('');
        setModStatus(null);
        fetchPosts();
      }
    } catch (err) {
      showToast('Error sharing post: ' + err.message, 'error');
      setModStatus(null);
    } finally {
      setSubmitting(false);
    }
  };

  // Liking functionality
  const handleLike = async (postId) => {
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const hasLiked = post.likes?.some(l => l.user_id === user.id);

    try {
      if (hasLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
        
        // Optimistic UI update
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
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: user.id });

        if (error) throw error;

        // Optimistic UI update
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
    
    // Check if post is currently bookmarked
    const isFav = await checkIsFavorite(postId);

    try {
      if (isFav) {
        // Remove favorite
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
        showToast('Removed from favorites.');
      } else {
        // Add favorite
        const { error } = await supabase
          .from('favorites')
          .insert({ post_id: postId, user_id: user.id });

        if (error) throw error;
        showToast('Saved to favorites!');
      }
      
      // Update local state by forcing a re-fetch of posts (or caching)
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
        fetchPosts(); // Refresh to fetch the new comment with user details
      }
    } catch (err) {
      showToast('Error commenting: ' + err.message, 'error');
    } finally {
      setCommentLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this diary entry?")) return;
    
    try {
      const { error } = await supabase
        .from('diaries')
        .delete()
        .eq('id', postId);
      
      if (error) throw error;
      showToast('Diary deleted successfully.');
      fetchPosts();
    } catch (err) {
      showToast('Error deleting diary: ' + err.message, 'error');
    }
  };

  const handleEditSubmit = async (postId) => {
    if (!editingContent.trim()) return;
    try {
      const { error } = await supabase
        .from('diaries')
        .update({ content: editingContent.trim() })
        .eq('id', postId);

      if (error) throw error;
      showToast('Diary updated successfully.');
      setEditingPostId(null);
      setEditingContent('');
      fetchPosts();
    } catch (err) {
      showToast('Error updating diary: ' + err.message, 'error');
    }
  };

  // Sharing functionality (web share and clipboard)
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
        // If they cancel share overlay, fallback to clipboard
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

  // Show detailed profile card
  const handleViewProfile = (authorProfile) => {
    if (authorProfile?.id) {
      router.push(`/profile/${authorProfile.id}`);
    }
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
    <div className="container" style={{ maxWidth: '800px' }}>
      {/* Feed Timeline Content */}
      <section>
          
          {/* Post Submission Card */}
          <div className="glass-panel post-creator">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', fontWeight: '500', fontFamily: 'var(--font-serif)' }}>
              Write your Daily Reflection
            </h3>
            
            <form onSubmit={handleCreatePost}>
              <textarea
                placeholder="What has scripture spoken to you today? Share a testimony, meditation, or diary entry..."
                className="post-creator-textarea"
                value={newContent}
                onChange={(e) => {
                  setNewContent(e.target.value);
                  if (modStatus === 'flagged') setModStatus(null);
                }}
                disabled={submitting}
                maxLength={800}
                required
              />

              {modStatus === 'checking' && (
                <div className="moderator-checking" style={{ marginBottom: '1rem' }}>
                  <Loader size={16} className="spinner" />
                  <span>AI Content Moderator is reading your message...</span>
                </div>
              )}

              {modStatus === 'flagged' && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-sm)', color: '#EF4444', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '2px' }}>AI Content Flagged</strong>
                    <p>{modReason}</p>
                  </div>
                </div>
              )}

              <div className="post-creator-footer">
                <div className="category-select-wrapper">
                  <span>Category:</span>
                  <select
                    className="category-select"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    disabled={submitting}
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={submitting || !newContent.trim() || modStatus === 'flagged'}
                >
                  <Plus size={18} />
                  <span>Share Diary</span>
                </button>
              </div>
            </form>
          </div>

          {/* Diary Timeline Feed */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Loader size={28} className="spinner" style={{ color: 'var(--gold-accent)' }} />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="glass-panel empty-state">
              No diaries published under the {activeCategory} category yet. Be the first to share!
            </div>
          ) : (
            <div className="feed-list">
              {filteredPosts.map((post) => {
                const liked = post.likes?.some(l => l.user_id === user?.id);
                
                return (
                  <article key={post.id} className="glass-panel diary-card">
                    
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
                          handleViewProfile(post.profiles);
                        }}
                      >
                        <Avatar 
                          src={post.profiles?.avatar_url} 
                          fullName={post.profiles?.full_name} 
                          email={post.profiles?.email} 
                          size={40}
                          style={{ marginRight: '10px' }}
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
                          router.push(`/filters?category=${post.category}`);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {post.category}
                      </span>
                    </div>

                    {/* Content Section */}
                    {editingPostId === post.id ? (
                      <div className="diary-card-content">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="modern-input"
                          style={{ minHeight: '100px', marginBottom: '10px' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                          <button className="btn-secondary" onClick={() => setEditingPostId(null)}>Cancel</button>
                          <button className="btn-primary" onClick={() => handleEditSubmit(post.id)}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <div 
                         className="diary-card-content"
                         onClick={() => router.push(`/post/${post.id}`)}
                         style={{ cursor: 'pointer' }}
                       >
                         {post.content}
                       </div>
                    )}
 
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

                       {user?.id === post.author_id && (
                         <>
                           <button 
                             className="action-btn"
                             onClick={() => {
                               setEditingPostId(post.id);
                               setEditingContent(post.content);
                             }}
                           >
                             <Edit2 size={16} />
                             <span>Edit</span>
                           </button>
                           <button 
                             className="action-btn"
                             style={{ color: '#EF4444' }}
                             onClick={() => handleDeletePost(post.id)}
                           >
                             <Trash2 size={16} />
                             <span>Delete</span>
                           </button>
                         </>
                       )}
 
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

      {/* User Profile Modal Dialogue */}
      {selectedProfile && (
        <div className="modal-overlay" onClick={() => setSelectedProfile(null)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedProfile(null)}>
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center' }}>
              <Avatar 
                src={selectedProfile.avatar_url} 
                fullName={selectedProfile.full_name} 
                email={selectedProfile.email} 
                size={90}
                style={{ border: '3px solid var(--gold-accent)' }}
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

              {/* Chat action button if not viewing self */}
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
