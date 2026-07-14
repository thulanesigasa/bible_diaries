'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="container" style={{ maxWidth: '800px', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontFamily: 'var(--font-serif)', marginBottom: '0.5rem' }}>
          Terms of Service
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Last updated: July 14, 2026
        </p>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem', color: 'var(--text-secondary)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            1. Agreement of Use
          </h2>
          <p style={{ lineHeight: '1.7' }}>
            By creating an account or accessing the services at bible_diaries, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use the application.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            2. Account Responsibility
          </h2>
          <p style={{ lineHeight: '1.7' }}>
            You are responsible for maintaining the confidentiality of your account password and logins. All activities that occur under your user identity are your sole responsibility. You must provide truthful details on your profile.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            3. Content Ownership & Rights
          </h2>
          <p style={{ lineHeight: '1.7' }}>
            You retain copyright and full intellectual ownership over all reflections, testimonies, and diary entries you post. By posting content to public sections of the platform, you grant bible_diaries a non-exclusive license to display, index, and host your entries for community reading.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            4. Service Modifications
          </h2>
          <p style={{ lineHeight: '1.7' }}>
            We reserve the right to upgrade, alter, or temporarily suspend features of the website to improve security, fellowship interactions, or performance without prior notification.
          </p>
        </div>
      </section>

      <div style={{ marginTop: '3.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
        <Link href="/feed" className="btn-primary" style={{ padding: '10px 20px' }}>
          Back to Feed
        </Link>
        <Link href="/guidelines" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', fontSize: '0.9rem' }}>
          Read Community Guidelines
        </Link>
      </div>
    </div>
  );
}
