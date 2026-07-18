import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Switch,
  FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../_layout';
import { Camera, Save, LogOut, Bookmark, ChevronRight, User, Settings as SettingsIcon, Heart, MessageSquare, ArrowLeft, HelpCircle, Shield, FileText, Lock, Trash2, Mail, Share2, Star, Globe, Database } from 'lucide-react-native';
import Avatar from '../../components/Avatar';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export default function SettingsTabScreen() {
  const { user, profile, setProfile, showToast, accent, supabase } = useApp();
  const router = useRouter();

  const [firstName, setFirstName] = useState(profile?.first_name || profile?.full_name?.split(' ')[0] || '');
  const [surname, setSurname] = useState(profile?.surname || profile?.full_name?.split(' ').slice(1).join(' ') || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [favoriteVerse, setFavoriteVerse] = useState(profile?.favorite_verse || '');
  const [spiritualJourney, setSpiritualJourney] = useState(profile?.spiritual_journey || '');

  // Preferences Toggles
  const [isPrivateMode, setIsPrivateMode] = useState(profile?.privacy_mode === 'private');
  const [allowDms, setAllowDms] = useState(profile?.allow_dms !== false);
  const [emailLikes, setEmailLikes] = useState(profile?.email_likes !== false);
  const [emailComments, setEmailComments] = useState(profile?.email_comments !== false);

  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<'menu' | 'personal' | 'preferences' | 'bookmarks'>('menu');
  const [bookmarkedPosts, setBookmarkedPosts] = useState<any[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  // Derive track colour from accent (softened tint)
  const trackOn = accent === '#EC4899' ? '#fbcfe8' : '#bae6fd';

  const fetchBookmarks = async () => {
    setLoadingBookmarks(true);
    try {
      // Fetch user's favorite records
      const { data: favData, error: favError } = await supabase
        .from('favorites')
        .select('post_id')
        .eq('user_id', user.id);

      if (favError) throw favError;

      if (!favData || favData.length === 0) {
        setBookmarkedPosts([]);
        setLoadingBookmarks(false);
        return;
      }

      const postIds = favData.map((f: any) => f.post_id);

      // Fetch the actual diaries
      const { data: postsData, error: postsError } = await supabase
        .from('diaries')
        .select('*, profiles!author_id(*), likes(*), comments(*), favorites(*)')
        .in('id', postIds)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setBookmarkedPosts(postsData || []);
    } catch (err: any) {
      showToast('Error loading bookmarks: ' + err.message, 'error');
    } finally {
      setLoadingBookmarks(false);
    }
  };

  React.useEffect(() => {
    if (activeView === 'bookmarks') {
      fetchBookmarks();
    }
  }, [activeView]);

  const handleImageUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permission to access photos is required.', 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1, // Get the highest quality first, we compress later
        base64: false, // Don't get base64 yet, we manipulate first
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        if (asset.fileSize && asset.fileSize > 1024 * 1024 * 15) {
          showToast('Image size should be less than 15MB', 'error');
          return;
        }

        // Compress and convert to WEBP
        const manipResult = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 800 } }], // Resize to max 800px width
          { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP, base64: true }
        );

        const newAvatarUrl = `data:image/webp;base64,${manipResult.base64}`;
        setAvatarUrl(newAvatarUrl);
        
        // Auto-save the new avatar
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: newAvatarUrl })
          .eq('id', user.id);
          
        if (error) {
          showToast('Failed to save photo: ' + error.message, 'error');
        } else {
          showToast('Profile photo compressed and updated successfully!');
        }
      }
    } catch (e: any) {
      showToast('Error picking image: ' + e.message, 'error');
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !surname.trim()) {
      showToast('First Name and Surname are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        first_name: firstName,
        surname: surname,
        full_name: `${firstName} ${surname}`,
        phone_number: phoneNumber,
        address: address,
        avatar_url: avatarUrl,
        bio,
        favorite_verse: favoriteVerse,
        spiritual_journey: spiritualJourney,
        privacy_mode: isPrivateMode ? 'private' : 'public',
        allow_dms: allowDms,
        email_likes: emailLikes,
        email_comments: emailComments
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        showToast(error.message, 'error');
      } else {
        setProfile({ ...profile, ...updateData });
        showToast('Settings saved successfully!');
      }
    } catch (err: any) {
      showToast('Failed to save settings: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Logged out successfully.');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const renderMenu = () => (
    <ScrollView contentContainerStyle={styles.menuContainer}>
      
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity style={{ position: 'relative', marginBottom: 12 }} onPress={handleImageUpload}>
          <Avatar 
            src={avatarUrl} 
            fullName={`${firstName} ${surname}`} 
            email={user?.email} 
            size={76} 
          />
          <View style={[styles.cameraBadge, { backgroundColor: accent, width: 24, height: 24, borderRadius: 12 }]}>
            <Camera size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName}>{`${firstName} ${surname}`}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
      </View>

      <Text style={styles.menuSectionTitle}>Account & Security</Text>
      <TouchableOpacity style={styles.menuItem} onPress={() => setActiveView('personal')}>
        <View style={styles.menuItemLeft}>
          <User size={22} color={accent} />
          <Text style={styles.menuItemText}>Personal Information</Text>
        </View>
        <ChevronRight size={20} color="#94A3B8" />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuItem} onPress={() => setActiveView('preferences')}>
        <View style={styles.menuItemLeft}>
          <SettingsIcon size={22} color={accent} />
          <Text style={styles.menuItemText}>Preferences</Text>
        </View>
        <ChevronRight size={20} color="#94A3B8" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => setActiveView('bookmarks')}>
        <View style={styles.menuItemLeft}>
          <Bookmark size={22} color={accent} />
          <Text style={styles.menuItemText}>Bookmarks</Text>
        </View>
        <ChevronRight size={20} color="#94A3B8" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => showToast('Coming soon!')}>
        <View style={styles.menuItemLeft}>
          <Lock size={22} color={accent} />
          <Text style={styles.menuItemText}>Security & Password</Text>
        </View>
        <ChevronRight size={20} color="#94A3B8" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => showToast('Coming soon!')}>
        <View style={styles.menuItemLeft}>
          <Database size={22} color={accent} />
          <Text style={styles.menuItemText}>Data & Storage</Text>
        </View>
        <ChevronRight size={20} color="#94A3B8" />
      </TouchableOpacity>

      <Text style={styles.menuSectionTitle}>Community & Support</Text>
      <TouchableOpacity style={styles.menuItem} onPress={() => showToast('Coming soon!')}>
        <View style={styles.menuItemLeft}>
          <Share2 size={22} color="#64748B" />
          <Text style={styles.menuItemText}>Invite Friends</Text>
        </View>
        <ChevronRight size={20} color="#94A3B8" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => showToast('Coming soon!')}>
        <View style={styles.menuItemLeft}>
          <Star size={22} color="#64748B" />
          <Text style={styles.menuItemText}>Rate the App</Text>
        </View>
        <ChevronRight size={20} color="#94A3B8" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => showToast('Coming soon!')}>
        <View style={styles.menuItemLeft}>
          <Mail size={22} color="#64748B" />
          <Text style={styles.menuItemText}>Contact Support</Text>
        </View>
        <ChevronRight size={20} color="#94A3B8" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => showToast('Coming soon!')}>
        <View style={styles.menuItemLeft}>
          <HelpCircle size={22} color="#64748B" />
          <Text style={styles.menuItemText}>FAQs & Help Center</Text>
        </View>
        <ChevronRight size={20} color="#94A3B8" />
      </TouchableOpacity>

      <Text style={styles.menuSectionTitle}>Legal</Text>
      <TouchableOpacity style={styles.menuItem} onPress={() => showToast('Coming soon!')}>
        <View style={styles.menuItemLeft}>
          <Shield size={22} color="#64748B" />
          <Text style={styles.menuItemText}>Privacy Policy</Text>
        </View>
        <ChevronRight size={20} color="#94A3B8" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => showToast('Coming soon!')}>
        <View style={styles.menuItemLeft}>
          <FileText size={22} color="#64748B" />
          <Text style={styles.menuItemText}>Terms of Service</Text>
        </View>
        <ChevronRight size={20} color="#94A3B8" />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.menuItem, { marginTop: 12, borderBottomWidth: 0, justifyContent: 'center', backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]} onPress={handleSignOut}>
        <View style={styles.menuItemLeft}>
          <LogOut size={22} color="#EF4444" />
          <Text style={[styles.menuItemText, { color: '#EF4444', marginLeft: 8 }]}>Sign Out</Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 16 }} onPress={() => showToast('Delete account requested')}>
        <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600' }}>Delete Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderBookmarkItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity 
        style={styles.postCard} 
        onPress={() => router.push((`/post/${item.id}`) as any)}
        activeOpacity={0.7}
      >
        <View style={styles.postHeader}>
          <View style={styles.authorRow}>
            <Avatar 
              src={item.profiles?.avatar_url} 
              fullName={item.profiles?.full_name} 
              size={34}
              style={{ marginRight: 10 }}
            />
            <View>
              <Text style={styles.authorName}>{item.profiles?.full_name}</Text>
              <Text style={styles.postTime}>
                {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: `${accent}15` }]}>
            <Text style={[styles.categoryText, { color: accent }]}>{item.category}</Text>
          </View>
        </View>

        {item.title ? <Text style={styles.postTitle}>{item.title}</Text> : null}
        {item.scripture ? (
          <View style={[styles.scriptureQuote, { borderLeftColor: accent, backgroundColor: `${accent}10` }]}>
            <Text style={styles.scriptureText}>{item.scripture}</Text>
          </View>
        ) : null}
        <Text style={styles.postContent} numberOfLines={3}>{item.content}</Text>

        <View style={styles.actionsBar}>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => handleToggleLike(item)}
          >
            <Heart size={18} color={item.likes?.some((l: any) => l.user_id === user?.id) ? accent : '#475569'} fill={item.likes?.some((l: any) => l.user_id === user?.id) ? accent : 'transparent'} />
            <Text style={[styles.actionText, item.likes?.some((l: any) => l.user_id === user?.id) && { color: accent }]}>
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
            <Bookmark size={18} color={accent} fill={accent} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const handleToggleFavorite = async (post: any) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);

      if (error) throw error;
      showToast('Removed from bookmarks.');
      
      // Update local state to remove it instantly
      setBookmarkedPosts(prev => prev.filter(p => p.id !== post.id));
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleToggleLike = async (post: any) => {
    const isLiked = post.likes?.some((l: any) => l.user_id === user.id) || false;
    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
        setBookmarkedPosts(prev => prev.map(p => 
          p.id === post.id 
            ? { ...p, likes: p.likes.filter((l: any) => l.user_id !== user.id) } 
            : p
        ));
      } else {
        await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
        setBookmarkedPosts(prev => prev.map(p => 
          p.id === post.id 
            ? { ...p, likes: [...(p.likes || []), { user_id: user.id }] } 
            : p
        ));
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {activeView === 'menu' ? (
        renderMenu()
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.subHeader}>
            <TouchableOpacity onPress={() => setActiveView('menu')} style={styles.backButton}>
              <ArrowLeft size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.subHeaderTitle}>
              {activeView === 'personal' ? 'Personal Information' : activeView === 'preferences' ? 'Preferences' : 'Bookmarks'}
            </Text>
          </View>

          {activeView === 'bookmarks' ? (
            loadingBookmarks ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={accent} />
              </View>
            ) : bookmarkedPosts.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={{ color: '#64748B' }}>No bookmarks yet.</Text>
              </View>
            ) : (
              <FlatList
                data={bookmarkedPosts}
                renderItem={renderBookmarkItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.scrollContainer}
              />
            )
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
              {activeView === 'personal' && (
                <View style={styles.section}>
                  {/* Avatar picker */}
                  <View style={styles.avatarContainer}>
                    <View style={{ position: 'relative' }}>
                      <Avatar src={avatarUrl} fullName={`${firstName} ${surname}`} email={user?.email} size={90} />
                      <TouchableOpacity style={[styles.cameraBadge, { backgroundColor: accent }]} onPress={handleImageUpload}>
                        <Camera size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.avatarLabel}>Profile Photo (Max 5MB)</Text>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>First Name</Text>
                    <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First Name" placeholderTextColor="#94A3B8" />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Surname</Text>
                    <TextInput style={styles.input} value={surname} onChangeText={setSurname} placeholder="Surname" placeholderTextColor="#94A3B8" />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} placeholder="Phone Number" placeholderTextColor="#94A3B8" keyboardType="phone-pad" />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Address</Text>
                    <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Address" placeholderTextColor="#94A3B8" />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Biography</Text>
                    <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} placeholder="Share a short bio..." placeholderTextColor="#94A3B8" multiline numberOfLines={3} />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Favorite Verse</Text>
                    <TextInput style={styles.input} value={favoriteVerse} onChangeText={setFavoriteVerse} placeholder="Favorite Scripture Verse" placeholderTextColor="#94A3B8" />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Testimony & Journey</Text>
                    <TextInput style={[styles.input, styles.textArea]} value={spiritualJourney} onChangeText={setSpiritualJourney} placeholder="Share your spiritual journey..." placeholderTextColor="#94A3B8" multiline numberOfLines={4} />
                  </View>
                </View>
              )}

              {activeView === 'preferences' && (
                <View style={styles.section}>
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleTitle}>Private & Anonymous Mode</Text>
                      <Text style={styles.toggleDesc}>Hide your details from other members in the fellowship directory.</Text>
                    </View>
                    <Switch value={isPrivateMode} onValueChange={setIsPrivateMode} trackColor={{ false: '#cbd5e1', true: trackOn }} thumbColor={isPrivateMode ? accent : '#94A3B8'} />
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleTitle}>Allow Direct Messaging</Text>
                      <Text style={styles.toggleDesc}>Permit other believers to send you private messages from the Connect tab.</Text>
                    </View>
                    <Switch value={allowDms} onValueChange={setAllowDms} trackColor={{ false: '#cbd5e1', true: trackOn }} thumbColor={allowDms ? accent : '#94A3B8'} />
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleTitle}>Likes Alerts Notifications</Text>
                      <Text style={styles.toggleDesc}>Receive email alerts when someone likes your reflections.</Text>
                    </View>
                    <Switch value={emailLikes} onValueChange={setEmailLikes} trackColor={{ false: '#cbd5e1', true: trackOn }} thumbColor={emailLikes ? accent : '#94A3B8'} />
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleTitle}>Comments Alerts Notifications</Text>
                      <Text style={styles.toggleDesc}>Receive email alerts when a member comments on your reflections.</Text>
                    </View>
                    <Switch value={emailComments} onValueChange={setEmailComments} trackColor={{ false: '#cbd5e1', true: trackOn }} thumbColor={emailComments ? accent : '#94A3B8'} />
                  </View>
                </View>
              )}

              {/* Buttons */}
              <View style={styles.btnArea}>
                <TouchableOpacity 
                  style={[styles.saveBtn, { backgroundColor: accent }, saving && styles.btnDisabled]} 
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Settings</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 110,
  },
  section: {
    gap: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  formGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    gap: 16,
    marginBottom: 12,
  },
  toggleInfo: {
    flex: 1,
    gap: 4,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  toggleDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  btnArea: {
    marginTop: 24,
    gap: 12,
  },
  saveBtn: {
    borderRadius: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  signOutBtn: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
  menuContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 10,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748B',
  },
  menuSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 10,
    paddingLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 14,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },
  backButton: {
    marginRight: 16,
  },
  subHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  scriptureQuote: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderRadius: 4,
  },
  scriptureText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#475569',
  },
  postContent: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.05)',
    paddingTop: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
});
