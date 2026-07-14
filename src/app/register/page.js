'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useApp } from '../AppWrapper';
import { Loader, Camera, ChevronRight, ChevronLeft, Check, Eye, EyeOff } from 'lucide-react';

export default function Register() {
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
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const { showToast } = useApp();
  const router = useRouter();

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '#374151' };
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

  // Avatar image upload handler (base64)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024 * 2) {
      showToast('Image size should be less than 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result);
      showToast('Profile image uploaded successfully.');
    };
    reader.readAsDataURL(file);
  };

  // Step Navigations & Valdation
  const nextStep = () => {
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
    } else if (step === 2) {
      if (!firstName || !surname || !phoneNumber) {
        showToast('Please fill in your name, surname, and phone number.', 'error');
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!address) {
      showToast('Please specify your address.', 'error');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            surname: surname,
            full_name: `${firstName} ${surname}`,
            phone_number: phoneNumber,
            address: address,
            avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', // placeholder
            bio: '',
            favorite_verse: '',
            spiritual_journey: ''
          }
        }
      });

      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Registration successful! Welcome to bible_diaries.');
        router.push('/feed');
      }
    } catch (err) {
      showToast('An error occurred during registration.', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)', padding: '2rem 1.5rem' }}>
      <div className="diary-card" style={{ width: '100%', maxWidth: '540px', padding: '2.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)' }}>
        
        {/* Header */}
        <div className="auth-header" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gold-accent)', marginBottom: '0.5rem', fontSize: '1.5rem', fontFamily: 'var(--font-serif)', fontWeight: 'bold' }}>
            bible_diaries
          </div>
          <h2 className="auth-title" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Create Your Account</h2>
          <p className="auth-subtitle">Join our community to share and browse diaries</p>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', padding: '0 0.5rem' }}>
          {[1, 2, 3].map((num) => (
            <div key={num} style={{ display: 'flex', alignItems: 'center', flex: num < 3 ? 1 : 'none' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: step === num ? 'var(--gold-accent)' : step > num ? 'rgba(212, 175, 55, 0.2)' : 'var(--bg-tertiary)',
                color: step === num ? 'var(--bg-primary)' : step > num ? 'var(--gold-accent)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                fontSize: '0.9rem',
                border: step === num ? 'none' : '1px solid var(--border-color)',
                transition: 'all 0.3s ease'
              }}>
                {step > num ? <Check size={16} /> : num}
              </div>
              
              {num < 3 && (
                <div style={{
                  height: '2px',
                  flex: 1,
                  backgroundColor: step > num ? 'var(--gold-accent)' : 'var(--bg-tertiary)',
                  margin: '0 0.75rem',
                  opacity: step > num ? 0.6 : 0.2,
                  transition: 'all 0.3s ease'
                }} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleRegister} className="auth-form" style={{ gap: '1.25rem' }}>
          
          {/* Step 1: Account Credentials */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="settings-group">
                <label className="settings-label" htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  placeholder="e.g. user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

               <div className="settings-group">
                <label className="settings-label" htmlFor="password">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: '2.75rem' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                      border: 'none',
                      background: 'none'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {password && (
                <div style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Password Strength:</span>
                    <span style={{ color: strength.color, fontWeight: '600' }}>{strength.label}</span>
                  </div>
                  <div style={{ height: '4px', width: '100%', backgroundColor: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(strength.score / 5) * 100}%`,
                      backgroundColor: strength.color,
                      borderRadius: '2px',
                      transition: 'all 0.3s ease'
                    }} />
                  </div>
                </div>
              )}

              <div className="settings-group">
                <label className="settings-label" htmlFor="confirmPassword">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ paddingRight: '2.75rem' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                      border: 'none',
                      background: 'none'
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="button" 
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', marginTop: '0.5rem' }}
                onClick={nextStep}
              >
                <span>Continue</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Step 2: Personal Details */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="settings-group">
                  <label className="settings-label" htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    placeholder="e.g. Elijah"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="settings-group">
                  <label className="settings-label" htmlFor="surname">Surname</label>
                  <input
                    type="text"
                    id="surname"
                    placeholder="e.g. Bennett"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="settings-group">
                <label className="settings-label" htmlFor="phoneNumber">Phone Number</label>
                <input
                  type="tel"
                  id="phoneNumber"
                  placeholder="e.g. +1 555-0199"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ flex: 1, justifyContent: 'center', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  onClick={prevStep}
                >
                  <ChevronLeft size={16} />
                  <span>Back</span>
                </button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={nextStep}
                >
                  <span>Continue</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Location & Profile Image */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="avatar-upload-area" style={{ marginBottom: '0.5rem' }}>
                <div style={{ position: 'relative' }}>
                  <img 
                    src={avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                    alt="Avatar preview" 
                    className="avatar-upload-preview"
                  />
                  <label 
                    htmlFor="avatar-upload" 
                    style={{ position: 'absolute', bottom: '0', right: '0', backgroundColor: '#D4AF37', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContext: 'center', cursor: 'pointer', border: '2px solid #0A0D14', justifyContent: 'center' }}
                    title="Upload Avatar Image"
                  >
                    <Camera size={12} style={{ color: '#0A0D14' }} />
                    <input 
                  type="file" 
                      id="avatar-upload" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '2px' }}>Profile Photo</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Upload a picture of yourself, or we will assign a default avatar.</p>
                </div>
              </div>

              <div className="settings-group">
                <label className="settings-label" htmlFor="address">Physical Address</label>
                <input
                  type="text"
                  id="address"
                  placeholder="e.g. 77 Scripture Lane, Glory Town"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ flex: 1, justifyContent: 'center', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  onClick={prevStep}
                  disabled={loading}
                >
                  <ChevronLeft size={16} />
                  <span>Back</span>
                </button>
                
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader className="spinner" size={16} />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <span>Register</span>
                  )}
                </button>
              </div>
            </div>
          )}

        </form>

        <p className="auth-link" style={{ marginTop: '1.5rem' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ fontWeight: '600' }}>
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
