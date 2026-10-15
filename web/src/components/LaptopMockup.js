import Logo from './Logo';

export default function LaptopMockup({ id = 'laptop-preview-caption' }) {
  return <figure className="laptop-mockup" aria-labelledby={id}>
    <div className="laptop-stage">
      <span className="laptop-orbit" aria-hidden="true"/>
      <div className="laptop-lid">
        <span className="laptop-camera" aria-hidden="true"/>
        <div className="laptop-display" aria-hidden="true">
          <div className="desktop-browser"><span className="browser-dots"><i/><i/><i/></span><span className="browser-address">Bible Diaries · Web experience preview</span><span className="browser-plus">＋</span></div>
          <div className="desktop-topbar"><span className="desktop-brand"><Logo size={32}/>Bible <b>Diaries</b></span><span className="desktop-search">⌕ <span>Find a little encouragement</span></span><span className="desktop-account"><span className="desktop-notification">♧</span><span className="desktop-avatar">You</span></span></div>
          <div className="desktop-workspace">
            <div className="desktop-sidebar"><span className="desktop-label">YOUR DAILY WALK</span><div className="desktop-nav-item active"><span>⌂</span>Reflections</div><div className="desktop-nav-item"><span>▤</span>My diary</div><div className="desktop-nav-item"><span>♧</span>Fellowship</div><div className="desktop-nav-item"><span>⌑</span>Bookmarks</div><div className="desktop-divider"/><span className="desktop-label">EXPLORE A THEME</span>{['Hope', 'Faith', 'Love', 'Strength', 'Gratitude', 'Wisdom'].map((theme, index) => <div className="desktop-theme" key={theme}><span className={index === 2 ? 'pink-dot' : ''}/>{theme}</div>)}<div className="desktop-sidebar-note">A moment to pause.<br/>A little room to grow.</div></div>
            <div className="desktop-feed"><div className="desktop-greeting"><div><span className="desktop-label">A MOMENT IN THE WORD</span><p className="desktop-title">Grace for today.</p></div><span className="desktop-date">YOUR DAILY REFLECTION</span></div><div className="desktop-scripture"><div><span className="desktop-label">PSALM 46:10</span><p>Be still, and know that I am God.</p><span className="desktop-translation">King James Version</span></div><span className="desktop-quote">“</span></div><div className="desktop-compose"><span className="desktop-avatar">You</span><span>What is God teaching you today?</span><span className="desktop-compose-mark">＋</span></div><div className="desktop-feed-tabs"><span>For you</span><span>Following</span><span>Recent reflections</span></div><div className="desktop-post"><div className="desktop-post-person"><span className="desktop-avatar pink">S</span><div><b>A fellow believer</b><small>Shared reflection · Sample content</small></div><span className="desktop-post-tag">GRATITUDE</span></div><p className="desktop-post-title">Finding God in the ordinary</p><p className="desktop-post-copy">Today I am learning to notice the little things. A quiet morning. A kind word. Another chance to begin. Sometimes, the smallest moments remind us of the greatest grace.</p><div className="desktop-post-actions"><span>♡ Encourage</span><span>◯ Reflect</span><span>⌑ Save</span></div></div></div>
            <div className="desktop-aside"><div className="desktop-journal-note"><span className="desktop-label">ROOM FOR REFLECTION</span><span className="desktop-note-cross">✝</span><p>What are you<br/>grateful for<br/><em>today?</em></p><span className="desktop-note-line"/><small>Let the little things<br/>become a moment of praise.</small></div><div className="desktop-fellowship"><span className="desktop-label">A SHARED JOURNEY</span><div className="desktop-avatars"><span className="desktop-avatar">M</span><span className="desktop-avatar pink">S</span><span className="desktop-avatar lilac">J</span></div><p>Faith grows<br/>in fellowship.</p><span className="desktop-fellowship-link">Discover the community ↗</span></div></div>
          </div>
        </div>
      </div><div className="laptop-base" aria-hidden="true"><span/></div><div className="laptop-shadow" aria-hidden="true"/>
    </div>
    <figcaption id={id}><span className="device-caption-label">BIBLE DIARIES / THE WEB EXPERIENCE</span><span>Illustrative desktop preview: reflections, themes and fellowship. Sample content; final layout and availability may change.</span></figcaption>
  </figure>;
}
