import React, { useState, useRef } from 'react';
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
  Image
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useApp } from '../_layout';
import { supabase } from '../../src/lib/supabase';
import { BookOpen, Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const passwordRef = useRef<TextInput>(null);

  const { showToast } = useApp();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showToast(error.message, 'error');
      } else {
        const userGender = data.user?.user_metadata?.gender;
        const greeting = userGender === 'Male' 
          ? 'Welcome back, brother!' 
          : userGender === 'Female' 
            ? 'Welcome back, sister!' 
            : 'Welcome back, brother/sister!';
        showToast(greeting);
        router.replace('/(tabs)');
      }
    } catch (err) {
      showToast('An unexpected error occurred.', 'error');
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
        
        {/* Card Panel Container */}
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <Image 
                source={require('../../assets/images/icon.png')} 
                style={{ width: 20, height: 20, marginRight: 8, borderRadius: 4 }} 
                resizeMode="contain" 
              />
              <Text style={styles.logoText}>Bible Diaries</Text>
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Login to access your reflections & feed</Text>
          </View>

          {/* Form */}
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
                returnKeyType="next"
                returnKeyLabel="Next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={{ position: 'relative', justifyContent: 'center' }}>
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="go"
                  returnKeyLabel="Sign In"
                  onSubmitEditing={handleLogin}
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

            <TouchableOpacity 
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.btnText}>Checking records...</Text>
                </View>
              ) : (
                <Text style={styles.btnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Link */}
          <View style={styles.footerLinkRow}>
            <Text style={styles.footerLinkText}>New to the diary? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Create an Account</Text>
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
    marginBottom: 24,
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
