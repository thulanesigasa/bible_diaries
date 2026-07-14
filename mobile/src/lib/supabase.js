import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Expo public environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const isConfigured = 
  supabaseUrl !== '' && 
  supabaseAnonKey !== '' && 
  supabaseUrl !== 'https://your-supabase-project.supabase.co';

let supabaseInstance = null;

if (isConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    console.log('Mobile Supabase client initialized in Production Mode.');
  } catch (error) {
    console.error('Failed to initialize live mobile Supabase client, falling back to Simulation Mode:', error);
  }
}

// Fallback Mock database system for mobile AsyncStorage simulation
class MockSupabaseClient {
  constructor() {
    this.isMock = true;
    console.log('mobile_diaries running in Simulation Mode (AsyncStorage database).');
    this._initializeDatabase();
  }

  async _initializeDatabase() {
    try {
      const initTable = async (key, defaultVal) => {
        const existing = await AsyncStorage.getItem(`bd_${key}`);
        if (!existing) {
          await AsyncStorage.setItem(`bd_${key}`, JSON.stringify(defaultVal));
        }
      };

      // Mock profiles
      await initTable('profiles', [
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
      await initTable('diaries', [
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

      await initTable('likes', [
        { post_id: 'post-1', user_id: 'mock-user-grace' }
      ]);

      await initTable('comments', [
        {
          id: 'comment-1',
          post_id: 'post-1',
          author_id: 'mock-user-grace',
          content: 'This was exactly what I needed to read this morning. Thank you, Elijah!',
          created_at: new Date(Date.now() - 3600000 * 2).toISOString()
        }
      ]);

      await initTable('favorites', []);
      
      await initTable('chats', [
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

      const session = await AsyncStorage.getItem('bd_session');
      if (!session) {
        await AsyncStorage.setItem('bd_session', JSON.stringify(null));
      }
    } catch (e) {
      console.error('AsyncStorage mock init error:', e);
    }
  }

  // Auth helper simulation
  get auth() {
    return {
      signUp: async ({ email, password, options }) => {
        await new Promise(resolve => setTimeout(resolve, 800));
        const profilesRaw = await AsyncStorage.getItem('bd_profiles');
        const profiles = JSON.parse(profilesRaw || '[]');
        
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
          avatar_url: metadata.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          bio: '',
          favorite_verse: '',
          spiritual_journey: '',
          updated_at: new Date().toISOString()
        };

        profiles.push(newProfile);
        await AsyncStorage.setItem('bd_profiles', JSON.stringify(profiles));

        const user = { id: newId, email, user_metadata: metadata };
        await AsyncStorage.setItem('bd_session', JSON.stringify({ user }));

        if (this._authCallback) {
          this._authCallback('SIGNED_IN', { user });
        }

        return { data: { user }, error: null };
      },

      signInWithPassword: async ({ email, password }) => {
        await new Promise(resolve => setTimeout(resolve, 600));
        const profilesRaw = await AsyncStorage.getItem('bd_profiles');
        const profiles = JSON.parse(profilesRaw || '[]');
        
        const userProfile = profiles.find(p => p.email === email || p.full_name.toLowerCase() === email.toLowerCase());
        
        if (!userProfile) {
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
          await AsyncStorage.setItem('bd_profiles', JSON.stringify(profiles));
          
          const user = { id: newId, email, user_metadata: { full_name: newProfile.full_name } };
          await AsyncStorage.setItem('bd_session', JSON.stringify({ user }));
          
          if (this._authCallback) this._authCallback('SIGNED_IN', { user });
          return { data: { user }, error: null };
        }

        const user = { id: userProfile.id, email: userProfile.email || email, user_metadata: { ...userProfile } };
        await AsyncStorage.setItem('bd_session', JSON.stringify({ user }));
        
        if (this._authCallback) {
          this._authCallback('SIGNED_IN', { user });
        }

        return { data: { user }, error: null };
      },

      signOut: async () => {
        await AsyncStorage.setItem('bd_session', JSON.stringify(null));
        if (this._authCallback) {
          this._authCallback('SIGNED_OUT', null);
        }
        return { error: null };
      },

      getUser: async () => {
        const sessionRaw = await AsyncStorage.getItem('bd_session');
        const session = JSON.parse(sessionRaw || 'null');
        return { data: { user: session?.user || null }, error: null };
      },

      onAuthStateChange: (callback) => {
        this._authCallback = callback;
        AsyncStorage.getItem('bd_session').then(sessionRaw => {
          const session = JSON.parse(sessionRaw || 'null');
          callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
        });
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

  from(table) {
    const getItems = async () => {
      const raw = await AsyncStorage.getItem(`bd_${table}`);
      return JSON.parse(raw || '[]');
    };
    const setItems = async (items) => {
      await AsyncStorage.setItem(`bd_${table}`, JSON.stringify(items));
    };
    
    return {
      select: (selectStr = '*') => {
        return {
          order: (col, { ascending = true } = {}) => {
            return {
              then: async (resolve) => {
                let items = await getItems();
                if (table === 'diaries') {
                  const profiles = JSON.parse(await AsyncStorage.getItem('bd_profiles') || '[]');
                  const likes = JSON.parse(await AsyncStorage.getItem('bd_likes') || '[]');
                  const comments = JSON.parse(await AsyncStorage.getItem('bd_comments') || '[]');
                  
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
                  const profiles = JSON.parse(await AsyncStorage.getItem('bd_profiles') || '[]');
                  items = items.map(chat => ({
                    ...chat,
                    sender: profiles.find(p => p.id === chat.sender_id),
                    receiver: profiles.find(p => p.id === chat.receiver_id)
                  }));
                }

                const sorted = [...items].sort((a, b) => {
                  const valA = a[col];
                  const valB = b[col];
                  if (typeof valA === 'string') {
                    return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
                  }
                  return ascending ? valA - valB : valB - valA;
                });
                resolve({ data: sorted, error: null });
              }
            };
          },
          or: (filterStr) => {
            return {
              then: async (resolve) => {
                const items = await getItems();
                const match = filterStr.match(/eq\.([^,]+).*eq\.([^)]+)/);
                if (match) {
                  const id1 = match[1];
                  const id2 = match[2];
                  const filtered = items.filter(c => 
                    (c.sender_id === id1 && c.receiver_id === id2) || 
                    (c.sender_id === id2 && c.receiver_id === id1)
                  );
                  resolve({ data: filtered, error: null });
                } else {
                  resolve({ data: items, error: null });
                }
              }
            };
          },
          eq: (col, val) => {
            return {
              then: async (resolve) => {
                const items = await getItems();
                const filtered = items.filter(i => i[col] === val);
                resolve({ data: filtered, error: null });
              }
            };
          },
          then: async (resolve) => {
            const items = await getItems();
            resolve({ data: items, error: null });
          }
        };
      },

      insert: async (dataArr) => {
        await new Promise(resolve => setTimeout(resolve, 200));
        const items = await getItems();
        const records = (Array.isArray(dataArr) ? dataArr : [dataArr]).map(d => ({
          id: d.id || 'id-' + Math.random().toString(36).substr(2, 9),
          created_at: new Date().toISOString(),
          ...d
        }));
        
        items.push(...records);
        await setItems(items);
        return { data: records, error: null };
      },

      delete: () => {
        return {
          eq: (col, val) => {
            return {
              eq: async (col2, val2) => {
                const items = await getItems();
                const filtered = items.filter(i => !(i[col] === val && i[col2] === val2));
                await setItems(filtered);
                return { data: null, error: null };
              },
              then: async (resolve) => {
                const items = await getItems();
                const filtered = items.filter(i => i[col] !== val);
                await setItems(filtered);
                resolve({ data: null, error: null });
              }
            };
          }
        };
      },

      update: async (updateObj) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
          eq: (col, val) => {
            return {
              then: async (resolve) => {
                const items = await getItems();
                let updated = null;
                const nextItems = items.map(i => {
                  if (i[col] === val) {
                    updated = { ...i, ...updateObj, updated_at: new Date().toISOString() };
                    return updated;
                  }
                  return i;
                });
                await setItems(nextItems);
                
                if (table === 'profiles') {
                  const sessionRaw = await AsyncStorage.getItem('bd_session');
                  const session = JSON.parse(sessionRaw || 'null');
                  if (session && session.user && session.user.id === val) {
                    session.user.user_metadata = { ...session.user.user_metadata, ...updateObj };
                    await AsyncStorage.setItem('bd_session', JSON.stringify(session));
                  }
                }

                resolve({ data: updated ? [updated] : [], error: null });
              }
            };
          }
        };
      }
    };
  }

  channel(name) {
    return {
      on: function(event, filter, callback) {
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
