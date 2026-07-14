import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if credentials are valid and user did not force simulation mode
const forceMock = typeof window !== 'undefined' && localStorage.getItem('bd_force_mock') === 'true';

const isConfigured = 
  !forceMock &&
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-supabase-project.supabase.co' && 
  supabaseAnonKey !== 'your-supabase-anon-key';

let supabaseInstance = null;

if (isConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Supabase client successfully initialized in Production Mode.');
  } catch (error) {
    console.error('Failed to initialize live Supabase client, falling back to Simulation Mode:', error);
  }
}

// Fallback Mock database system so the project runs immediately with zero setup
class MockSupabaseClient {
  constructor() {
    this.isMock = true;
    console.log('bible_diaries running in Simulation Mode (localStorage database).');
    
    // Initialize LocalStorage database tables if empty
    if (typeof window !== 'undefined') {
      const initTable = (key, defaultVal) => {
        if (!localStorage.getItem(`bd_${key}`)) {
          localStorage.setItem(`bd_${key}`, JSON.stringify(defaultVal));
        }
      };

      // Mock profiles
      initTable('profiles', [
        {
          id: 'mock-user-elijah',
          email: 'elijah.bennett@gmail.com',
          full_name: 'Elijah Bennett',
          first_name: 'Elijah',
          surname: 'Bennett',
          address: '77 Scripture Lane, Heaven Sent',
          phone_number: '+15550199',
          avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          bio: 'Seeking grace daily. Teacher of scripture and explorer of spiritual journaling.',
          favorite_verse: 'Proverbs 3:5-6 - Trust in the Lord with all your heart...',
          spiritual_journey: 'I started writing down reflections 5 years ago, and it changed how I pray. Bible Diaries is a dream come true.'
        },
        {
          id: 'mock-user-grace',
          email: 'grace.taylor@gmail.com',
          full_name: 'Grace Taylor',
          first_name: 'Grace',
          surname: 'Taylor',
          address: '44 Worship Blvd, Glory Town',
          phone_number: '+15550244',
          avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          bio: 'Worship leader, writer, and tea lover. Spreading Hope.',
          favorite_verse: 'Romans 15:13 - May the God of hope fill you with all joy and peace...',
          spiritual_journey: 'My journey began in the choir. Reflections are my way of documenting God\'s faithfulness through the ups and downs.'
        }
      ]);

      // Mock diaries/posts
      initTable('diaries', [
        {
          id: 'post-1',
          author_id: 'mock-user-elijah',
          content: 'Remember that God\'s timing is always perfect. Even when the road ahead looks uncertain, He has already cleared the path. Lean on Him today.',
          category: 'Faith',
          created_at: new Date(Date.now() - 3600000 * 4).toISOString() // 4 hours ago
        },
        {
          id: 'post-2',
          author_id: 'mock-user-grace',
          content: 'Reflecting on the beauty of grace this morning. It isn\'t something we earn; it is a free gift. Let\'s extend that same grace to those we meet today.',
          category: 'Love',
          created_at: new Date(Date.now() - 3600000 * 20).toISOString() // 20 hours ago
        }
      ]);

      initTable('likes', [
        { post_id: 'post-1', user_id: 'mock-user-grace' }
      ]);

      initTable('comments', [
        {
          id: 'comment-1',
          post_id: 'post-1',
          author_id: 'mock-user-grace',
          content: 'This was exactly what I needed to read this morning. Thank you, Elijah!',
          created_at: new Date(Date.now() - 3600000 * 2).toISOString()
        }
      ]);

      initTable('favorites', []);
      
      initTable('chats', [
        {
          id: 'chat-m1',
          sender_id: 'mock-user-elijah',
          receiver_id: 'mock-user-grace',
          message: 'Hi Grace, I loved your worship leading last Sunday!',
          created_at: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          id: 'chat-m2',
          sender_id: 'mock-user-grace',
          receiver_id: 'mock-user-elijah',
          message: 'Thank you so much Elijah! Truly appreciate the encouragement.',
          created_at: new Date(Date.now() - 3600000 * 23).toISOString()
        }
      ]);

      // Mock session
      if (!localStorage.getItem('bd_session')) {
        // Log in default user by default or keep null
        localStorage.setItem('bd_session', JSON.stringify(null));
      }
    }
  }

  // Auth helper simulation
  get auth() {
    return {
      signUp: async ({ email, password, options }) => {
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network latency
        const profiles = JSON.parse(localStorage.getItem('bd_profiles') || '[]');
        
        // Find if user already exists
        const userExists = profiles.some(p => p.email === email);
        if (userExists) {
          return { data: { user: null }, error: { message: 'User already exists' } };
        }

        const newId = 'user-' + Math.random().toString(36).substr(2, 9);
        const metadata = options?.data || {};
        
        const newProfile = {
          id: newId,
          email,
          first_name: metadata.first_name || '',
          surname: metadata.surname || '',
          address: metadata.address || '',
          phone_number: metadata.phone_number || '',
          full_name: metadata.first_name ? `${metadata.first_name} ${metadata.surname}` : 'Anonymous Member',
          avatar_url: metadata.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', // placeholder
          bio: '',
          favorite_verse: '',
          spiritual_journey: '',
          updated_at: new Date().toISOString()
        };

        profiles.push(newProfile);
        localStorage.setItem('bd_profiles', JSON.stringify(profiles));

        const user = { id: newId, email, user_metadata: metadata };
        localStorage.setItem('bd_session', JSON.stringify({ user }));

        // Trigger onAuthStateChange callbacks if any
        if (this._authCallback) {
          this._authCallback('SIGNED_IN', { user });
        }

        return { data: { user }, error: null };
      },

      signInWithPassword: async ({ email, password }) => {
        await new Promise(resolve => setTimeout(resolve, 600));
        const profiles = JSON.parse(localStorage.getItem('bd_profiles') || '[]');
        
        // We match by email or fallback to finding by name if they typed that in
        const userProfile = profiles.find(p => p.email === email || p.full_name.toLowerCase() === email.toLowerCase());
        
        if (!userProfile) {
          // If no profile exists, let's create a dynamic profile for them so they can log in anyway!
          const newId = 'user-' + Math.random().toString(36).substr(2, 9);
          const newProfile = {
            id: newId,
            email,
            full_name: email.split('@')[0],
            avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            bio: 'Walking in faith.',
            favorite_verse: 'Philippians 4:13 - I can do all things through Christ...',
            spiritual_journey: 'Searching for truth.',
            updated_at: new Date().toISOString()
          };
          profiles.push(newProfile);
          localStorage.setItem('bd_profiles', JSON.stringify(profiles));
          
          const user = { id: newId, email, user_metadata: { full_name: newProfile.full_name } };
          localStorage.setItem('bd_session', JSON.stringify({ user }));
          
          if (this._authCallback) this._authCallback('SIGNED_IN', { user });
          return { data: { user }, error: null };
        }

        const user = { id: userProfile.id, email: userProfile.email || email, user_metadata: { ...userProfile } };
        localStorage.setItem('bd_session', JSON.stringify({ user }));
        
        if (this._authCallback) {
          this._authCallback('SIGNED_IN', { user });
        }

        return { data: { user }, error: null };
      },

      signOut: async () => {
        localStorage.setItem('bd_session', JSON.stringify(null));
        if (this._authCallback) {
          this._authCallback('SIGNED_OUT', null);
        }
        return { error: null };
      },

      getUser: async () => {
        if (typeof window === 'undefined') return { data: { user: null }, error: null };
        const session = JSON.parse(localStorage.getItem('bd_session') || 'null');
        return { data: { user: session?.user || null }, error: null };
      },

      onAuthStateChange: (callback) => {
        this._authCallback = callback;
        // Run immediately with current session
        if (typeof window !== 'undefined') {
          const session = JSON.parse(localStorage.getItem('bd_session') || 'null');
          callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
        }
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                this._authCallback = null;
              }
            }
          }
        };
      }
    };
  }

  // Database query simulation builder
  from(table) {
    const getItems = () => JSON.parse(localStorage.getItem(`bd_${table}`) || '[]');
    const setItems = (items) => localStorage.setItem(`bd_${table}`, JSON.stringify(items));
    
    return {
      select: (selectStr = '*') => {
        let items = getItems();

        // Perform mock joins
        if (table === 'diaries') {
          const profiles = JSON.parse(localStorage.getItem('bd_profiles') || '[]');
          const likes = JSON.parse(localStorage.getItem('bd_likes') || '[]');
          const comments = JSON.parse(localStorage.getItem('bd_comments') || '[]');
          
          items = items.map(post => {
            const author = profiles.find(p => p.id === post.author_id) || {
              id: post.author_id,
              full_name: 'Unknown Believer',
              avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
            };
            const postLikes = likes.filter(l => l.post_id === post.id);
            const postComments = comments.filter(c => c.post_id === post.id).map(c => ({
              ...c,
              profiles: profiles.find(p => p.id === c.author_id) || { full_name: 'Believer' }
            }));
            
            return {
              ...post,
              profiles: author,
              likes: postLikes,
              comments: postComments
            };
          });
        } else if (table === 'chats') {
          const profiles = JSON.parse(localStorage.getItem('bd_profiles') || '[]');
          items = items.map(chat => ({
            ...chat,
            sender: profiles.find(p => p.id === chat.sender_id),
            receiver: profiles.find(p => p.id === chat.receiver_id)
          }));
        }

        // Return a helper with filtering/sorting capabilities
        return {
          order: (col, { ascending = true } = {}) => {
            const sorted = [...items].sort((a, b) => {
              const valA = a[col];
              const valB = b[col];
              if (typeof valA === 'string') {
                return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
              }
              return ascending ? valA - valB : valB - valA;
            });
            
            return {
              then: (resolve) => resolve({ data: sorted, error: null }),
              catch: (reject) => reject({ data: null, error: 'Query failed' })
            };
          },
          or: (filterStr) => {
            // e.g. sender_id.eq.X,receiver_id.eq.Y
            // parse to match direct messages
            const match = filterStr.match(/eq\.([^,]+).*eq\.([^)]+)/);
            if (match) {
              const id1 = match[1];
              const id2 = match[2];
              const filtered = items.filter(c => 
                (c.sender_id === id1 && c.receiver_id === id2) || 
                (c.sender_id === id2 && c.receiver_id === id1)
              );
              return {
                order: (col, { ascending = true } = {}) => {
                  const sorted = [...filtered].sort((a, b) => new Date(a[col]) - new Date(b[col]));
                  return {
                    then: (resolve) => resolve({ data: sorted, error: null })
                  };
                },
                then: (resolve) => resolve({ data: filtered, error: null })
              };
            }
            return { then: (resolve) => resolve({ data: items, error: null }) };
          },
          eq: (col, val) => {
            const filtered = items.filter(i => i[col] === val);
            return {
              then: (resolve) => resolve({ data: filtered, error: null })
            };
          },
          then: (resolve) => resolve({ data: items, error: null })
        };
      },

      insert: async (dataArr) => {
        await new Promise(resolve => setTimeout(resolve, 200));
        const items = getItems();
        const records = (Array.isArray(dataArr) ? dataArr : [dataArr]).map(d => ({
          id: d.id || 'id-' + Math.random().toString(36).substr(2, 9),
          created_at: new Date().toISOString(),
          ...d
        }));
        
        items.push(...records);
        setItems(items);
        return { data: records, error: null };
      },

      delete: () => {
        return {
          eq: (col, val) => {
            return {
              eq: (col2, val2) => {
                const items = getItems();
                const filtered = items.filter(i => !(i[col] === val && i[col2] === val2));
                setItems(filtered);
                return { then: (resolve) => resolve({ data: null, error: null }) };
              },
              then: (resolve) => {
                const items = getItems();
                const filtered = items.filter(i => i[col] !== val);
                setItems(filtered);
                return resolve({ data: null, error: null });
              }
            };
          }
        };
      },

      update: async (updateObj) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
          eq: (col, val) => {
            const items = getItems();
            let updated = null;
            const nextItems = items.map(i => {
              if (i[col] === val) {
                updated = { ...i, ...updateObj, updated_at: new Date().toISOString() };
                return updated;
              }
              return i;
            });
            setItems(nextItems);
            
            // Also update profiles inside current auth session if needed
            if (table === 'profiles') {
              const session = JSON.parse(localStorage.getItem('bd_session') || 'null');
              if (session && session.user && session.user.id === val) {
                session.user.user_metadata = { ...session.user.user_metadata, ...updateObj };
                localStorage.setItem('bd_session', JSON.stringify(session));
              }
            }

            return {
              then: (resolve) => resolve({ data: updated ? [updated] : [], error: null })
            };
          }
        };
      }
    };
  }

  // Channel helper for realtime subscriptions
  channel(name) {
    return {
      on: function(event, filter, callback) {
        // Keep mock listeners for chat responses
        if (typeof window !== 'undefined') {
          window.addEventListener('bd_chat_message', (e) => {
            callback({ new: e.detail });
          });
        }
        return this;
      },
      subscribe: () => {
        console.log(`Subscribed to simulated realtime channel: ${name}`);
        return {
          unsubscribe: () => {
            console.log(`Unsubscribed from simulated realtime channel: ${name}`);
          }
        };
      }
    };
  }
}

export const supabase = supabaseInstance || new MockSupabaseClient();
export const isSupabaseConfigured = isConfigured;
export default supabase;
