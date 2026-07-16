import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ActivityIndicator,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '../_layout';
import { Heart, MessageSquare, Bookmark, Plus, X, Globe, UserCheck, Send, Share2, Edit2, Trash2 } from 'lucide-react-native';
import Avatar from '../../components/Avatar';

const CATEGORIES = ['Hope', 'Faith', 'Love', 'Strength', 'Gratitude', 'Wisdom'];

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

const BOOK_ABBREVIATIONS: Record<string, string> = {
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

function normalizeVerseRef(input: string) {
  const s = input.trim();
  const match = s.match(/^(\d?\s?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d+)(?:\s*:\s*|\s+v(?:erse)?\s+|\s+)(\d+(?:-\d+)?)$/i);
  if (!match) return null;

  let bookRaw = match[1].trim();
  const chapter = match[2];
  const verse = match[3];

  const abbrevKey = bookRaw.toLowerCase().replace(/\s+/g, '');
  if (BOOK_ABBREVIATIONS[abbrevKey]) {
    bookRaw = BOOK_ABBREVIATIONS[abbrevKey];
  } else {
    const lowerBook = bookRaw.toLowerCase();
    const found = BIBLE_BOOKS.find(b => b.toLowerCase() === lowerBook || b.toLowerCase().startsWith(lowerBook));
    if (found) bookRaw = found;
  }

  return { book: bookRaw, chapter, verse, formatted: `${bookRaw} ${chapter}:${verse}` };
}

export default function FeedScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newScripture, setNewScripture] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Hope');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editScripture, setEditScripture] = useState('');
  const [editContent, setEditContent] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Scripture Autocomplete State
  const [bookSuggestions, setBookSuggestions] = useState<string[]>([]);
  const [versePreview, setVersePreview] = useState<any>(null);
  const [verseLoading, setVerseLoading] = useState(false);
  const [translation, setTranslation] = useState('kjv');
  const autocompleteTimeoutRef = React.useRef<any>(null);

  const { user, profile, showToast, setHideTabBar, accent, supabase } = useApp();
  const router = useRouter();

  const openModal = () => {
    setShowCreateModal(true);
    setHideTabBar(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setHideTabBar(false);
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('diaries')
        .select('*, profiles!author_id(*), likes(*), comments(*), favorites(*)')
        .order('created_at', { ascending: false });

      if (error) {
        showToast(error.message, 'error');
      } else {
        setPosts(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
    setRefreshing(false);
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
    const lastIsNum = parts.length > 1 && !isNaN(Number(parts[parts.length - 1]));
    const bookTokens = lastIsNum ? parts.slice(0, -1) : parts;
    const possibleBookName = bookTokens.join(' ').toLowerCase().replace(/\s+/g, '');

    if (possibleBookName.length > 0) {
      if (BOOK_ABBREVIATIONS[possibleBookName]) {
        const fullName = BOOK_ABBREVIATIONS[possibleBookName];
        setBookSuggestions([fullName]);
      } else {
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

  // Content moderation check
  const isContentInappropriate = (text: string) => {
    const blacklisted = ['vulgarword1', 'vulgarword2', 'hate speech', 'profanity'];
    return blacklisted.some(word => text.toLowerCase().includes(word));
  };

  const handleCreatePost = async () => {
    if (!newContent.trim()) {
      showToast('Reflection content cannot be empty.', 'error');
      return;
    }

    if (isContentInappropriate(newContent)) {
      showToast('Your reflection contains content that does not match our community guidelines.', 'error');
      return;
    }

    setPublishing(true);
    try {
      // If anonymous, we set author_id to a special anonymous flag or default mock account.
      // In a real DB, you store author_id for RLS but hide it on the UI.
      const newPost = {
        author_id: user.id,
        title: newTitle.trim() || null,
        scripture: newScripture.trim() || null,
        content: newContent.trim(),
        category: selectedCategory,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('diaries').insert(newPost);
      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Reflection published successfully!');
        setNewTitle('');
        setNewScripture('');
        setNewContent('');
        setIsAnonymous(false);
        closeModal();
        fetchPosts();
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to publish post.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    setDeleteConfirmId(postId);
  };

  const executeDeletePost = async () => {
    if (!deleteConfirmId) return;
    try {
      const { error } = await supabase.from('diaries').delete().eq('id', deleteConfirmId);
      if (error) throw error;
      showToast('Diary deleted successfully.');
      setDeleteConfirmId(null);
      fetchPosts();
    } catch (err: any) {
      showToast('Error deleting diary: ' + err.message, 'error');
      setDeleteConfirmId(null);
    }
  };

  const handleEditPostSubmit = async () => {
    if (!editContent.trim() || !editingPostId) return;
    try {
      const { error } = await supabase.from('diaries').update({ 
        title: editTitle.trim() || null,
        scripture: editScripture.trim() || null,
        content: editContent.trim() 
      }).eq('id', editingPostId);
      if (error) throw error;
      showToast('Diary updated successfully.');
      setIsEditingPost(false);
      setEditingPostId(null);
      fetchPosts();
    } catch (err: any) {
      showToast('Error updating diary: ' + err.message, 'error');
    }
  };

  const handleShare = async (content: string, author: string) => {
    try {
      await Share.share({
        message: `Reflection by ${author || 'a believer'} on bible_diaries:\n\n"${content}"`,
      });
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleToggleLike = async (post: any) => {
    const isLiked = post.likes?.some((l: any) => l.user_id === user.id);
    try {
      if (isLiked) {
        // Delete like row
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert like row
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: post.id, user_id: user.id });

        if (error) throw error;
      }
      fetchPosts(); // Refresh posts to update UI counts
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleToggleFavorite = async (post: any) => {
    const isFav = post.favorites?.some((f: any) => f.user_id === user.id) || false;
    try {
      if (isFav) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);

        if (error) throw error;
        showToast('Removed from bookmarks.');
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ post_id: post.id, user_id: user.id });

        if (error) throw error;
        showToast('Saved to bookmarks!');
      }
      fetchPosts();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const renderPostItem = ({ item }: { item: any }) => {
    const isLiked = item.likes?.some((l: any) => l.user_id === user?.id);
    const isFav = item.favorites?.some((f: any) => f.user_id === user?.id) || false;
    const authorName = item.is_anonymous ? 'Anonymous Believer' : (item.profiles?.full_name || 'Believer');
    const authorAvatar = item.is_anonymous
      ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
      : (item.profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');

    return (
      <View style={styles.postCard}>
        {/* Author details */}
        <View style={styles.postHeader}>
          <TouchableOpacity 
            style={styles.authorRow}
            onPress={() => {
              if (!item.is_anonymous) {
                router.push((`/profile/${item.author_id}`) as any);
              }
            }}
            disabled={item.is_anonymous}
          >
            <Avatar 
              src={item.is_anonymous ? null : item.profiles?.avatar_url} 
              fullName={item.is_anonymous ? 'Anonymous Believer' : item.profiles?.full_name} 
              email={item.is_anonymous ? null : item.profiles?.email} 
              size={38}
              style={{ marginRight: 10 }}
              accent={accent}
            />
            <View>
              <Text style={styles.authorName}>{authorName}</Text>
              <Text style={styles.postTime}>
                {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.categoryBadge, { backgroundColor: `${accent}15` }]}>
            <Text style={[styles.categoryText, { color: accent }]}>{item.category}</Text>
          </View>
        </View>

        {/* Content body */}
        <TouchableOpacity 
          onPress={() => router.push((`/post/${item.id}`) as any)}
          activeOpacity={0.7}
        >
          {item.title ? <Text style={styles.postTitle}>{item.title}</Text> : null}
          {item.scripture ? (
            <View style={[styles.scriptureQuote, { borderLeftColor: accent, backgroundColor: `${accent}10` }]}>
              <Text style={styles.scriptureText}>{item.scripture}</Text>
            </View>
          ) : null}
          <Text style={styles.postContent}>{item.content}</Text>
        </TouchableOpacity>

        {/* Actions bar */}
        <View style={styles.actionsBar}>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => handleToggleLike(item)}
          >
            <Heart size={18} color={isLiked ? accent : '#475569'} fill={isLiked ? accent : 'transparent'} />
            <Text style={[styles.actionText, isLiked && { color: accent }]}>
              {item.likes?.length || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => router.push((`/post/${item.id}`) as any)}
          >
            <MessageSquare size={18} color="#475569" />
            <Text style={styles.actionText}>{item.comments?.length || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => handleToggleFavorite(item)}
          >
            <Bookmark size={18} color={isFav ? accent : '#475569'} fill={isFav ? accent : 'transparent'} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => handleShare(item.content, item.profiles?.full_name)}
          >
            <Share2 size={18} color="#475569" />
          </TouchableOpacity>

          {user?.id === item.author_id && (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditingPostId(item.id); setEditTitle(item.title || ''); setEditScripture(item.scripture || ''); setEditContent(item.content); setIsEditingPost(true); }}>
                <Edit2 size={18} color="#475569" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeletePost(item.id)}>
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No reflections published yet. Be the first!</Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: accent }]} onPress={openModal}>
        <Plus size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Create Reflection Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalBg}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Share Your Reflection</Text>
                <Text style={styles.modalSubTitle}>Inspire the fellowship with your daily walk of faith.</Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              {/* Category selector */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionLabel}>Select Category</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScrollContainer}
                >
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catSelectBtn,
                        selectedCategory === cat && { borderColor: accent, backgroundColor: `${accent}15` }
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text style={[
                        styles.catSelectText,
                        selectedCategory === cat && { color: accent }
                      ]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Title Input */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionLabel}>Title (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Give your reflection a title..."
                  placeholderTextColor="#94A3B8"
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
              </View>

              {/* Scripture Input */}
              <View style={[styles.modalSection, { zIndex: 10 }]}>
                <Text style={styles.sectionLabel}>Scripture (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. John 3:16"
                  placeholderTextColor="#94A3B8"
                  value={newScripture}
                  onChangeText={setNewScripture}
                />

                {bookSuggestions.length > 0 && (
                  <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, marginTop: 4 }}>
                    {bookSuggestions.map((book, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={{ padding: 12, borderBottomWidth: idx < bookSuggestions.length - 1 ? 1 : 0, borderBottomColor: '#E2E8F0' }}
                        onPress={() => {
                          setNewScripture(book + ' ');
                          setBookSuggestions([]);
                        }}
                      >
                        <Text style={{ fontWeight: '600', color: '#0F172A' }}>{book}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {verseLoading && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <ActivityIndicator size="small" color={accent} style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 12, color: '#64748B' }}>Fetching verse...</Text>
                  </View>
                )}
                
                {versePreview && (
                  <View style={{ backgroundColor: `${accent}10`, borderWidth: 1, borderColor: accent, borderRadius: 8, padding: 12, marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: accent }}>{versePreview.reference} ({versePreview.translation.toUpperCase()})</Text>
                      <TouchableOpacity onPress={insertVersePreview} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                        <Plus size={12} color="#FFFFFF" style={{ marginRight: 2 }} />
                        <Text style={{ fontSize: 11, color: '#FFFFFF', fontWeight: 'bold' }}>Insert</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 13, color: '#334155', fontStyle: 'italic', lineHeight: 20 }}>
                      "{versePreview.text}"
                    </Text>
                  </View>
                )}
              </View>

              {/* Text Input */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionLabel}>Your Reflection</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="What is on your heart today? Share scripture, a prayer, or an encouraging testimony..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={6}
                  value={newContent}
                  onChangeText={setNewContent}
                />
              </View>

              {/* Anonymous setting */}
              <View style={styles.anonymousRow}>
                <View>
                  <Text style={styles.anonymousTitle}>Post Anonymously</Text>
                  <Text style={styles.anonymousDesc}>Your name and avatar will be hidden from other members.</Text>
                </View>
                <Switch
                  value={isAnonymous}
                  onValueChange={setIsAnonymous}
                  trackColor={{ false: '#E2E8F0', true: '#bae6fd' }}
                  thumbColor={isAnonymous ? accent : '#94A3B8'}
                />
              </View>

              <TouchableOpacity 
                style={[styles.btnPublish, { backgroundColor: accent }, publishing && styles.btnDisabled]}
                onPress={handleCreatePost}
                disabled={publishing}
              >
                {publishing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.btnPublishRow}>
                    <Send size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.btnPublishText}>Publish Entry</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Edit Post Modal */}
      <Modal visible={isEditingPost} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
            <TouchableOpacity onPress={() => setIsEditingPost(false)}>
              <Text style={{ fontSize: 16, color: '#64748B' }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Edit Diary</Text>
            <TouchableOpacity onPress={handleEditPostSubmit}>
              <Text style={{ fontSize: 16, color: accent, fontWeight: 'bold' }}>Save</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
            <TextInput
              style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}
              placeholder="Title (Optional)"
              value={editTitle}
              onChangeText={setEditTitle}
            />
            <TextInput
              style={{ fontSize: 14, fontStyle: 'italic', color: '#64748B' }}
              placeholder="Scripture (Optional)"
              value={editScripture}
              onChangeText={setEditScripture}
            />
          </View>
          <TextInput
            style={{ flex: 1, padding: 16, fontSize: 16, textAlignVertical: 'top' }}
            multiline
            value={editContent}
            onChangeText={setEditContent}
            autoFocus
          />
        </SafeAreaView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={!!deleteConfirmId} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 12 }}>Delete Diary</Text>
            <Text style={{ fontSize: 15, color: '#475569', marginBottom: 24, lineHeight: 22 }}>
              Are you sure you want to delete this diary entry?
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity 
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#F1F5F9' }}
                onPress={() => setDeleteConfirmId(null)}
              >
                <Text style={{ color: '#475569', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: accent }}
                onPress={executeDeletePost}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 110,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    backgroundColor: '#E2E8F0',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  postTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  categoryBadge: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 6,
    lineHeight: 22,
  },
  scriptureQuote: {
    borderLeftWidth: 3,
    borderLeftColor: '#64748B',
    paddingLeft: 10,
    marginVertical: 8,
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 4,
  },
  scriptureText: {
    fontStyle: 'italic',
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  postContent: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 16,
  },
  actionsBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.04)',
    paddingTop: 12,
    gap: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 90, // Positioned above floating tab bar
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 99,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.06)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  modalForm: {
    padding: 24,
    gap: 20,
  },
  modalSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  categoryScrollContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  catSelectBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  catSelectBtnActive: {
    borderColor: 'rgba(14, 165, 233, 0.08)',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  catSelectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  catSelectTextActive: {
    color: '#64748B',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  anonymousRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  anonymousTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  anonymousDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    maxWidth: '80%',
  },
  btnPublish: {
    backgroundColor: '#64748B',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  btnPublishRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnPublishText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
