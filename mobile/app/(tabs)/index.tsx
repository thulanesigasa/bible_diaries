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

export default function FeedScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Hope');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

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
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Mobile Feed fetchPosts - Session exists:', !!sessionData.session, 'User ID:', sessionData.session?.user?.id);
      
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
        content: newContent.trim(),
        category: selectedCategory,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('diaries').insert(newPost);
      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Reflection published successfully!');
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
    Alert.alert(
      "Delete Diary",
      "Are you sure you want to delete this diary entry?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.from('diaries').delete().eq('id', postId);
              if (error) throw error;
              showToast('Diary deleted successfully.');
              fetchPosts();
            } catch (err: any) {
              showToast('Error deleting diary: ' + err.message, 'error');
            }
          }
        }
      ]
    );
  };

  const handleEditPostSubmit = async () => {
    if (!editContent.trim() || !editingPostId) return;
    try {
      const { error } = await supabase.from('diaries').update({ content: editContent.trim() }).eq('id', editingPostId);
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
          <Text style={styles.postContent}>{item.content}</Text>
        </TouchableOpacity>

        {/* Actions bar */}
        <View style={styles.actionsBar}>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => handleToggleLike(item)}
          >
            <Heart size={18} color={isLiked ? '#EC4899' : '#475569'} fill={isLiked ? '#EC4899' : 'transparent'} />
            <Text style={[styles.actionText, isLiked && { color: '#EC4899' }]}>
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
              <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditingPostId(item.id); setEditContent(item.content); setIsEditingPost(true); }}>
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

      {/* Floating Add Post Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={openModal}
      >
        <Plus size={24} color="#FFFFFF" />
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
          <TextInput
            style={{ flex: 1, padding: 16, fontSize: 16, textAlignVertical: 'top' }}
            multiline
            value={editContent}
            onChangeText={setEditContent}
            autoFocus
          />
        </SafeAreaView>
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
  postContent: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
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
    backgroundColor: '#EC4899',
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
