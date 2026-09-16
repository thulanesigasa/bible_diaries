'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useApp } from '../AppWrapper';
import { Loader, Camera, ChevronRight, ChevronLeft, Check, Eye, EyeOff } from 'lucide-react';
import Avatar from '../../components/Avatar';

const AFRICAN_AND_GLOBAL_COUNTRIES = [
  // Southern Africa
  { name: 'South Africa', code: '+27', flag: '🇿🇦' },
  { name: 'Botswana', code: '+267', flag: '🇧🇼' },
  { name: 'Eswatini', code: '+268', flag: '🇸🇿' },
  { name: 'Lesotho', code: '+266', flag: '🇱🇸' },
  { name: 'Namibia', code: '+264', flag: '🇳🇦' },
  { name: 'Zimbabwe', code: '+263', flag: '🇿🇼' },
  { name: 'Zambia', code: '+260', flag: '🇿🇲' },
  { name: 'Malawi', code: '+265', flag: '🇲🇼' },
  { name: 'Mozambique', code: '+258', flag: '🇲🇿' },
  { name: 'Angola', code: '+244', flag: '🇦🇴' },

  // East Africa
  { name: 'Kenya', code: '+254', flag: '🇰🇪' },
  { name: 'Tanzania', code: '+255', flag: '🇹🇿' },
  { name: 'Uganda', code: '+256', flag: '🇺🇬' },
  { name: 'Rwanda', code: '+250', flag: '🇷🇼' },
  { name: 'Burundi', code: '+257', flag: '🇧🇮' },
  { name: 'Ethiopia', code: '+251', flag: '🇪🇹' },
  { name: 'Eritrea', code: '+291', flag: '🇪🇷' },
  { name: 'Djibouti', code: '+253', flag: '🇩🇯' },
  { name: 'Somalia', code: '+252', flag: '🇸🇴' },
  { name: 'South Sudan', code: '+211', flag: '🇸🇸' },
  { name: 'Sudan', code: '+249', flag: '🇸🇩' },
  { name: 'Madagascar', code: '+261', flag: '🇲🇬' },
  { name: 'Mauritius', code: '+230', flag: '🇲🇺' },
  { name: 'Seychelles', code: '+248', flag: '🇸🇨' },
  { name: 'Comoros', code: '+269', flag: '🇰🇲' },

  // West Africa
  { name: 'Nigeria', code: '+234', flag: '🇳🇬' },
  { name: 'Ghana', code: '+233', flag: '🇬🇭' },
  { name: 'Senegal', code: '+221', flag: '🇸🇳' },
  { name: 'Côte d\'Ivoire', code: '+225', flag: '🇨🇮' },
  { name: 'Cameroon', code: '+237', flag: '🇨🇲' },
  { name: 'Benin', code: '+229', flag: '🇧🇯' },
  { name: 'Burkina Faso', code: '+226', flag: '🇧🇫' },
  { name: 'Cabo Verde', code: '+238', flag: '🇨🇻' },
  { name: 'Gambia', code: '+220', flag: '🇬🇲' },
  { name: 'Guinea', code: '+224', flag: '🇬🇳' },
  { name: 'Guinea-Bissau', code: '+245', flag: '🇬🇼' },
  { name: 'Liberia', code: '+231', flag: '🇱🇷' },
  { name: 'Mali', code: '+223', flag: '🇲🇱' },
  { name: 'Mauritania', code: '+222', flag: '🇲🇷' },
  { name: 'Niger', code: '+227', flag: '🇳🇪' },
  { name: 'Sierra Leone', code: '+232', flag: '🇸🇱' },
  { name: 'Togo', code: '+228', flag: '🇹🇬' },

  // Central Africa
  { name: 'Central African Republic', code: '+236', flag: '🇨🇫' },
  { name: 'Chad', code: '+235', flag: '🇹🇩' },
  { name: 'Congo - Brazzaville', code: '+242', flag: '🇨🇬' },
  { name: 'Congo - Kinshasa (DRC)', code: '+243', flag: '🇨🇩' },
  { name: 'Equatorial Guinea', code: '+240', flag: '🇬🇶' },
  { name: 'Gabon', code: '+241', flag: '🇬🇦' },
  { name: 'São Tomé & Príncipe', code: '+239', flag: '🇸🇹' },

  // North Africa
  { name: 'Algeria', code: '+213', flag: '🇩🇿' },
  { name: 'Egypt', code: '+20', flag: '🇪🇬' },
  { name: 'Libya', code: '+218', flag: '🇱🇾' },
  { name: 'Morocco', code: '+212', flag: '🇲🇦' },
  { name: 'Tunisia', code: '+216', flag: '🇹🇳' },

  // Global Diaspora & International
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'New Zealand', code: '+64', flag: '🇳🇿' },
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
  { name: 'Netherlands', code: '+31', flag: '🇳🇱' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷' },
  { name: 'Jamaica', code: '+1876', flag: '🇯🇲' },
];

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
  const [countryCode, setCountryCode] = useState('+27');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('Male');
  
  const [address, setAddress] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const { showToast } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (gender === 'Female') {
        document.body.classList.add('theme-female');
      } else {
        document.body.classList.remove('theme-female');
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        document.body.classList.remove('theme-female');
      }
    };
  }, [gender]);

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

    if (file.size > 1024 * 1024 * 5) {
      showToast('Image size should be less than 5MB', 'error');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP).', 'error');
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
      if (!firstName || !surname || !phoneNumber || !gender) {
        showToast('Please fill in your name, surname, phone number, and gender.', 'error');
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

    const cleanPhone = phoneNumber.replace(/^0+/, '');
    const fullPhoneNumber = cleanPhone ? `${countryCode}${cleanPhone}` : '';

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            surname: surname,
            full_name: `${firstName} ${surname}`,
            phone_number: fullPhoneNumber,
            address: address,
            avatar_url: avatarUrl || null,
            gender: gender,
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
    <div className="auth-split-container">
      {/* Left Panel: Canvas Graphic */}
      <div className="auth-split-canvas">
        <div style={{ maxWidth: '420px', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', color: 'var(--gold-accent)', marginBottom: '2rem', fontSize: '2.25rem', fontFamily: 'var(--font-serif)', fontWeight: 'bold' }}>
            <img src="/logo.png" alt="Bible Diaries" style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'contain' }} />
            <span>bible_diaries</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', lineHeight: '1.2', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            Document Your Spiritual Walk
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>
            Join a sanctuary of believers sharing daily reflections, testimony logs, and encouraging fellowship in private chat spaces.
          </p>
          
          <div style={{ padding: '1.5rem', backgroundColor: 'rgba(14, 165, 233, 0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(14, 165, 233, 0.1)' }}>
            <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '8px', lineHeight: '1.6' }}>
              "Thy word is a lamp unto my feet, and a light unto my path."
            </p>
            <span style={{ fontSize: '0.8rem', color: 'var(--gold-accent)', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Psalm 119:105
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel: Form Section */}
      <div className="auth-split-form-container">
        <div style={{ width: '100%' }}>
          {/* Header */}
          <div className="auth-header" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'none', alignItems: 'center', gap: '0.6rem', color: 'var(--gold-accent)', marginBottom: '0.5rem', fontSize: '1.5rem', fontFamily: 'var(--font-serif)', fontWeight: 'bold' }} className="mobile-only-logo">
              <img src="/logo.png" alt="Bible Diaries" style={{ width: '30px', height: '30px', borderRadius: '6px', objectFit: 'contain' }} />
              <span>bible_diaries</span>
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
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    id="countryCode"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    style={{
                      width: '140px',
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.92rem',
                      fontWeight: '600'
                    }}
                  >
                    {AFRICAN_AND_GLOBAL_COUNTRIES.map((c) => (
                      <option key={c.name} value={c.code}>
                        {c.flag} {c.code} ({c.name})
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    id="phoneNumber"
                    placeholder="71 234 5678"
                    value={phoneNumber}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
                      setPhoneNumber(clean);
                    }}
                    style={{ flex: 1 }}
                    required
                  />
                </div>
              </div>

              <div className="settings-group">
                <label className="settings-label" htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
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
                   <Avatar 
                     src={avatarUrl} 
                     fullName={`${firstName} ${surname}`.trim() || 'Believer'} 
                     size={70} 
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
    </div>
  );
}
