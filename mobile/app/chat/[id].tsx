import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../_layout';
import { Send, ArrowLeft } from 'lucide-react-native';
import Avatar from '../../components/Avatar';

export default function ChatWindowScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { user, showToast, accent, supabase } = useApp();
  const router = useRouter();

  const fetchPartnerDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        showToast(error.message, 'error');
        router.back();
      } else {
        setPartnerProfile(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        showToast(error.message, 'error');
      } else {
        setMessages(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Realtime subscription for new messages
  useEffect(() => {
    fetchPartnerDetails();
    fetchMessages();

    const channel = supabase
      .channel(`chat:${user.id}:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
          filter: `sender_id=eq.${id},receiver_id=eq.${user.id}`
        },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('chats')
        .insert({
          sender_id: user.id,
          receiver_id: id,
          message: newMessage.trim(),
        });

      if (error) {
        showToast(error.message, 'error');
      } else {
        setNewMessage('');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const renderMessageItem = ({ item }: { item: any }) => {
    const isMe = item.sender_id === user.id;

    return (
      <View style={[
        styles.messageRow,
        isMe ? styles.messageRowRight : styles.messageRowLeft
      ]}>
        {!isMe && partnerProfile && (
          <Avatar 
            src={partnerProfile.avatar_url} 
            fullName={partnerProfile.full_name} 
            size={30}
            style={{ marginRight: 8, alignSelf: 'flex-end' }}
            accent={accent}
          />
        )}
        <View style={[
          styles.messageBubble,
          isMe ? [styles.bubbleRight, { backgroundColor: accent }] : styles.bubbleLeft
        ]}>
          <Text style={[
            styles.messageText,
            isMe ? styles.textRight : styles.textLeft
          ]}>{item.message}</Text>
          <Text style={[
            styles.timeText,
            isMe ? styles.timeRight : styles.timeLeft
          ]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 90}
    >
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Avatar 
          src={partnerProfile?.avatar_url} 
          fullName={partnerProfile?.full_name} 
          size={36}
          style={{ marginRight: 10 }}
          accent={accent}
        />
        <View>
          <Text style={styles.headerTitle}>{partnerProfile?.full_name || 'Believer'}</Text>
          <Text style={[styles.headerSubtitle, { color: accent }]}>Online Fellowship</Text>
        </View>
      </View>

      {/* Messages Stream */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input Box */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.textInput}
          placeholder="Send a private message..."
          placeholderTextColor="#94A3B8"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendBtn, { backgroundColor: accent }, !newMessage.trim() && styles.sendBtnDisabled]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          <Send size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
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
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#0EA5E9',
    fontWeight: '500',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '80%',
  },
  messageRowLeft: {
    alignSelf: 'flex-start',
  },
  messageRowRight: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleLeft: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
  },
  bubbleRight: {
    backgroundColor: '#0EA5E9',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  textLeft: {
    color: '#334155',
  },
  textRight: {
    color: '#FFFFFF',
  },
  timeText: {
    fontSize: 9,
    marginTop: 4,
  },
  timeLeft: {
    color: '#94A3B8',
    textAlign: 'right',
  },
  timeRight: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
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
