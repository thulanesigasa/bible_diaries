import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../_layout';
import { ArrowLeft, MessageSquare, BookOpen, MapPin, Award } from 'lucide-react-native';
import Avatar from '../../components/Avatar';

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { user, showToast, accent, supabase } = useApp();
  const router = useRouter();

  const fetchProfileDetails = async () => {
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
        setProfileData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  const isMe = user?.id === profileData?.id;

  return (
    <ScrollView style={styles.container}>

      {/* Main Card */}
      <View style={styles.profileCard}>
        <Avatar 
          src={profileData?.avatar_url} 
          fullName={profileData?.full_name} 
          size={90}
          style={{ marginBottom: 16, borderOpacity: 0.1 }}
          accent={accent}
        />
        <Text style={styles.fullName}>{profileData?.full_name || 'Believer'}</Text>
        <Text style={styles.bioText}>{profileData?.bio || 'Sharing the walk of faith.'}</Text>
        
        {profileData?.address ? (
          <View style={styles.addressRow}>
            <MapPin size={14} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.addressText}>{profileData.address}</Text>
          </View>
        ) : null}
      </View>

      {/* Scripture Block */}
      {profileData?.favorite_verse ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <BookOpen size={16} color={accent} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: accent }]}>Favorite Bible Scripture</Text>
          </View>
          <Text style={styles.verseText}>
            "{profileData.favorite_verse}"
          </Text>
        </View>
      ) : null}

      {/* Testimony / Journey Block */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Award size={16} color={accent} style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { color: accent }]}>Spiritual Journey & Testimony</Text>
        </View>
        <Text style={styles.testimonyText}>
          {profileData?.spiritual_journey || 'No testimony description provided yet.'}
        </Text>
      </View>

      {/* Actions */}
      {!isMe && (
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.messageBtn, { backgroundColor: accent }]}
            onPress={() => router.push((`/chat/${profileData?.id}`) as any)}
          >
            <MessageSquare size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.messageBtnText}>Send Private Message</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
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
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
    marginBottom: 16,
  },
  fullName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  bioText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 12,
    color: '#64748B',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0EA5E9',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verseText: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#334155',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  testimonyText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  actionContainer: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  messageBtn: {
    backgroundColor: '#0EA5E9',
    borderRadius: 10,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
