import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../_layout';
import { supabase } from '../../src/lib/supabase';
import { Search, ChevronRight, BookOpen } from 'lucide-react-native';
import Avatar from '../../components/Avatar';

export default function ConnectScreen() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { user, showToast, accent } = useApp();
  const router = useRouter();

  const fetchProfiles = async () => {
    try {
      // Fetch all user profiles from supabase, excluding the current logged-in user
      let query = supabase.from('profiles').select('*');
      if (user) {
        query = query.neq('id', user.id);
      }
      
      const { data, error } = await query;

      if (error) {
        showToast(error.message, 'error');
      } else {
        setProfiles(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfiles();
  };

  const filteredProfiles = profiles.filter((p) => {
    const fullName = (p.full_name || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query);
  });

  const renderProfileItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity 
        style={styles.profileCard}
        onPress={() => router.push((`/profile/${item.id}`) as any)}
        activeOpacity={0.7}
      >
        <Avatar 
          src={item.avatar_url} 
          fullName={item.full_name} 
          size={50}
          style={{ marginRight: 14 }}
          accent={accent}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{item.full_name || 'Believer'}</Text>
          {item.favorite_verse ? (
            <View style={styles.verseRow}>
              <BookOpen size={13} color={accent} style={{ marginRight: 4 }} />
              <Text style={styles.profileVerse} numberOfLines={1}>
                "{item.favorite_verse}"
              </Text>
            </View>
          ) : (
            <Text style={styles.profileBio} numberOfLines={1}>
              {item.bio || 'Sharing the walk of faith.'}
            </Text>
          )}
        </View>
        <ChevronRight size={18} color="#94A3B8" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search fellow believers..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      ) : (
        <FlatList
          data={filteredProfiles}
          renderItem={renderProfileItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No fellow believers found.</Text>
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
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '500',
    height: '100%',
    padding: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 110,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  verseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileVerse: {
    fontSize: 12,
    color: '#0EA5E9',
    fontStyle: 'italic',
    fontWeight: '500',
    flex: 1,
  },
  profileBio: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: '#64748B',
    fontStyle: 'italic',
    fontSize: 14,
  },
});
