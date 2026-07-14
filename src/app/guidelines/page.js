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
            1. Biblical Principles of Communication
          </h2>
          <p style={{ lineHeight: '1.7', marginBottom: '0.75rem' }}>
            bible_diaries is a space for spiritual fellowship, praying, and journaling. We encourage all members to structure their conversations around scriptural guidelines:
          </p>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', lineHeight: '1.7' }}>
            <li><strong>Ephesians 4:29:</strong> Do not let any unwholesome talk come out of your mouths, but only what is helpful for building others up according to their needs.</li>
            <li><strong>Colossians 4:6:</strong> Let your conversation be always full of grace, seasoned with salt, so that you may know how to answer everyone.</li>
            <li><strong>James 1:19:</strong> Everyone should be quick to listen, slow to speak, and slow to anger.</li>
          </ul>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            2. Fellowship Decorum & Sharing
          </h2>
          <p style={{ lineHeight: '1.7', marginBottom: '0.75rem' }}>
            To keep the platform focused and clean, please adhere to these core values:
          </p>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', lineHeight: '1.7' }}>
            <li><strong>Edifying Content:</strong> Keep diary posts centered on biblical reflections, personal walks of faith, prayer requests, or personal testimonies.</li>
            <li><strong>Avoid Division:</strong> bible_diaries hosts believers from diverse Christian backgrounds. Avoid aggressive theological arguments or denominational debates that create division rather than unity.</li>
            <li><strong>Encouraging Feedback:</strong> Leave uplifting, supportive comments on entries. Carrying each other's burdens in prayer is central to our community.</li>
          </ul>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            3. Prohibited Behaviors
          </h2>
          <p style={{ lineHeight: '1.7', marginBottom: '0.75rem' }}>
            The following actions will lead to immediate content deletion and potential account suspension:
          </p>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', lineHeight: '1.7' }}>
            <li><strong>Harassment & Bullying:</strong> Posting personal attacks, hateful content, or demeaning remarks.</li>
            <li><strong>Spam & Promotions:</strong> Utilizing public timelines or private chats to sell products, solicit funds, or post repetitive ads.</li>
            <li><strong>Inappropriate Media:</strong> Uploading profile avatars or header images that contain offensive, explicit, or non-spiritual designs.</li>
            <li><strong>Impersonation:</strong> Creating accounts pretending to be other members or pastors within the community.</li>
          </ul>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '600' }}>
            4. Moderation & Correction Workflow
          </h2>
          <p style={{ lineHeight: '1.7', marginBottom: '0.75rem' }}>
            To protect our sanctuary, we employ a progressive moderation workflow:
          </p>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', lineHeight: '1.7' }}>
            <li><strong>First Infraction:</strong> Friendly warning from a community moderator and removal of the offending comment or post.</li>
            <li><strong>Second Infraction:</strong> Temporary suspension of posting and private messaging privileges for 7 days.</li>
            <li><strong>Third Infraction:</strong> Permanent account ban and deletion of all profile databases.</li>
          </ul>
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
