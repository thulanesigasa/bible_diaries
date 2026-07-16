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

const BIBLE_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", 
  "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", 
  "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", 
  "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", 
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", 
  "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", 
  "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", 
  "1 John", "2 John", "3 John", "Jude", "Revelation"
];

// Map of common abbreviations to full book names
const BOOK_ABBREVIATIONS = {
  'gen': 'Genesis', 'ex': 'Exodus', 'exo': 'Exodus', 'lev': 'Leviticus', 'num': 'Numbers',
  'deut': 'Deuteronomy', 'dt': 'Deuteronomy', 'josh': 'Joshua', 'judg': 'Judges', 'jdg': 'Judges',
  'ruth': 'Ruth', '1sam': '1 Samuel', '2sam': '2 Samuel', '1sa': '1 Samuel', '2sa': '2 Samuel',
  '1kgs': '1 Kings', '2kgs': '2 Kings', '1ki': '1 Kings', '2ki': '2 Kings',
  '1chr': '1 Chronicles', '2chr': '2 Chronicles', '1ch': '1 Chronicles', '2ch': '2 Chronicles',
  'ezr': 'Ezra', 'neh': 'Nehemiah', 'est': 'Esther', 'esth': 'Esther',
  'ps': 'Psalms', 'psa': 'Psalms', 'psalm': 'Psalms', 'prov': 'Proverbs', 'pro': 'Proverbs',
  'eccl': 'Ecclesiastes', 'ecc': 'Ecclesiastes', 'sos': 'Song of Solomon', 'song': 'Song of Solomon',
  'isa': 'Isaiah', 'is': 'Isaiah', 'jer': 'Jeremiah', 'lam': 'Lamentations',
  'ezek': 'Ezekiel', 'eze': 'Ezekiel', 'dan': 'Daniel', 'hos': 'Hosea',
  'joe': 'Joel', 'am': 'Amos', 'amo': 'Amos', 'obad': 'Obadiah', 'ob': 'Obadiah',
  'jon': 'Jonah', 'mic': 'Micah', 'nah': 'Nahum', 'hab': 'Habakkuk',
  'zeph': 'Zephaniah', 'zep': 'Zephaniah', 'hag': 'Haggai', 'zech': 'Zechariah', 'zec': 'Zechariah',
  'mal': 'Malachi',
  'matt': 'Matthew', 'mat': 'Matthew', 'mt': 'Matthew', 'mk': 'Mark', 'mar': 'Mark',
  'lk': 'Luke', 'luk': 'Luke', 'jn': 'John', 'joh': 'John',
  'act': 'Acts', 'ac': 'Acts', 'rom': 'Romans', 'ro': 'Romans',
  '1cor': '1 Corinthians', '2cor': '2 Corinthians', '1co': '1 Corinthians', '2co': '2 Corinthians',
  'gal': 'Galatians', 'eph': 'Ephesians', 'phil': 'Philippians', 'php': 'Philippians',
  'col': 'Colossians', '1thess': '1 Thessalonians', '2thess': '2 Thessalonians',
  '1th': '1 Thessalonians', '2th': '2 Thessalonians',
  '1tim': '1 Timothy', '2tim': '2 Timothy', '1ti': '1 Timothy', '2ti': '2 Timothy',
  'tit': 'Titus', 'phm': 'Philemon', 'phlm': 'Philemon',
  'heb': 'Hebrews', 'jas': 'James', 'jam': 'James',
  '1pet': '1 Peter', '2pet': '2 Peter', '1pe': '1 Peter', '2pe': '2 Peter',
  '1jn': '1 John', '2jn': '2 John', '3jn': '3 John', '1jo': '1 John', '2jo': '2 John', '3jo': '3 John',
  'jud': 'Jude', 'rev': 'Revelation', 'ap': 'Revelation'
};

// Normalize user input like "jn 3 v 3" or "gen 1 1" into "John 3:3" or "Genesis 1:1"
function normalizeVerseRef(input) {
  let s = input.trim();
  // Extract the "book" portion (letters + optional leading digit) and the numbers
  const match = s.match(/^(\d?\s?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d+)(?:\s*:\s*|\s+v(?:erse)?\s+|\s+)(\d+(?:-\d+)?)$/i);
  if (!match) return null;

  let bookRaw = match[1].trim();
  const chapter = match[2];
  const verse = match[3];

  // Try abbreviation lookup (case-insensitive, no spaces)
  const abbrevKey = bookRaw.toLowerCase().replace(/\s+/g, '');
  if (BOOK_ABBREVIATIONS[abbrevKey]) {
    bookRaw = BOOK_ABBREVIATIONS[abbrevKey];
  } else {
    // Try partial match against full book names
    const lowerBook = bookRaw.toLowerCase();
    const found = BIBLE_BOOKS.find(b => b.toLowerCase() === lowerBook || b.toLowerCase().startsWith(lowerBook));
    if (found) bookRaw = found;
  }

  return { book: bookRaw, chapter, verse, formatted: `${bookRaw} ${chapter}:${verse}` };
}

export default function Feed() {
  const { user, profile, showToast } = useApp();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Post Creator State
  const [newTitle, setNewTitle] = useState('');
  const [newScripture, setNewScripture] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Faith');
  const [submitting, setSubmitting] = useState(false);
  const [modStatus, setModStatus] = useState(null); // 'checking', 'flagged', 'clean'
  const [modReason, setModReason] = useState('');

  // Scripture Autocomplete State
  const [bookSuggestions, setBookSuggestions] = useState([]);
  const [versePreview, setVersePreview] = useState(null);
  const [verseLoading, setVerseLoading] = useState(false);
  const [translation, setTranslation] = useState('kjv');
  const autocompleteTimeoutRef = useRef(null);

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
  const [editingTitle, setEditingTitle] = useState('');
  const [editingScripture, setEditingScripture] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Fetch Feed posts
  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('diaries')
        .select('*, profiles!author_id(*), likes(*), comments(*), favorites(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      showToast('Error loading feed: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Autocomplete & Verse Fetching Logic
  useEffect(() => {
    if (autocompleteTimeoutRef.current) clearTimeout(autocompleteTimeoutRef.current);

    const val = newScripture;
    if (!val || val.trim() === '') {
      setBookSuggestions([]);
      setVersePreview(null);
      return;
    }

    // Try to normalize the input into a proper verse reference
    const normalized = normalizeVerseRef(val);
    if (normalized) {
      setBookSuggestions([]);
      
      // Debounce the API call
      autocompleteTimeoutRef.current = setTimeout(async () => {
        setVerseLoading(true);
        try {
          const res = await fetch(`https://bible-api.com/${encodeURIComponent(normalized.formatted)}?translation=${translation}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.text) {
              setVersePreview({
                reference: data.reference || normalized.formatted,
                text: data.text.trim(),
                translation: data.translation_id || translation
              });
            } else {
              setVersePreview(null);
            }
          } else {
            setVersePreview(null);
          }
        } catch (err) {
          console.error("Bible API error", err);
          setVersePreview(null);
        } finally {
          setVerseLoading(false);
        }
      }, 600);
      return;
    }

    // Book autocomplete (when no verse numbers detected yet)
    const parts = val.trim().split(/\s+/);
    // If last token is a number (chapter), strip it for the book search
    const lastIsNum = parts.length > 1 && !isNaN(parts[parts.length - 1]);
    const bookTokens = lastIsNum ? parts.slice(0, -1) : parts;
    const possibleBookName = bookTokens.join(' ').toLowerCase().replace(/\s+/g, '');

    if (possibleBookName.length > 0) {
      // Check abbreviation
      if (BOOK_ABBREVIATIONS[possibleBookName]) {
        const fullName = BOOK_ABBREVIATIONS[possibleBookName];
        setBookSuggestions([fullName]);
      } else {
        // Partial match on full book names
        const searchLower = bookTokens.join(' ').toLowerCase();
        const matches = BIBLE_BOOKS.filter(b => b.toLowerCase().startsWith(searchLower));
        if (matches.length > 0 && !(matches.length === 1 && matches[0].toLowerCase() === val.trim().toLowerCase())) {
          setBookSuggestions(matches.slice(0, 6));
        } else {
          setBookSuggestions([]);
        }
      }
    } else {
      setBookSuggestions([]);
    }
    setVersePreview(null);
  }, [newScripture, translation]);

  const insertVersePreview = () => {
    if (versePreview) {
      setNewContent(prev => {
        const spacer = prev && !prev.endsWith('\n\n') ? '\n\n' : '';
        return prev + spacer + `"${versePreview.text}" - ${versePreview.reference} (${versePreview.translation.toUpperCase()})\n\n`;
      });
      showToast('Verse inserted!');
      setVersePreview(null);
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
          title: newTitle.trim() || null,
          scripture: newScripture.trim() || null,
          content: newContent,
          category: newCategory
        });

      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Diary shared on the global feed!');
        setNewTitle('');
        setNewScripture('');
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

  const handleDeletePost = (postId) => {
    setDeleteConfirmId(postId);
  };

  const executeDeletePost = async () => {
    if (!deleteConfirmId) return;
    try {
      const { error } = await supabase
        .from('diaries')
        .delete()
        .eq('id', deleteConfirmId);
      
      if (error) throw error;
      showToast('Diary deleted successfully.');
      setDeleteConfirmId(null);
      fetchPosts();
    } catch (err) {
      showToast('Error deleting diary: ' + err.message, 'error');
      setDeleteConfirmId(null);
    }
  };

  const handleEditSubmit = async (postId) => {
    if (!editingContent.trim()) return;
    try {
      const { error } = await supabase
        .from('diaries')
        .update({ 
          title: editingTitle.trim() || null,
          scripture: editingScripture.trim() || null,
          content: editingContent.trim() 
        })
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Give your reflection a Title (Optional)"
                  className="post-creator-textarea"
                  style={{ minHeight: 'auto', padding: '0.75rem 1rem' }}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  disabled={submitting}
                />
                
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Scripture reference (e.g. John 3:16) (Optional)"
                    className="post-creator-textarea"
                    style={{ minHeight: 'auto', padding: '0.75rem 1rem', fontStyle: 'italic', width: '100%' }}
                    value={newScripture}
                    onChange={(e) => setNewScripture(e.target.value)}
                    disabled={submitting}
                  />
                  {bookSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', zIndex: 10, marginTop: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      {bookSuggestions.map((book, idx) => (
                        <div 
                          key={idx} 
                          style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: idx < bookSuggestions.length - 1 ? '1px solid var(--border-color)' : 'none' }}
                          onClick={() => {
                            setNewScripture(book + ' ');
                            setBookSuggestions([]);
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{book}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {verseLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Loader size={12} className="spinner" /> Fetching verse...
                  </div>
                )}
                
                {versePreview && (
                  <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.05)', border: '1px solid var(--gold-accent)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--gold-accent)' }}>{versePreview.reference} ({versePreview.translation.toUpperCase()})</strong>
                      <button type="button" onClick={insertVersePreview} className="btn-primary" style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px' }}>
                        <Plus size={12} style={{ marginRight: 2 }} /> Insert into Reflection
                      </button>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                      "{versePreview.text}"
                    </p>
                  </div>
                )}
              </div>
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
                      <div className="diary-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="modern-input"
                          placeholder="Title (Optional)"
                        />
                        <input
                          type="text"
                          value={editingScripture}
                          onChange={(e) => setEditingScripture(e.target.value)}
                          className="modern-input"
                          placeholder="Scripture (Optional)"
                          style={{ fontStyle: 'italic' }}
                        />
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
                         {post.title && (
                           <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-color)' }}>
                             {post.title}
                           </h3>
                         )}
                         {post.scripture && (
                           <blockquote style={{ borderLeft: '3px solid var(--primary-color)', paddingLeft: '1rem', fontStyle: 'italic', color: 'var(--text-light)', margin: '0 0 1rem 0', background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '4px' }}>
                             {post.scripture}
                           </blockquote>
                         )}
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
                          className={`action-btn ${post.favorites?.some(f => f.user_id === user?.id) ? 'active-favorite' : ''}`}
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
                               setEditingTitle(post.title || '');
                               setEditingScripture(post.scripture || '');
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Diary</h3>
              <button className="icon-btn" onClick={() => setDeleteConfirmId(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Are you sure you want to delete this diary entry?
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  className="btn-secondary" 
                  onClick={() => setDeleteConfirmId(null)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  onClick={executeDeletePost}
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
