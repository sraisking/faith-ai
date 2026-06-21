"use client";

import Link from 'next/link';
import StarTrails from '@/components/StarTrails';
import AuthHeader from '@/components/AuthHeader';

export default function Home() {
  return (
    <main className="main-content" style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', minHeight: '100vh', height: 'auto', background: 'radial-gradient(circle at center, var(--bg-secondary) 0%, var(--bg-primary) 100%)' }}>

      {/* Background Star Trails */}
      <StarTrails />

      {/* Rotating Symbols Orbit behind the title */}
      <div className="symbols-orbit">
        {/* Shooting Star Trails */}
        <div className="trail-ring trail-ring-1"></div>
        <div className="trail-ring trail-ring-2"></div>
        <div className="trail-ring trail-ring-3"></div>

        <div className="orbit-icon-wrapper orbit-slot-1">
          <span style={{ fontSize: '36px', lineHeight: 1, fontFamily: 'system-ui' }}>ॐ</span>
        </div>
        <div className="orbit-icon-wrapper orbit-slot-2">
          <span style={{ fontSize: '40px', lineHeight: 1, fontFamily: 'system-ui', transform: 'translateY(-2px)' }}>✝</span>
        </div>
        <div className="orbit-icon-wrapper orbit-slot-3">
          <span style={{ fontSize: '28px', lineHeight: 1, fontFamily: 'system-ui' }}>﷽</span>
        </div>
      </div>

      {/* Header bar */}
      <header className="home-header glass-panel">
        <div className="home-logo">
          <span>Faith AI</span>
          <span style={{ fontSize: '1.2rem' }}>✦</span>
        </div>
        <nav className="home-nav">
          <Link href="/" className="home-nav-link hidden-mobile">Home</Link>
          <AuthHeader inline />
        </nav>
      </header>

      {/* Central Hero/Grid Content */}
      <div className="container" style={{ textAlign: 'center', zIndex: 10, position: 'relative', margin: 'auto 0', padding: '3rem 1rem' }}>
        <h1 className="gradient-text animate-fade-in home-title" style={{ fontSize: '4rem', fontWeight: 700, marginBottom: '1rem', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
          Faith AI
        </h1>
        <p className="animate-fade-in animate-delay-1 home-description" style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 4rem', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          Seek moral and ethical guidance inspired by ancient wisdom. Ask your questions and receive answers rooted in profound religious texts.
        </p>

        <div className="home-grid">

          {/* Ask Krishna */}
          <Link href="/krishna" className="glass-card animate-fade-in animate-delay-1 home-card" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', borderTop: '4px solid var(--theme-krishna)' }}>
            <div style={{ padding: '1.5rem', borderRadius: '50%', background: 'var(--theme-krishna-glow)', color: 'var(--theme-krishna)' }}>
              <span style={{ fontSize: '48px', lineHeight: 1, fontFamily: 'system-ui' }}>ॐ</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>Ask Krishna</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Guidance rooted in the teachings of the Bhagavad Gita and Vedic wisdom.</p>
          </Link>

          {/* Ask Bible - Coming Soon */}
          <div className="glass-card animate-fade-in animate-delay-2 home-card" style={{ borderTop: '4px solid var(--theme-bible)', position: 'relative', opacity: 0.55, cursor: 'not-allowed', userSelect: 'none', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', padding: '0.25rem 0.85rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#fff', textTransform: 'uppercase', boxShadow: '0 2px 8px rgba(99,102,241,0.4)' }}>
              Coming Soon
            </div>
            <div style={{ padding: '1.5rem', borderRadius: '50%', background: 'var(--theme-bible-glow)', color: 'var(--theme-bible)', filter: 'grayscale(40%)' }}>
              <span style={{ fontSize: '56px', lineHeight: 1, fontFamily: 'system-ui' }}>✝</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>Ask Bible</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Moral clarity drawn from the Old and New Testaments.</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--theme-bible)', marginTop: '0.25rem', fontWeight: 500 }}>📖 Dataset ingestion in progress</p>
          </div>

          {/* Ask Prophet - Coming Soon */}
          <div className="glass-card animate-fade-in animate-delay-3 home-card" style={{ borderTop: '4px solid var(--theme-quran)', position: 'relative', opacity: 0.55, cursor: 'not-allowed', userSelect: 'none', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'linear-gradient(135deg, #10b981, #059669)', padding: '0.25rem 0.85rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#fff', textTransform: 'uppercase', boxShadow: '0 2px 8px rgba(16,185,129,0.4)' }}>
              Coming Soon
            </div>
            <div style={{ padding: '1.5rem', borderRadius: '50%', background: 'var(--theme-quran-glow)', color: 'var(--theme-quran)', filter: 'grayscale(40%)' }}>
              <span style={{ fontSize: '40px', lineHeight: 1, fontFamily: 'system-ui' }}>﷽</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>Ask Prophet</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Ethical principles and understanding from Islamic teachings.</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--theme-quran)', marginTop: '0.25rem', fontWeight: 500 }}>📖 Dataset ingestion in progress</p>
          </div>

        </div>
      </div>

      {/* Footer bar */}
      <footer className="home-footer glass-panel">
        <div>© 2026 Faith AI. Guided by Ancient Wisdom.</div>
        <div className="home-footer-links">
          <a href="#about" className="home-footer-link" onClick={(e) => { e.preventDefault(); alert("Faith AI is a platform offering moral and ethical perspectives rooted in the scriptures of global religions."); }}>About</a>
          <a href="#dharma" className="home-footer-link" onClick={(e) => { e.preventDefault(); alert("Guided by the teachings of the Bhagavad Gita, the Old and New Testaments, and Islamic scriptures."); }}>Dharma</a>
          <a href="#privacy" className="home-footer-link" onClick={(e) => { e.preventDefault(); alert("Your chat sessions are stored securely in our database. Beta user data is protected."); }}>Privacy</a>
        </div>
      </footer>

    </main>
  );
}
