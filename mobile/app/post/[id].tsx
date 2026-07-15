import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Share,
  Alert,
  Modal,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../_layout';
import { supabase } from '../../src/lib/supabase';
import { Heart, MessageSquare, Bookmark, Send, ArrowLeft, Share2, Edit2, Trash2 } from 'lucide-react-native';
import Avatar from '../../components/Avatar';

export default function PostDetailsScreen() {
  const { id: rawId } = useLocalSearchParams();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editContent, setEditContent] = useState('');

  const { user, showToast } = useApp();
  const router = useRouter();

  const fetchPostDetails = async () => {
    try {
      // Fetch post with author profile and reactions
      const { data: postData, error: postError } = await supabase
        .from('diaries')
        .select('*, profiles!author_id(*), likes(*), favorites(*)')
        .eq('id', id)
        .single();

      if (postError) {
        showToast(postError.message, 'error');
        router.back();
        return;
      }
      setPost(postData);

      // Fetch comments with author profile
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*, profiles!author_id(*)')
        .eq('post_id', id)
        .order('created_at', { ascending: true });

      if (commentsError) {
        showToast(commentsError.message, 'error');
      } else {
        setComments(commentsData || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostDetails();
  }, [id]);

  const handleToggleLike = async () => {
    if (!post || !user) return;
    const isLiked = post.likes?.some((l: any) => l.user_id === user.id);
    try {
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: post.id, user_id: user.id });
        if (error) throw error;
      }
      fetchPostDetails();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleToggleFavorite = async () => {
    if (!post || !user) return;
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
      fetchPostDetails();
    } catch (e: any) {
      showToast(e.message, 'error');
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

  const handleDeletePost = () => {
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
              const { error } = await supabase.from('diaries').delete().eq('id', id);
              if (error) throw error;
              showToast('Diary deleted successfully.');
              router.replace('/(tabs)');
            } catch (err: any) {
              showToast('Error deleting diary: ' + err.message, 'error');
            }
          }
        }
      ]
    );
  };

  const handleEditPostSubmit = async () => {
    if (!editContent.trim()) return;
    try {
      const { error } = await supabase.from('diaries').update({ content: editContent.trim() }).eq('id', id);
      if (error) throw error;
      showToast('Diary updated successfully.');
      setIsEditingPost(false);
      fetchPostDetails();
    } catch (err: any) {
      showToast('Error updating diary: ' + err.message, 'error');
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !user || submittingComment) return;

    // Guideline check
    const blacklisted = ['vulgarword1', 'vulgarword2', 'hate speech', 'profanity'];
    if (blacklisted.some(word => newComment.toLowerCase().includes(word))) {
      showToast('Your comment contains words that do not match community guidelines.', 'error');
      return;
    }

    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: id,
          author_id: user.id,
          content: newComment.trim(),
        });

      if (error) {
        showToast(error.message, 'error');
      } else {
        setNewComment('');
        showToast('Comment posted.');
        fetchPostDetails();
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const renderCommentItem = ({ item }: { item: any }) => {
    return (
      <View style={styles.commentCard}>
        <Avatar 
          src={item.profiles?.avatar_url} 
          fullName={item.profiles?.full_name} 
          size={32}
          style={{ marginRight: 10 }}
        />
        <View style={styles.commentContentArea}>
          <View style={styles.commentMeta}>
            <Text style={styles.commentAuthor}>{item.profiles?.full_name || 'Believer'}</Text>
            <Text style={styles.commentTime}>
              {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  const isLiked = post?.likes?.some((l: any) => l.user_id === user.id);
  const isFav = post?.favorites?.some((f: any) => f.user_id === user.id) || false;
  const authorName = post?.is_anonymous ? 'Anonymous Believer' : (post?.profiles?.full_name || 'Believer');

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
    >
      <FlatList
        data={comments}
        renderItem={renderCommentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.authorRow}>
                <Avatar 
                  src={post?.is_anonymous ? null : post?.profiles?.avatar_url} 
                  fullName={post?.is_anonymous ? 'Anonymous Believer' : post?.profiles?.full_name} 
                  email={post?.is_anonymous ? null : post?.profiles?.email} 
                  size={42}
                  style={{ marginRight: 12 }}
                />
                <View>
                  <Text style={styles.authorName}>{authorName}</Text>
                  <Text style={styles.postTime}>
                    {new Date(post?.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{post?.category}</Text>
              </View>
            </View>

            <Text style={styles.postContent}>{post?.content}</Text>

            <View style={styles.actionsBar}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleToggleLike}>
                <Heart size={20} color={isLiked ? '#EC4899' : '#475569'} fill={isLiked ? '#EC4899' : 'transparent'} />
                <Text style={[styles.actionText, isLiked && { color: '#EC4899' }]}>
                  {post?.likes?.length || 0}
                </Text>
              </TouchableOpacity>

              <View style={styles.actionBtn}>
                <MessageSquare size={20} color="#475569" />
                <Text style={styles.actionText}>{comments.length}</Text>
              </View>

              <TouchableOpacity style={styles.actionBtn} onPress={handleToggleFavorite}>
                <Bookmark size={20} color={isFav ? '#0EA5E9' : '#475569'} fill={isFav ? '#0EA5E9' : 'transparent'} />
                <Text style={[styles.actionText, isFav && { color: '#0EA5E9' }]}>
                  {isFav ? 'Bookmarked' : 'Bookmark'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(post?.content, post?.profiles?.full_name)}>
                <Share2 size={20} color="#475569" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>

              {user?.id === post?.author_id && (
                <>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditContent(post?.content); setIsEditingPost(true); }}>
                    <Edit2 size={20} color="#475569" />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={handleDeletePost}>
                    <Trash2 size={20} color="#EF4444" />
                    <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <Text style={styles.sectionDivider}>Comments ({comments.length})</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyComments}>
            <Text style={styles.emptyCommentsText}>No comments yet. Share some words of encouragement!</Text>
          </View>
        }
      />

      {/* Input Box */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.textInput}
          placeholder="Write a comment..."
          placeholderTextColor="#94A3B8"
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendBtn, !newComment.trim() && styles.sendBtnDisabled]}
          onPress={handlePostComment}
          disabled={!newComment.trim() || submittingComment}
        >
          <Send size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Modal visible={isEditingPost} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
            <TouchableOpacity onPress={() => setIsEditingPost(false)}>
              <Text style={{ fontSize: 16, color: '#64748B' }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Edit Diary</Text>
            <TouchableOpacity onPress={handleEditPostSubmit}>
              <Text style={{ fontSize: 16, color: '#0EA5E9', fontWeight: 'bold' }}>Save</Text>
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
    </KeyboardAvoidingView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },
  backBtn: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  listContainer: {
    paddingBottom: 24,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  postTime: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#0EA5E9',
    fontWeight: '600',
  },
  postContent: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 24,
    marginBottom: 20,
  },
  actionsBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.05)',
    paddingTop: 16,
    gap: 32,
    marginBottom: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 8,
    fontWeight: '500',
  },
  sectionDivider: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
  },
  commentCard: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.04)',
  },
  commentContentArea: {
    flex: 1,
  },
  commentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  commentTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  commentText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  emptyComments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyCommentsText: {
    color: '#94A3B8',
    fontStyle: 'italic',
    fontSize: 13,
    textAlign: 'center',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    fontSize: 14,
    color: '#0F172A',
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
});
