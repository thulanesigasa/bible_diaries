'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useApp } from '../../AppWrapper';
import { Send, Loader, User, BookOpen } from 'lucide-react';
import Avatar from '../../../components/Avatar';

export default function ChatPage({ params }) {
  // Use React's use() to read params since in Next 15+ it is a Promise!
  const resolvedParams = use(params);
  const userIdArray = resolvedParams?.userId;
  const activeChatUserId = userIdArray && userIdArray[0] ? userIdArray[0] : null;

  const { user, profile, showToast } = useApp();
  const router = useRouter();

  const [chatRooms, setChatRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [inputText, setInputText] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef(null);

  // Auto-scroll messages to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch active conversations (people we have chatted with)
  const fetchChatRooms = async () => {
    try {
      // Fetch all profiles to list potential partners
      const { data: allProfiles, error: profileErr } = await supabase
        .from('profiles')
        .select('*');

      if (profileErr) throw profileErr;

      // Filter out self
      const otherMembers = (allProfiles || []).filter(p => p.id !== user.id);
      
      // Let's find last message for each member
      const { data: chatData, error: chatErr } = await supabase
        .from('chats')
        .select('*');
      
      if (chatErr) throw chatErr;

      const rooms = otherMembers.map(member => {
        // Find messages between user and member
        const pairChats = (chatData || []).filter(c => 
          (c.sender_id === user.id && c.receiver_id === member.id) ||
          (c.sender_id === member.id && c.receiver_id === user.id)
        ).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

        return {
          profile: member,
          lastMessage: pairChats[0]?.message || 'No messages yet.',
          lastTime: pairChats[0]?.created_at || null
        };
      });

      // Sort chat rooms: those with messages first, then alphabetically
      rooms.sort((a, b) => {
        if (a.lastTime && b.lastTime) return new Date(b.lastTime) - new Date(a.lastTime);
        if (a.lastTime) return -1;
        if (b.lastTime) return 1;
        return a.profile.full_name.localeCompare(b.profile.full_name);
      });

      setChatRooms(rooms);
    } catch (err) {
      console.error(err);
      showToast('Error loading inbox.', 'error');
    } finally {
      setLoadingRooms(false);
    }
  };

  // Filtered Chat Rooms based on search query
  const filteredChatRooms = chatRooms.filter(room =>
    room.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch active chat messages
  const fetchMessages = async (partnerId) => {
    setLoadingChat(true);
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`) // Fetches all messages involving user
        .then(res => {
          // Client-side filter to only include interactions with this specific partner
          const filtered = (res.data || []).filter(c => 
            (c.sender_id === user.id && c.receiver_id === partnerId) ||
            (c.sender_id === partnerId && c.receiver_id === user.id)
          );
          return { data: filtered, error: res.error };
        });

      if (error) throw error;
      setMessages(data || []);

      // Get partner profile details
      const { data: partData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', partnerId);
      
      if (partData && partData[0]) {
        setActivePartner(partData[0]);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading messages.', 'error');
    } finally {
      setLoadingChat(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchChatRooms();
    }
  }, [user]);

  useEffect(() => {
    if (user && activeChatUserId) {
      fetchMessages(activeChatUserId);
    } else {
      setActivePartner(null);
      setMessages([]);
    }
  }, [user, activeChatUserId]);

  // Realtime subscription setup
  useEffect(() => {
    if (!user || !activeChatUserId) return;

    // Listen to changes
    const channel = supabase.channel(`room_${activeChatUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chats'
      }, (payload) => {
        const msg = payload.new;
        // Verify message is relevant to this active chat
        if (
          (msg.sender_id === user.id && msg.receiver_id === activeChatUserId) ||
          (msg.sender_id === activeChatUserId && msg.receiver_id === user.id)
        ) {
          setMessages(prev => {
            // Avoid duplicates from optimistic update
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Refresh inbox list last message preview
          fetchChatRooms();
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, activeChatUserId]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChatUserId) return;

    const text = inputText.trim();
    setInputText('');

    // Optimistic update: show message immediately
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      receiver_id: activeChatUserId,
      message: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    setSending(true);
    try {
      const { data, error } = await supabase
        .from('chats')
        .insert({
          sender_id: user.id,
          receiver_id: activeChatUserId,
          message: text
        })
        .select()
        .single();

      if (error) {
        showToast(error.message, 'error');
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        setInputText(text);
      } else if (data) {
        // Replace optimistic message with real one
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data : m));
        fetchChatRooms();
      }
    } catch (err) {
      showToast('Error sending message: ' + err.message, 'error');
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container" style={{ margin: '1rem auto' }}>
      <div className="glass-panel chat-layout">
        
        {/* Left Side: Inbox Navigation List */}
        <aside className={`chat-sidebar ${activeChatUserId ? 'chat-sidebar-mobile-hide' : ''}`}>
          <div className="chat-sidebar-title">Conversations</div>
          
          <div style={{ padding: '0 0.75rem 0.75rem 0.75rem' }}>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '0.85rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                width: '100%'
              }}
            />
          </div>

          {loadingRooms ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
              <Loader size={20} className="spinner" style={{ color: 'var(--gold-accent)' }} />
            </div>
          ) : filteredChatRooms.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
              No conversations found.
            </p>
          ) : (
            filteredChatRooms.map((room) => {
              const active = activeChatUserId === room.profile.id;
              return (
                <div
                  key={room.profile.id}
                  className={`chat-room-item ${active ? 'active' : ''}`}
                  onClick={() => router.push(`/chat/${room.profile.id}`)}
                >
                  <Avatar
                    src={room.profile.avatar_url}
                    fullName={room.profile.full_name}
                    email={room.profile.email}
                    size={40}
                    className="chat-room-avatar"
                  />
                  <div className="chat-room-info">
                    <span className="chat-room-name">{room.profile.full_name}</span>
                    <span className="chat-room-last-msg">{room.lastMessage}</span>
                  </div>
                </div>
              );
            })
          )}
        </aside>

        {/* Right Side: Conversation Chat Window */}
        <section className="chat-window">
          {activeChatUserId && activePartner ? (
            <>
              {/* Header */}
              <div className="chat-window-header">
                 <Avatar
                   src={activePartner.avatar_url}
                   fullName={activePartner.full_name}
                   email={activePartner.email}
                   size={36}
                   style={{ border: '1px solid var(--gold-accent)' }}
                 />
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600' }}>{activePartner.full_name}</h4>
                  {activePartner.favorite_verse && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                      Favorite Verse: {activePartner.favorite_verse.split('-')[0]}
                    </p>
                  )}
                </div>
              </div>

              {/* Message History List */}
              <div className="chat-window-messages">
                {loadingChat ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                    <Loader size={24} className="spinner" style={{ color: 'var(--gold-accent)' }} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="empty-state" style={{ fontSize: '0.9rem' }}>
                    This is the start of your message thread with {activePartner.full_name}. Write an encouraging greeting!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const sentByMe = msg.sender_id === user.id;
                    const date = new Date(msg.created_at);
                    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <div
                        key={msg.id}
                        className={`message-bubble ${sentByMe ? 'sent' : 'received'}`}
                      >
                        <div>{msg.message}</div>
                        <span className="message-time">{formattedTime}</span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendMessage} className="chat-window-input-area">
                <input
                  type="text"
                  className="chat-input"
                  placeholder={`Write message to ${activePartner.full_name.split(' ')[0]}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={sending}
                  required
                />
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                  disabled={sending || !inputText.trim()}
                >
                  <Send size={16} />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', color: 'rgba(var(--gold-accent-rgb), 0.3)', marginBottom: '1rem' }}>
                <BookOpen size={48} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', marginBottom: '0.5rem' }}>Your Sanctuary Inbox</h3>
              <p style={{ maxWidth: '320px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Select a brother or sister from the directory side panel, or connect and chat with users from the connect feed.
              </p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
