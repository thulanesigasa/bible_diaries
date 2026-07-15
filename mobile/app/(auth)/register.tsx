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
  ActivityIndicator
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useApp } from '../_layout';
import { supabase } from '../../src/lib/supabase';
import { BookOpen, Check, Eye, EyeOff, Camera } from 'lucide-react-native';
import Avatar from '../../components/Avatar';
import * as ImagePicker from 'expo-image-picker';

export default function RegisterScreen() {
  const [step, setStep] = useState(1);
  
  // Field states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);

  const { showToast } = useApp();
  const router = useRouter();

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '#475569' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    let label = 'Weak';
    let color = '#EF4444';
    if (score >= 4) {
      label = 'Strong';
      color = '#10B981';
    } else if (score >= 3) {
      label = 'Moderate';
      color = '#F59E0B';
    }
    return { score, label, color };
  };

  const strength = getPasswordStrength(password);

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
        
        // 5MB limit check
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

  const handleNext = () => {
    if (step === 1) {
      if (!email || !password) {
        showToast('Please fill in email and password.', 'error');
        return;
      }
      if (password.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        return;
      }
      if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!firstName || !surname || !phoneNumber) {
        showToast('Please fill in your name, surname, and phone number.', 'error');
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleRegister = async () => {
    if (!address) {
      showToast('Physical address is required.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            surname: surname,
            full_name: `${firstName} ${surname}`,
            phone_number: phoneNumber,
            address: address,
            avatar_url: avatarUrl || null,
            bio: 'Walking in faith.',
            favorite_verse: '',
            spiritual_journey: ''
          }
        }
      });

      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Registration successful! Welcome to bible_diaries.');
      }
    } catch (err) {
      showToast('An error occurred during registration.', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <BookOpen size={24} color="#0EA5E9" style={{ marginRight: 8 }} />
              <Text style={styles.logoText}>bible_diaries</Text>
            </View>
            <Text style={styles.title}>Create Your Account</Text>
            <Text style={styles.subtitle}>Join our community to share and browse diaries</Text>
          </View>

          {/* Step Indicator */}
          <View style={styles.stepIndicatorRow}>
            {[1, 2, 3].map((num) => (
              <View key={num} style={num < 3 ? styles.stepWrapper : styles.stepWrapperLast}>
                <View style={[
                  styles.stepDot,
                  step === num && styles.stepDotActive,
                  step > num && styles.stepDotCompleted
                ]}>
                  {step > num ? (
                    <Check size={14} color="#FFFFFF" />
                  ) : (
                    <Text style={[
                      styles.stepDotText,
                      step === num && styles.stepDotTextActive
                    ]}>{num}</Text>
                  )}
                </View>
                {num < 3 && (
                  <View style={[
                    styles.stepLine,
                    step > num && styles.stepLineActive
                  ]} />
                )}
              </View>
            ))}
          </View>

          {/* Step 1: Account Credentials */}
          {step === 1 && (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. grace@example.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={{ position: 'relative', justifyContent: 'center' }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Min. 6 characters"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity 
                    style={styles.eyeBtnAbsolute}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color="#475569" />
                    ) : (
                      <Eye size={18} color="#475569" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {password ? (
                <View style={{ marginTop: 2, marginBottom: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>Password Strength:</Text>
                    <Text style={{ fontSize: 11, color: strength.color, fontWeight: '700' }}>{strength.label}</Text>
                  </View>
                  <View style={{ height: 4, width: '100%', backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{
                      height: '100%',
                      width: `${(strength.score / 5) * 100}%`,
                      backgroundColor: strength.color,
                      borderRadius: 2,
                    }} />
                  </View>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={{ position: 'relative', justifyContent: 'center' }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Repeat your password"
                    placeholderTextColor="#94A3B8"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity 
                    style={styles.eyeBtnAbsolute}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} color="#475569" />
                    ) : (
                      <Eye size={18} color="#475569" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.btnPrimary, { marginTop: 8 }]}
                onPress={handleNext}
              >
                <Text style={styles.btnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: Personal Details */}
          {step === 2 && (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Elijah"
                  placeholderTextColor="#94A3B8"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Surname</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Bennett"
                  placeholderTextColor="#94A3B8"
                  value={surname}
                  onChangeText={setSurname}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. +1 555-0199"
                  placeholderTextColor="#94A3B8"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity 
                  style={styles.btnSecondary}
                  onPress={handleBack}
                >
                  <Text style={styles.btnSecondaryText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.btnPrimary, { flex: 1 }]}
                  onPress={handleNext}
                >
                  <Text style={styles.btnText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 3: Profile Photo & Location Details */}
          {step === 3 && (
            <View style={styles.form}>
              {/* Profile Photo Upload area */}
              <View style={styles.avatarContainer}>
                <View style={{ position: 'relative' }}>
                  <Avatar 
                    src={avatarUrl} 
                    fullName={firstName || 'New'} 
                    size={80}
                  />
                  <TouchableOpacity 
                    style={styles.avatarCameraBtn}
                    onPress={handleImageUpload}
                  >
                    <Camera size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.avatarTitle}>Profile Photo</Text>
                  <Text style={styles.avatarSubtitle}>Upload a picture of yourself, or we will assign a default initials avatar.</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Physical Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 77 Scripture Lane, Glory Town"
                  placeholderTextColor="#94A3B8"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity 
                  style={styles.btnSecondary}
                  onPress={handleBack}
                  disabled={loading}
                >
                  <Text style={styles.btnSecondaryText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.btnPrimary, { flex: 1 }, loading && styles.btnDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.btnText}>Register</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Footer Link */}
          <View style={styles.footerLinkRow}>
            <Text style={styles.footerLinkText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0EA5E9',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepWrapperLast: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  stepDotCompleted: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  stepDotTextActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    height: 2,
    flex: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#0EA5E9',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#0F172A',
  },
  eyeBtnAbsolute: {
    position: 'absolute',
    right: 14,
    padding: 6,
    zIndex: 10,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.04)',
  },
  avatarCameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0EA5E9',
    borderRadius: 14,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  avatarSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  btnPrimary: {
    backgroundColor: '#0EA5E9',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  btnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerLinkText: {
    fontSize: 13,
    color: '#475569',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0EA5E9',
  },
});
