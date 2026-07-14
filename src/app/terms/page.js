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
            By creating an account or accessing the services at bible_diaries, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use the application. These terms constitute a legally binding agreement between you and T.S Industries.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            2. Account Responsibility & Eligibility
          </h2>
          <p style={{ lineHeight: '1.7', marginBottom: '0.75rem' }}>
            You must be at least 13 years of age to register an account. You are responsible for maintaining the confidentiality of your account password and logins. All activities that occur under your user identity are your sole responsibility.
          </p>
          <p style={{ lineHeight: '1.7' }}>
            You must provide truthful, current, and complete details on your connection profile. We reserve the right to suspend or terminate accounts that contain fraudulent profiles or details.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            3. Content Ownership & Rights
          </h2>
          <p style={{ lineHeight: '1.7', marginBottom: '0.75rem' }}>
            You retain copyright and full intellectual ownership over all reflections, testimonies, and diary entries you post. By posting content to public sections of the platform, you grant bible_diaries a non-exclusive, worldwide, royalty-free license to display, index, and host your entries for community reading.
          </p>
          <p style={{ lineHeight: '1.7' }}>
            You represent and warrant that you own or have the necessary rights to publish all content you share, and that it does not violate the rights of any third party.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            4. Acceptable Use and Platform Security
          </h2>
          <p style={{ lineHeight: '1.7', marginBottom: '0.75rem' }}>
            You agree not to misuse the platform. Misuse includes, but is not limited to:
          </p>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', lineHeight: '1.7' }}>
            <li>Using automated scripts, bots, or scrapers to extract community content or profiles.</li>
            <li>Uploading files containing viruses, malware, or malicious code.</li>
            <li>Attempting to bypass row-level security (RLS) filters or accessing other users' private database tables.</li>
            <li>Using the platform for any illegal activities or promotional spam.</li>
          </ul>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            5. Disclaimer of Warranties
          </h2>
          <p style={{ lineHeight: '1.7' }}>
            This application is provided "as is" and "as available" without any warranties of any kind, either express or implied. We do not guarantee that the service will be uninterrupted, secure, or free of errors, or that your journal reflections will be preserved indefinitely without database backups.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            6. Governing Law
          </h2>
          <p style={{ lineHeight: '1.7' }}>
            These terms are governed by and construed in accordance with the laws of the jurisdiction in which T.S Industries operates, without regard to conflict of law principles.
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
