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
import { ChevronRight, MessageSquare } from 'lucide-react-native';
import Avatar from '../../components/Avatar';

export default function ChatScreen() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { user, showToast } = useApp();
  const router = useRouter();

  const fetchConversations = async () => {
    if (!user) return;
    try {
      // Query chats where user is sender or receiver
      const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (chatsError) throw chatsError;

      // Group by partner ID to find unique conversation partners
      const partnerMap = new Map<string, any>();
      (chats || []).forEach(chat => {
        const partnerId = chat.sender_id === user.id ? chat.receiver_id : chat.sender_id;
        if (!partnerMap.has(partnerId)) {
          partnerMap.set(partnerId, chat); // Keep the latest message
        }
      });

      const partnerIds = Array.from(partnerMap.keys());
      if (partnerIds.length === 0) {
        setConversations([]);
        return;
      }

      // Fetch profiles of all partner IDs
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', partnerIds);

      if (profilesError) throw profilesError;

      // Merge profile information into conversation items
      const merged = profiles.map((prof: any) => {
        const lastMessage = partnerMap.get(prof.id);
        return {
          id: prof.id,
          profile: prof,
          lastMessage: lastMessage?.message || '',
          timestamp: lastMessage?.created_at || ''
        };
      });

      // Sort by last message timestamp descending
      merged.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setConversations(merged);
    } catch (e: any) {
      console.error(e);
      showToast('Failed to load conversations: ' + e.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    // Subscribe to real-time chats to refresh inbox
    const channel = supabase
      .channel('chat-inbox-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const renderConversationItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity 
        style={styles.convCard}
        onPress={() => router.push((`/chat/${item.id}`) as any)}
        activeOpacity={0.7}
      >
        <Avatar 
          src={item.profile.avatar_url} 
          fullName={item.profile.full_name} 
          size={48}
          style={{ marginRight: 14 }}
        />
        <View style={styles.convInfo}>
          <Text style={styles.partnerName}>{item.profile.full_name || 'Believer'}</Text>
          <Text style={styles.lastMsg} numberOfLines={1}>
            {item.lastMessage || 'Start a conversation...'}
          </Text>
        </View>
        <View style={styles.rightSection}>
          {item.timestamp ? (
            <Text style={styles.timeText}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          ) : null}
          <ChevronRight size={16} color="#94A3B8" style={{ marginTop: 4 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0EA5E9" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MessageSquare size={32} color="#94A3B8" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>No private messages yet.</Text>
              <Text style={styles.emptySubtext}>Use the Connect tab to locate fellow believers and start fellowship.</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  convCard: {
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
  convInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  lastMsg: {
    fontSize: 13,
    color: '#64748B',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 6,
  },
  emptySubtext: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
