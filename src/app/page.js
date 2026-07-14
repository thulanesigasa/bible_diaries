'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from './AppWrapper';
import { Loader } from 'lucide-react';

export default function Home() {
  const { user, loading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/feed');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', backgroundColor: '#0A0D14' }}>
      <Loader className="spinner" style={{ color: '#D4AF37', width: '32px', height: '32px' }} />
      <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontFamily: 'serif' }}>Entering bible_diaries...</p>
    </div>
  );
}
