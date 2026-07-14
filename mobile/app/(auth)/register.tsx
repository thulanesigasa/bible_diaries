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
import { BookOpen, Check } from 'lucide-react-native';

export default function RegisterScreen() {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { showToast } = useApp();
  const router = useRouter();

  const handleNext = () => {
    if (step === 1) {
      if (!firstName || !surname) {
        showToast('First Name and Surname are required.', 'error');
        return;
      }
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      showToast('Email and Password are required.', 'error');
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
            avatar_url: null,
            bio: 'Walking in faith.',
            favorite_verse: 'Philippians 4:13 - I can do all things through Christ...',
            spiritual_journey: 'Searching for truth.'
          }
        }
      });

      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Registration successful! Welcome, brother/sister.');
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
            {[1, 2].map((num) => (
              <View key={num} style={styles.stepWrapper}>
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
                {num < 2 && (
                  <View style={[
                    styles.stepLine,
                    step > num && styles.stepLineActive
                  ]} />
                )}
              </View>
            ))}
          </View>

          {/* Step 1 Inputs */}
          {step === 1 && (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  placeholderTextColor="#94A3B8"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Surname</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Surname"
                  placeholderTextColor="#94A3B8"
                  value={surname}
                  onChangeText={setSurname}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number (e.g. +1 555-0199)"
                  placeholderTextColor="#94A3B8"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Address"
                  placeholderTextColor="#94A3B8"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>

              <TouchableOpacity 
                style={styles.btnPrimary}
                onPress={handleNext}
              >
                <Text style={styles.btnText}>Next Step</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2 Inputs */}
          {step === 2 && (
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
                <TextInput
                  style={styles.input}
                  placeholder="Choose a secure password"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!loading}
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
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
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
    paddingHorizontal: 30,
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  btnPrimary: {
    backgroundColor: '#0EA5E9',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
