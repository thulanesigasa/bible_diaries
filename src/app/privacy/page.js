'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="container" style={{ maxWidth: '800px', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontFamily: 'var(--font-serif)', marginBottom: '0.5rem' }}>
          Privacy Policy
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Last updated: July 14, 2026
        </p>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem', color: 'var(--text-secondary)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            1. Overview & Commitment
          </h2>
          <p style={{ lineHeight: '1.7' }}>
            At bible_diaries, we respect your personal reflections and data. Your spiritual diaries, prayers, and meditations are deeply personal. We are committed to securing your data and ensuring your fellowship remains safe and private.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            2. Information We Collect
          </h2>
          <p style={{ lineHeight: '1.7', marginBottom: '0.75rem' }}>
            We only collect information necessary to deliver our fellowship services:
          </p>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', lineHeight: '1.7' }}>
            <li><strong>Account Details:</strong> Email addresses and login credentials managed securely via Supabase Authentication.</li>
            <li><strong>Profile Information:</strong> Display name, physical address, phone numbers, bio statement, favorite verses, and testimonies that you choose to provide in Profile Settings.</li>
            <li><strong>Journals & Comments:</strong> Reflections and commentary that you explicitly publish to the public feed or filter sections.</li>
          </ul>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            3. Visibility Controls & Data Sharing
          </h2>
          <p style={{ lineHeight: '1.7' }}>
            Public diaries, comments, and connection profiles are visible to all authenticated members of our community. Private chat messages exchanged between users are encrypted in transit and stored securely, visible only to the conversation participants. We do not sell or monetize your reflections or personal information.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            4. Access & Deletion Rights
          </h2>
          <p style={{ lineHeight: '1.7' }}>
            You retain absolute ownership over your spiritual logs. You can edit or permanently delete your diary posts, profile photographs, and bio details at any time from your settings panel. If you wish to completely close your account, contact our support team.
          </p>
        </div>
      </section>

      <div style={{ marginTop: '3.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
        <Link href="/feed" className="btn-primary" style={{ padding: '10px 20px' }}>
          Back to Feed
        </Link>
        <Link href="/terms" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', fontSize: '0.9rem' }}>
          Read Terms of Service
        </Link>
      </div>
    </div>
  );
}
