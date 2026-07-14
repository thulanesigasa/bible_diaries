'use client';

import Link from 'next/link';

export default function GuidelinesPage() {
  return (
    <div className="container" style={{ maxWidth: '800px', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontFamily: 'var(--font-serif)', marginBottom: '0.5rem' }}>
          Community Guidelines
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Last updated: July 14, 2026
        </p>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem', color: 'var(--text-secondary)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            1. Respect and Mutual Edification
          </h2>
          <p style={{ lineHeight: '1.7' }}>
            bible_diaries is a space for spiritual fellowship, praying, and journaling. All communications, comments, and private messages must remain edifying, respectful, and supportive. Harassment, condescension, or debate of an aggressive nature is not tolerated.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            2. Content Guidelines
          </h2>
          <p style={{ lineHeight: '1.7', marginBottom: '0.75rem' }}>
            To keep the platform focused and clean, please adhere to:
          </p>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', lineHeight: '1.7' }}>
            <li>Keep posts centered on biblical reflections, personal walks of faith, or prayer testimonies.</li>
            <li>Do not publish spam, commercial advertisements, or solicitations.</li>
            <li>Maintain clear, readable language so believers of all backgrounds can engage.</li>
          </ul>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            3. Grace and Support
          </h2>
          <p style={{ lineHeight: '1.7' }}>
            Be quick to listen, slow to speak, and slow to anger. Encourage members on their testimonies. Leave uplifting comments that help edify their walks. We are here to carry one another's burdens.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            4. Moderation & Reporting
          </h2>
          <p style={{ lineHeight: '1.7' }}>
            We moderate the public feed to ensure a clean spiritual environment. Content that violates our guidelines will be flagged and removed. Repeat offenders will face account termination.
          </p>
        </div>
      </section>

      <div style={{ marginTop: '3.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
        <Link href="/feed" className="btn-primary" style={{ padding: '10px 20px' }}>
          Back to Feed
        </Link>
        <Link href="/privacy" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', fontSize: '0.9rem' }}>
          Read Privacy Policy
        </Link>
      </div>
    </div>
  );
}
