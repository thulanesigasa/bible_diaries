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
  Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../_layout';
import { Camera, Save, LogOut } from 'lucide-react-native';
import Avatar from '../../components/Avatar';
import * as ImagePicker from 'expo-image-picker';

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
  const [activeTab, setActiveTab] = useState<'personal' | 'preferences'>('personal');

  // Derive track colour from accent (softened tint)
  const trackOn = accent === '#EC4899' ? '#fbcfe8' : '#bae6fd';

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
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        if (asset.fileSize && asset.fileSize > 1024 * 1024 * 5) {
          showToast('Image size should be less than 5MB', 'error');
          return;
        }

        if (asset.base64) {
          const mimeType = asset.mimeType || 'image/jpeg';
          const base64Data = `data:${mimeType};base64,${asset.base64}`;
          setAvatarUrl(base64Data);
          showToast('Profile photo updated.');
        } else {
          setAvatarUrl(asset.uri);
          showToast('Profile photo selected.');
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

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'personal' && { borderBottomColor: accent }]}
          onPress={() => setActiveTab('personal')}
        >
          <Text style={[styles.tabText, activeTab === 'personal' && { color: accent }]}>Personal</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'preferences' && { borderBottomColor: accent }]}
          onPress={() => setActiveTab('preferences')}
        >
          <Text style={[styles.tabText, activeTab === 'preferences' && { color: accent }]}>Preferences</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {activeTab === 'personal' ? (
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
        ) : (
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

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <LogOut size={16} color="#EF4444" style={{ marginRight: 6 }} />
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
});
