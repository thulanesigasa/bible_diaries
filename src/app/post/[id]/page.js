'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useApp } from '../../AppWrapper';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  Send, 
  Loader, 
  ArrowLeft,
  Trash2,
  CornerDownRight,
  UserCheck,
  UserX,
  X
} from 'lucide-react';
import Link from 'next/link';
import Avatar from '../../../components/Avatar';

export default function PostPage({ params }) {
  const resolvedParams = use(params);
  const postId = resolvedParams?.id;

  const { user, showToast } = useApp();
  const router = useRouter();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Comment inputs
  const [commentInput, setCommentInput] = useState('');
  const [commentAnonymity, setCommentAnonymity] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  // Reply inputs
  const [activeReplyBox, setActiveReplyBox] = useState(null); // comment_id -> boolean
  const [replyInput, setReplyInput] = useState('');
  const [replyAnonymity, setReplyAnonymity] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);

  // Profile Modal State
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Custom themed confirm modal state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, commentId: null, message: '' });

  const fetchPostDetails = async () => {
    if (!postId) return;
    try {
      // Fetch post details with joined profiles, likes, comments (with author profiles and comment likes)
      const { data, error } = await supabase
        .from('diaries')
        .select('*, profiles!author_id(*), likes(*), comments(*, profiles!author_id(*), comment_likes(*))')
        .eq('id', postId)
        .single();

      if (error) {
        showToast(error.message, 'error');
      } else {
        setPost(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostDetails();
  }, [postId]);

  // Like post
  const handleLike = async () => {
    if (!user || !post) return;

    const hasLiked = post.likes?.some(l => l.user_id === user.id);

    try {
      if (hasLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);

        if (error) throw error;
        
        setPost(prev => ({
          ...prev,
          likes: prev.likes.filter(l => l.user_id !== user.id)
        }));
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: post.id, user_id: user.id });

        if (error) throw error;

        setPost(prev => ({
          ...prev,
          likes: [...(prev.likes || []), { post_id: post.id, user_id: user.id }]
        }));
      }
    } catch (err) {
      showToast('Failed to like post: ' + err.message, 'error');
    }
  };

  // Bookmark/Save post
  const handleFavorite = async () => {
    if (!user || !post) return;
    
    const isFav = await checkIsFavorite(post.id);

    try {
      if (isFav) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);

        if (error) throw error;
        showToast('Removed from saved list.');
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ post_id: post.id, user_id: user.id });

        if (error) throw error;
        showToast('Saved to your favorites!');
      }
    } catch (err) {
      showToast('Failed to bookmark: ' + err.message, 'error');
    }
  };

  const checkIsFavorite = async (id) => {
    const { data } = await supabase
      .from('favorites')
      .select('*')
      .eq('post_id', id)
      .eq('user_id', user.id);
    return data && data.length > 0;
  };

  // Post root comment
  const handlePostComment = async () => {
    if (!commentInput.trim() || !user || !post) return;

    setCommentLoading(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          author_id: user.id,
          content: commentInput.trim(),
          is_anonymous: commentAnonymity,
          parent_id: null
        });

      if (error) {
        showToast(error.message, 'error');
      } else {
        setCommentInput('');
        setCommentAnonymity(false);
        showToast('Comment posted!');
        fetchPostDetails();
      }
    } catch (err) {
      showToast('Error commenting: ' + err.message, 'error');
    } finally {
      setCommentLoading(false);
    }
  };

  // Post nested reply comment
  const handlePostReply = async (parentCommentId) => {
    if (!replyInput.trim() || !user || !post) return;

    setReplyLoading(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          author_id: user.id,
          content: replyInput.trim(),
          is_anonymous: replyAnonymity,
          parent_id: parentCommentId
        });

      if (error) {
        showToast(error.message, 'error');
      } else {
        setReplyInput('');
        setReplyAnonymity(false);
        setActiveReplyBox(null);
        showToast('Reply posted!');
        fetchPostDetails();
      }
    } catch (err) {
      showToast('Error replying: ' + err.message, 'error');
    } finally {
      setReplyLoading(false);
    }
  };

  // Like comment
  const handleLikeComment = async (commentId) => {
    if (!user || !post) return;

    const comment = post.comments?.find(c => c.id === commentId);
    if (!comment) return;

    const hasLiked = comment.comment_likes?.some(l => l.user_id === user.id);

    try {
      if (hasLiked) {
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);

        if (error) throw error;
        
        fetchPostDetails();
      } else {
        const { error } = await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });

        if (error) throw error;

        fetchPostDetails();
      }
    } catch (err) {
      showToast('Failed to update comment like: ' + err.message, 'error');
    }
  };

  // Delete comment (authorised for comment creator and post author)
  const handleDeleteComment = (commentId) => {
    setConfirmModal({
      isOpen: true,
      commentId,
      message: 'Are you sure you want to delete this comment? This action cannot be undone.'
    });
  };

  const executeDeleteComment = async (commentId) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      showToast('Comment deleted successfully.');
      fetchPostDetails();
    } catch (err) {
      showToast('Failed to delete comment: ' + err.message, 'error');
    }
  };

  // Share post
  const handleShare = async () => {
    if (!post) return;
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
    showToast('Reflection link copied to clipboard!');
  };

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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
        <Loader size={32} className="spinner" style={{ color: 'var(--gold-accent)' }} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container" style={{ maxWidth: '600px', padding: '3rem 1rem', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', marginBottom: '1rem' }}>
          Reflection Not Found
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          This reflection may have been deleted by the author or does not exist.
        </p>
        <Link href="/feed" className="btn-primary" style={{ display: 'inline-flex', padding: '10px 20px' }}>
          Return to Feed
        </Link>
      </div>
    );
  }

  const liked = post.likes?.some(l => l.user_id === user?.id);

  // Group comments into root comments and nested replies
  const rootComments = (post.comments || []).filter(c => !c.parent_id);
  const getReplies = (parentCommentId) => (post.comments || []).filter(c => c.parent_id === parentCommentId);

  return (
    <div className="container" style={{ maxWidth: '800px', padding: '2rem 1rem' }}>
      
      {/* Back Button Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button 
          onClick={() => router.back()} 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>

      <article className="diary-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        
        {/* Author Details */}
        <div className="diary-card-header" style={{ marginBottom: '1.5rem' }}>
          <div 
            className="diary-card-author" 
            onClick={() => {
              if (post.profiles?.id) {
                router.push(`/profile/${post.profiles.id}`);
              }
            }}
          >
            <Avatar 
              src={post.profiles?.avatar_url} 
              fullName={post.profiles?.full_name} 
              email={post.profiles?.email} 
              size={48}
              style={{ marginRight: '10px' }}
            />
            <div>
              <div className="diary-card-author-name" style={{ fontSize: '1.05rem' }}>{post.profiles?.full_name}</div>
              <div className="diary-card-time">{formatTime(post.created_at)}</div>
            </div>
          </div>

          <span className="diary-card-category">{post.category}</span>
        </div>

        {/* Content */}
        <div className="diary-card-content" style={{ fontSize: '1.25rem', lineHeight: '1.8', marginBottom: '2rem' }}>
          {post.content}
        </div>

        {/* Actions */}
        <div className="diary-card-actions" style={{ padding: '1rem 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
          <button 
            className={`action-btn ${liked ? 'active-like' : ''}`}
            onClick={handleLike}
          >
            <Heart size={20} />
            <span>{post.likes?.length || 0} Likes</span>
          </button>

          <button className="action-btn">
            <MessageSquare size={20} />
            <span>{post.comments?.length || 0} Comments</span>
          </button>

          <button className="action-btn" onClick={handleFavorite}>
            <Bookmark size={20} />
            <span>Save Reflection</span>
          </button>

          <button className="action-btn" onClick={handleShare}>
            <Share2 size={20} />
            <span>Share</span>
          </button>
        </div>

        {/* Comments Section (Permanently expanded for easy reading) */}
        <div>
          <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-serif)', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Fellowship Comments
          </h3>
          
          {/* Write Root Comment Area */}
          <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="comment-input-wrapper" style={{ margin: 0 }}>
              <input 
                type="text" 
                className="comment-input"
                placeholder="Write a supportive comment..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePostComment();
                }}
                disabled={commentLoading}
              />
              <button 
                className="btn-primary" 
                style={{ padding: '10px 16px' }}
                onClick={handlePostComment}
                disabled={commentLoading}
              >
                <Send size={14} />
                <span>Post</span>
              </button>
            </div>
            
            {/* Anonymous Toggle Option */}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <input 
                type="checkbox" 
                checked={commentAnonymity} 
                onChange={(e) => setCommentAnonymity(e.target.checked)}
                style={{ width: 'auto', margin: 0 }}
              />
              <span>Comment anonymously as an "Anonymous Believer"</span>
            </label>
          </div>

          {/* List of comments */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {rootComments.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                No comments written yet. Be the first to share words of support!
              </p>
            ) : (
              rootComments.map((comment) => {
                const commentLiked = comment.comment_likes?.some(l => l.user_id === user?.id);
                const isCommentAuthor = user && user.id === comment.author_id;
                const isPostAuthor = user && user.id === post.author_id;
                const canDelete = isCommentAuthor || isPostAuthor;

                const replies = getReplies(comment.id);

                return (
                  <div key={comment.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    
                    {/* Root Comment Row */}
                    <div className="comment-item" style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', position: 'relative' }}>
                      <Avatar 
                        src={comment.is_anonymous ? null : comment.profiles?.avatar_url} 
                        fullName={comment.is_anonymous ? 'Anonymous Believer' : comment.profiles?.full_name} 
                        email={comment.is_anonymous ? null : comment.profiles?.email} 
                        size={28}
                        style={{ marginRight: '8px' }}
                      />
                      <div className="comment-body" style={{ flex: 1 }}>
                        <div className="comment-author-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{comment.is_anonymous ? (isCommentAuthor ? 'You (Anonymous)' : 'Anonymous Believer') : comment.profiles?.full_name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>• {formatTime(comment.created_at)}</span>
                        </div>
                        <div className="comment-text" style={{ fontSize: '0.92rem', marginTop: '4px' }}>{comment.content}</div>
                        
                        {/* Comment Action Links (Like, Reply, Delete) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <button 
                            onClick={() => handleLikeComment(comment.id)} 
                            style={{ color: commentLiked ? 'var(--heart-red)' : 'inherit', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '2px' }}
                          >
                            <Heart size={12} fill={commentLiked ? 'var(--heart-red)' : 'none'} />
                            <span>{comment.comment_likes?.length || 0} Likes</span>
                          </button>
                          
                          <button 
                            onClick={() => {
                              setActiveReplyBox(activeReplyBox === comment.id ? null : comment.id);
                              setReplyInput('');
                            }}
                            style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '2px' }}
                          >
                            <MessageSquare size={12} />
                            <span>Reply</span>
                          </button>

                          {canDelete && (
                            <button 
                              onClick={() => handleDeleteComment(comment.id)}
                              style={{ color: '#EF4444', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '2px', marginLeft: 'auto' }}
                              title="Delete Comment"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Nested Replies List */}
                    {replies.map((reply) => {
                      const replyLiked = reply.comment_likes?.some(l => l.user_id === user?.id);
                      const isReplyAuthor = user && user.id === reply.author_id;
                      const canDeleteReply = isReplyAuthor || isPostAuthor;

                      return (
                        <div key={reply.id} style={{ display: 'flex', gap: '0.5rem', marginLeft: '2.5rem', borderLeft: '2px solid var(--border-color)', paddingLeft: '1rem' }}>
                          <CornerDownRight size={14} style={{ color: 'var(--text-muted)', marginTop: '0.75rem' }} />
                          <div className="comment-item" style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', flex: 1 }}>
                            <Avatar 
                              src={reply.is_anonymous ? null : reply.profiles?.avatar_url} 
                              fullName={reply.is_anonymous ? 'Anonymous Believer' : reply.profiles?.full_name} 
                              email={reply.is_anonymous ? null : reply.profiles?.email} 
                              size={24}
                              style={{ marginRight: '6px' }}
                            />
                            <div className="comment-body" style={{ flex: 1 }}>
                              <div className="comment-author-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                                <span>{reply.is_anonymous ? (isReplyAuthor ? 'You (Anonymous)' : 'Anonymous Believer') : reply.profiles?.full_name}</span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>• {formatTime(reply.created_at)}</span>
                              </div>
                              <div className="comment-text" style={{ fontSize: '0.88rem', marginTop: '2px' }}>{reply.content}</div>
                              
                              {/* Reply Action Links */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <button 
                                  onClick={() => handleLikeComment(reply.id)} 
                                  style={{ color: replyLiked ? 'var(--heart-red)' : 'inherit', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '2px' }}
                                >
                                  <Heart size={11} fill={replyLiked ? 'var(--heart-red)' : 'none'} />
                                  <span>{reply.comment_likes?.length || 0} Likes</span>
                                </button>

                                {canDeleteReply && (
                                  <button 
                                    onClick={() => handleDeleteComment(reply.id)}
                                    style={{ color: '#EF4444', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '2px', marginLeft: 'auto' }}
                                    title="Delete Reply"
                                  >
                                    <Trash2 size={11} />
                                    <span>Delete</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Active Reply Input Box */}
                    {activeReplyBox === comment.id && (
                      <div style={{ marginLeft: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem', borderLeft: '2px solid var(--gold-accent)', paddingLeft: '1rem' }}>
                        <div className="comment-input-wrapper" style={{ margin: 0 }}>
                          <input 
                            type="text" 
                            className="comment-input"
                            placeholder="Write a reply..."
                            value={replyInput}
                            onChange={(e) => setReplyInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handlePostReply(comment.id);
                            }}
                            disabled={replyLoading}
                            style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                          />
                          <button 
                            className="btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => handlePostReply(comment.id)}
                            disabled={replyLoading}
                          >
                            <Send size={12} />
                            <span>Reply</span>
                          </button>
                        </div>
                        
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <input 
                            type="checkbox" 
                            checked={replyAnonymity} 
                            onChange={(e) => setReplyAnonymity(e.target.checked)}
                            style={{ width: 'auto', margin: 0 }}
                          />
                          <span>Reply anonymously</span>
                        </label>
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        </div>

      </article>

      {/* Profile Modal */}
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

      {/* Custom Themed Confirm Delete Modal */}
      {confirmModal.isOpen && (
        <div className="modal-overlay" onClick={() => setConfirmModal({ isOpen: false, commentId: null, message: '' })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Confirm Deletion
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setConfirmModal({ isOpen: false, commentId: null, message: '' })}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={async () => {
                  const id = confirmModal.commentId;
                  setConfirmModal({ isOpen: false, commentId: null, message: '' });
                  if (id) {
                    await executeDeleteComment(id);
                  }
                }}
                style={{ padding: '8px 16px', fontSize: '0.85rem', backgroundColor: '#EF4444', borderColor: '#EF4444', color: '#fff' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
