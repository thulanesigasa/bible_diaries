'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useApp } from '../../AppWrapper';
import { Send, Loader, User, BookOpen } from 'lucide-react';

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
          setMessages(prev => [...prev, msg]);
          // Refresh inbox list last message preview
          fetchChatRooms();
        }
      })
      .subscribe();

    return () => {
      supabase.from('chats').delete; // dummy reference
      channel.unsubscribe();
    };
  }, [user, activeChatUserId]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChatUserId) return;

    setSending(true);
    const text = inputText.trim();
    setInputText('');

    try {
      const messageBody = {
        sender_id: user.id,
        receiver_id: activeChatUserId,
        message: text
      };

      const { data, error } = await supabase
        .from('chats')
        .insert(messageBody);

      if (error) {
        showToast(error.message, 'error');
      } else {
        // If we are in Simulation Mode, trigger custom window event to sync instantly
        if (supabase.isMock) {
          const mockMsg = {
            id: 'mock-msg-' + Math.random(),
            sender_id: user.id,
            receiver_id: activeChatUserId,
            message: text,
            created_at: new Date().toISOString()
          };
          
          setMessages(prev => [...prev, mockMsg]);
          window.dispatchEvent(new CustomEvent('bd_chat_message', { detail: mockMsg }));
          fetchChatRooms();

          // Trigger simulated AI spiritual response from mock user partners!
          if (activeChatUserId.startsWith('mock-user')) {
            triggerMockPartnerReply(activeChatUserId, text);
          }
        }
      }
    } catch (err) {
      showToast('Error sending message: ' + err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  // Automated typing spiritual responses from mock profiles (Elijah / Grace)
  const triggerMockPartnerReply = (partnerId, userMessage) => {
    setTimeout(async () => {
      let replyText = 'May God bless you and guide you today.';
      const lowerMsg = userMessage.toLowerCase();

      if (partnerId === 'mock-user-grace') {
        if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
          replyText = 'Hi there! What an encouraging day to connect. How can I support you or pray with you?';
        } else if (lowerMsg.includes('worship') || lowerMsg.includes('sing') || lowerMsg.includes('music')) {
          replyText = 'Worship is a portal to peace! Colossians 3:16 reminds us to sing with gratitude. What is your favorite worship song?';
        } else if (lowerMsg.includes('prayer') || lowerMsg.includes('pray')) {
          replyText = 'I would love to pray with you. Let\'s remember Philippians 4:6 - present your requests to God with thanksgiving.';
        } else {
          replyText = 'That is beautiful. I will keep your thoughts in my diaries today. Let us hold fast to hope!';
        }
      } else if (partnerId === 'mock-user-elijah') {
        if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
          replyText = 'Peace be with you. I am glad you reached out. How has God spoken to you through scripture recently?';
        } else if (lowerMsg.includes('verse') || lowerMsg.includes('bible') || lowerMsg.includes('read')) {
          replyText = 'I am studying Proverbs today. Chapter 3 says "Trust in the Lord with all your heart". It is so grounding.';
        } else if (lowerMsg.includes('struggle') || lowerMsg.includes('sad') || lowerMsg.includes('hard')) {
          replyText = 'I am sorry you are walking through deep waters. Rest in Deuteronomy 31:6 - He will never leave you nor forsake you.';
        } else {
          replyText = 'Thank you for sharing that with me. It is in sharing our walks that we find strength. Keep writing!';
        }
      }

      const incomingMsg = {
        id: 'mock-reply-' + Math.random(),
        sender_id: partnerId,
        receiver_id: user.id,
        message: replyText,
        created_at: new Date().toISOString()
      };

      // Push to localStorage
      const chats = JSON.parse(localStorage.getItem('bd_chats') || '[]');
      chats.push(incomingMsg);
      localStorage.setItem('bd_chats', JSON.stringify(chats));

      // Dispatch to components
      setMessages(prev => [...prev, incomingMsg]);
      window.dispatchEvent(new CustomEvent('bd_chat_message', { detail: incomingMsg }));
      fetchChatRooms();
    }, 1500); // 1.5s typing delay
  };

  return (
    <div className="container" style={{ margin: '1rem auto' }}>
      <div className="glass-panel chat-layout">
        
        {/* Left Side: Inbox Navigation List */}
        <aside className={`chat-sidebar ${activeChatUserId ? 'chat-sidebar-mobile-hide' : ''}`}>
          <div className="chat-sidebar-title">Conversations</div>
          {loadingRooms ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
              <Loader size={20} className="spinner" style={{ color: '#D4AF37' }} />
            </div>
          ) : chatRooms.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
              No chat partners available.
            </p>
          ) : (
            chatRooms.map((room) => {
              const active = activeChatUserId === room.profile.id;
              return (
                <div
                  key={room.profile.id}
                  className={`chat-room-item ${active ? 'active' : ''}`}
                  onClick={() => router.push(`/chat/${room.profile.id}`)}
                >
                  <img
                    src={room.profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt={room.profile.full_name}
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
                <img
                  src={activePartner.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                  alt={activePartner.full_name}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--gold-accent)' }}
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
                    <Loader size={24} className="spinner" style={{ color: '#D4AF37' }} />
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
              <div style={{ display: 'flex', justifyContent: 'center', color: 'rgba(212, 175, 55, 0.3)', marginBottom: '1rem' }}>
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
