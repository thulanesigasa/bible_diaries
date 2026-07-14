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
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from './_layout';
import { supabase } from '../src/lib/supabase';
import { ArrowLeft, Camera, Save } from 'lucide-react-native';
import Avatar from '../components/Avatar';

export default function SettingsScreen() {
  const { user, profile, setProfile, showToast } = useApp();
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

  // Enforced 5MB local base64 simulator upload
  const handleSimulateAvatarUpload = () => {
    showToast('Staged default avatar photo.');
    // Simulated staged photo
    setAvatarUrl('https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150');
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
        router.back();
      }
    } catch (err: any) {
      showToast('Failed to save settings: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? (
            <ActivityIndicator size="small" color="#0EA5E9" />
          ) : (
            <Save size={20} color="#0EA5E9" />
          )}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'personal' && styles.tabActive]}
          onPress={() => setActiveTab('personal')}
        >
          <Text style={[styles.tabText, activeTab === 'personal' && styles.tabTextActive]}>Personal</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'preferences' && styles.tabActive]}
          onPress={() => setActiveTab('preferences')}
        >
          <Text style={[styles.tabText, activeTab === 'preferences' && styles.tabTextActive]}>Preferences</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {activeTab === 'personal' ? (
          <View style={styles.section}>
            {/* Avatar picker */}
            <View style={styles.avatarContainer}>
              <Avatar src={avatarUrl} fullName={`${firstName} ${surname}`} email={user?.email} size={90} />
              <TouchableOpacity style={styles.cameraBadge} onPress={handleSimulateAvatarUpload}>
                <Camera size={14} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.avatarLabel}>Profile Photo (Max 5MB)</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First Name"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Surname</Text>
              <TextInput
                style={styles.input}
                value={surname}
                onChangeText={setSurname}
                placeholder="Surname"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Phone Number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Address"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Biography</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Share a short bio..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Favorite Verse</Text>
              <TextInput
                style={styles.input}
                value={favoriteVerse}
                onChangeText={setFavoriteVerse}
                placeholder="Favorite Scripture Verse"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Testimony & Journey</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={spiritualJourney}
                onChangeText={setSpiritualJourney}
                placeholder="Share your spiritual journey..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            {/* Preferences Switches aligned to the Right */}
            
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>Private & Anonymous Mode</Text>
                <Text style={styles.toggleDesc}>Hide your contact details and testimony from other members in fellowship directory.</Text>
              </View>
              <Switch
                value={isPrivateMode}
                onValueChange={setIsPrivateMode}
                trackColor={{ false: '#cbd5e1', true: '#bae6fd' }}
                thumbColor={isPrivateMode ? '#0EA5E9' : '#94A3B8'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>Allow Direct Messaging</Text>
                <Text style={styles.toggleDesc}>Permit other believers to send you private messages from Connect tab.</Text>
              </View>
              <Switch
                value={allowDms}
                onValueChange={setAllowDms}
                trackColor={{ false: '#cbd5e1', true: '#bae6fd' }}
                thumbColor={allowDms ? '#0EA5E9' : '#94A3B8'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>Likes Alerts Notifications</Text>
                <Text style={styles.toggleDesc}>Receive transactional email alerts when someone appreciates or likes your diary reflections.</Text>
              </View>
              <Switch
                value={emailLikes}
                onValueChange={setEmailLikes}
                trackColor={{ false: '#cbd5e1', true: '#bae6fd' }}
                thumbColor={emailLikes ? '#0EA5E9' : '#94A3B8'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>Comments Alerts Notifications</Text>
                <Text style={styles.toggleDesc}>Receive immediate email alerts when a member comments under your reflections.</Text>
              </View>
              <Switch
                value={emailComments}
                onValueChange={setEmailComments}
                trackColor={{ false: '#cbd5e1', true: '#bae6fd' }}
                thumbColor={emailComments ? '#0EA5E9' : '#94A3B8'}
              />
            </View>

          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  saveBtn: {
    padding: 6,
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
  tabActive: {
    borderBottomColor: '#0EA5E9',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0EA5E9',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    gap: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 24,
    right: '38%',
    backgroundColor: '#0EA5E9',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
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
});
