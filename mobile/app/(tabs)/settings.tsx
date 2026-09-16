import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../_layout';
import { 
  Camera, 
  Save, 
  LogOut, 
  Bookmark, 
  User, 
  Heart, 
  MessageSquare, 
  Shield, 
  BookOpen, 
  Bell,
  Lock,
  ChevronRight,
  Sliders
} from 'lucide-react-native';
import Avatar from '../../components/Avatar';
import PhoneInput, { COUNTRIES } from '../../components/PhoneInput';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export default function SettingsTabScreen() {
  const { user, profile, setProfile, showToast, accent, supabase } = useApp();
  const router = useRouter();

  // Helper to split stored phone into countryCode and local number
  const parsePhone = (raw: string) => {
    if (!raw) return { code: '+27', num: '' };
    for (const c of COUNTRIES) {
      if (raw.startsWith(c.code)) {
        return { code: c.code, num: raw.slice(c.code.length).replace(/^0+/, '') };
      }
    }
    return { code: '+27', num: raw.replace(/^0+/, '') };
  };

  const initialPhone = parsePhone(profile?.phone_number || '');

  // Personal fields
  const [firstName, setFirstName] = useState(profile?.first_name || profile?.full_name?.split(' ')[0] || '');
  const [surname, setSurname] = useState(profile?.surname || profile?.full_name?.split(' ').slice(1).join(' ') || '');
  const [countryCode, setCountryCode] = useState(initialPhone.code);
  const [phoneNumber, setPhoneNumber] = useState(initialPhone.num);
  const [address, setAddress] = useState(profile?.address || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

  // Spiritual fields
  const [bio, setBio] = useState(profile?.bio || '');
  const [favoriteVerse, setFavoriteVerse] = useState(profile?.favorite_verse || '');
  const [spiritualJourney, setSpiritualJourney] = useState(profile?.spiritual_journey || '');

  // Preferences Toggles
  const [isPrivateMode, setIsPrivateMode] = useState(profile?.privacy_mode === 'private');
  const [allowDms, setAllowDms] = useState(profile?.allow_dms !== false);
  const [emailLikes, setEmailLikes] = useState(profile?.email_likes !== false);

  const [saving, setSaving] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState<number>(0);

  // Derive switch track color from accent
  const trackOn = accent === '#EC4899' ? '#fbcfe8' : '#bae6fd';

  // Sync state when profile updates
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || profile.full_name?.split(' ')[0] || '');
      setSurname(profile.surname || profile.full_name?.split(' ').slice(1).join(' ') || '');
      const parsed = parsePhone(profile.phone_number || '');
      setCountryCode(parsed.code);
      setPhoneNumber(parsed.num);
      setAddress(profile.address || '');
      setAvatarUrl(profile.avatar_url || '');
      setBio(profile.bio || '');
      setFavoriteVerse(profile.favorite_verse || '');
      setSpiritualJourney(profile.spiritual_journey || '');
      setIsPrivateMode(profile.privacy_mode === 'private');
      setAllowDms(profile.allow_dms !== false);
      setEmailLikes(profile.email_likes !== false);
    }
  }, [profile]);

  // Fetch count of bookmarks
  useEffect(() => {
    if (!user) return;
    const fetchBookmarkCount = async () => {
      try {
        const { count, error } = await supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        if (!error && count !== null) {
          setBookmarkCount(count);
        }
      } catch (e) {
        // silent fallback
      }
    };
    fetchBookmarkCount();
  }, [user]);

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
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Compress and convert to WEBP
        const manipResult = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 600 } }],
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
          setProfile({ ...profile, avatar_url: newAvatarUrl });
          showToast('Profile photo updated successfully!');
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

    // Validation rule: Strip leading zero so DB duplicate zero is ignored
    const cleanPhone = phoneNumber.replace(/^0+/, '');
    const fullPhoneNumber = cleanPhone ? `${countryCode}${cleanPhone}` : '';

    setSaving(true);
    try {
      const updateData = {
        first_name: firstName.trim(),
        surname: surname.trim(),
        full_name: `${firstName.trim()} ${surname.trim()}`,
        phone_number: fullPhoneNumber,
        address: address.trim(),
        avatar_url: avatarUrl,
        bio: bio.trim(),
        favorite_verse: favoriteVerse.trim(),
        spiritual_journey: spiritualJourney.trim(),
        privacy_mode: isPrivateMode ? 'private' : 'public',
        allow_dms: allowDms,
        email_likes: emailLikes,
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

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Profile Header directly on page body */}
        <View style={styles.profileSection}>
            <TouchableOpacity 
              style={styles.avatarWrap} 
              onPress={handleImageUpload}
              activeOpacity={0.8}
            >
              <Avatar 
                src={avatarUrl} 
                fullName={`${firstName} ${surname}`} 
                email={user?.email} 
                size={80} 
              />
              <View style={[styles.cameraBadge, { backgroundColor: accent }]}>
                <Camera size={13} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.profileName}>{`${firstName} ${surname}`.trim() || 'Believer'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.changePhotoHint}>Tap photo to change avatar</Text>
          </View>

          <View style={styles.sectionDivider} />

          {/* 2. Personal Details */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <User size={18} color={accent} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Personal Details</Text>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First Name"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Surname</Text>
                <TextInput
                  style={styles.input}
                  value={surname}
                  onChangeText={setSurname}
                  placeholder="Surname"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Two-Part Phone Number with All 54 African Countries Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <PhoneInput
                countryCode={countryCode}
                phoneNumber={phoneNumber}
                onCountryCodeChange={setCountryCode}
                onPhoneNumberChange={setPhoneNumber}
                accent={accent}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Physical Address</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. 77 Scripture Lane, Glory Town"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.sectionDivider} />

          {/* 3. Spiritual Journey */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <BookOpen size={18} color={accent} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Spiritual Journey</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Biography</Text>
              <TextInput
                style={styles.input}
                value={bio}
                onChangeText={setBio}
                placeholder="e.g. Walking in faith and grace daily."
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Favorite Scripture Verse</Text>
              <TextInput
                style={styles.input}
                value={favoriteVerse}
                onChangeText={setFavoriteVerse}
                placeholder="e.g. Philippians 4:13"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Testimony & Journey</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={spiritualJourney}
                onChangeText={setSpiritualJourney}
                placeholder="Share how God has worked in your life..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.sectionDivider} />

          {/* 4. Preferences & Privacy */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Sliders size={18} color={accent} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Preferences & Privacy</Text>
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.toggleTitle}>Private Profile</Text>
                <Text style={styles.toggleSubtitle}>Only approved followers can view your reflections</Text>
              </View>
              <Switch
                value={isPrivateMode}
                onValueChange={setIsPrivateMode}
                trackColor={{ false: '#E2E8F0', true: trackOn }}
                thumbColor={isPrivateMode ? accent : '#F8FAFC'}
              />
            </View>

            <View style={styles.innerDivider} />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.toggleTitle}>Allow Direct Messages</Text>
                <Text style={styles.toggleSubtitle}>Allow other fellowship members to send direct messages</Text>
              </View>
              <Switch
                value={allowDms}
                onValueChange={setAllowDms}
                trackColor={{ false: '#E2E8F0', true: trackOn }}
                thumbColor={allowDms ? accent : '#F8FAFC'}
              />
            </View>

            <View style={styles.innerDivider} />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.toggleTitle}>Interaction Notifications</Text>
                <Text style={styles.toggleSubtitle}>Receive updates when members like or comment on your diaries</Text>
              </View>
              <Switch
                value={emailLikes}
                onValueChange={setEmailLikes}
                trackColor={{ false: '#E2E8F0', true: trackOn }}
                thumbColor={emailLikes ? accent : '#F8FAFC'}
              />
            </View>
          </View>

          <View style={styles.sectionDivider} />

          {/* 5. Saved Bookmarks Quick Row */}
          <TouchableOpacity 
            style={styles.bookmarksRow}
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.7}
          >
            <View style={styles.bookmarksLeft}>
              <View style={[styles.bookmarkIconWrap, { backgroundColor: `${accent}15` }]}>
                <Bookmark size={20} color={accent} />
              </View>
              <View>
                <Text style={styles.bookmarksTitle}>Saved Bookmarks</Text>
                <Text style={styles.bookmarksSubtitle}>{bookmarkCount} reflections saved</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.sectionDivider} />

          {/* 6. Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: accent }, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Save size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.signOutBtn}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <LogOut size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Clean flat background without card box
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 56,
  },
  profileSection: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13.5,
    color: '#64748B',
    marginBottom: 6,
  },
  changePhotoHint: {
    fontSize: 12,
    color: '#94A3B8',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 20,
  },
  innerDivider: {
    height: 1,
    backgroundColor: '#F8FAFC',
    marginVertical: 4,
  },
  sectionBlock: {
    paddingVertical: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: '#0F172A',
  },
  multilineInput: {
    height: 84,
    paddingTop: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  toggleTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 17,
  },
  bookmarksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  bookmarksLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookmarkIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  bookmarksTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  bookmarksSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
  },
  actionContainer: {
    gap: 12,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
});
