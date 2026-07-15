import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../_layout';
import { supabase } from '../../src/lib/supabase';
import { Heart, MessageSquare, Bookmark } from 'lucide-react-native';
import Avatar from '../../components/Avatar';

const CATEGORIES = ['All', 'Hope', 'Faith', 'Love', 'Wisdom'];

export default function FiltersScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  const { user, showToast } = useApp();
  const router = useRouter();

  const fetchPosts = async () => {
    try {
      let query = supabase
        .from('diaries')
        .select('*, profiles!author_id(*), likes(*), comments(*), favorites(*)')
        .order('created_at', { ascending: false });

      if (activeCategory !== 'All') {
        query = query.eq('category', activeCategory);
      }

      const { data, error } = await query;

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
  }, [activeCategory]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleToggleLike = async (post: any) => {
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
      fetchPosts();
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
    const isLiked = item.likes?.some((l: any) => l.user_id === user.id);
    const isFav = item.favorites?.some((f: any) => f.user_id === user.id) || false;
    const authorName = item.is_anonymous ? 'Anonymous Believer' : (item.profiles?.full_name || 'Believer');

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <TouchableOpacity 
            style={styles.authorRow}
            onPress={() => {
              if (!item.is_anonymous) {
                router.push(`/profile/${item.author_id}`);
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
            />
            <View>
              <Text style={styles.authorName}>{authorName}</Text>
              <Text style={styles.postTime}>
                {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        </View>

        <TouchableOpacity 
          onPress={() => router.push(`/post/${item.id}`)}
          activeOpacity={0.7}
        >
          <Text style={styles.postContent}>{item.content}</Text>
        </TouchableOpacity>

        <View style={styles.actionsBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleLike(item)}>
            <Heart size={18} color={isLiked ? '#EF4444' : '#475569'} fill={isLiked ? '#EF4444' : 'transparent'} />
            <Text style={[styles.actionText, isLiked && { color: '#EF4444' }]}>
              {item.likes?.length || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/post/${item.id}`)}>
            <MessageSquare size={18} color="#475569" />
            <Text style={styles.actionText}>{item.comments?.length || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleFavorite(item)}>
            <Bookmark size={18} color={isFav ? '#0EA5E9' : '#475569'} fill={isFav ? '#0EA5E9' : 'transparent'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Categories Bar */}
      <View style={styles.categoriesBar}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryTab,
              activeCategory === cat && styles.categoryTabActive
            ]}
            onPress={() => {
              setLoading(true);
              setActiveCategory(cat);
            }}
          >
            <Text style={[
              styles.categoryTabText,
              activeCategory === cat && styles.categoryTabTextActive
            ]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0EA5E9" />
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No reflections found in this category.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  categoriesBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
    justifyContent: 'space-between',
  },
  categoryTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  categoryTabActive: {
    backgroundColor: '#0EA5E9',
  },
  categoryTabText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 13,
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
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
  authorName: {
    fontSize: 14,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    color: '#0EA5E9',
    fontWeight: '600',
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
    borderTopColor: 'rgba(15, 23, 42, 0.05)',
    paddingTop: 12,
    gap: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    color: '#475569',
    marginLeft: 6,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#64748B',
    fontStyle: 'italic',
    fontSize: 14,
  },
});
