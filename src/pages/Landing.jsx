import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Animation helpers ─────────────────────────────────── */
const ease = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.72, ease, delay } }),
};
const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.11 } },
};

// Scroll-position visibility check instead of IntersectionObserver — IO is
// unavailable in some embedded/preview contexts, and content must never be
// stuck invisible just because the observer didn't fire.
function useRevealed(margin = 72) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const check = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight - margin && r.bottom > 0) {
        setVisible(true);
        window.removeEventListener('scroll', check);
        window.removeEventListener('resize', check);
      }
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [margin]);
  return [ref, visible];
}

function Reveal({ children, delay = 0, style = {}, as = 'div' }) {
  const [ref, visible] = useRevealed(72);
  const Tag = motion[as] ?? motion.div;
  return (
    <Tag ref={ref} variants={fadeUp} custom={delay} initial="hidden" animate={visible ? 'visible' : 'hidden'} style={style}>
      {children}
    </Tag>
  );
}

function RevealGroup({ children, style = {} }) {
  const [ref, visible] = useRevealed(56);
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden" animate={visible ? 'visible' : 'hidden'} style={style}>
      {children}
    </motion.div>
  );
}

/* ─── Design tokens: Editorial Harbor ───────────────────── */
const C = {
  navy:      '#0a1628',
  navyLight: '#1a3558',
  teal:      '#0D5C63',
  tealLight: '#177E8A',
  brass:     '#A97E2F',
  brassPale: '#D3A95C',
  sand:      '#F1EBDD',
  cream:     '#FAF8F3',
  ink:       '#1C2B33',
  white:     '#ffffff',
  muted:     '#5C6B73',
  faint:     '#9ca3af',
};

const SERIF = '"Fraunces", Georgia, serif';
const SANS = 'Inter, sans-serif';

function Label({ children, light = false }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 14px', borderRadius: 20,
      background: light ? 'rgba(211,169,92,0.12)' : 'rgba(13,92,99,0.1)',
      border: `1px solid ${light ? 'rgba(211,169,92,0.25)' : 'rgba(13,92,99,0.22)'}`,
      fontFamily: SANS, fontSize: 11, fontWeight: 600,
      letterSpacing: '0.22em', textTransform: 'uppercase',
      color: light ? C.brassPale : C.teal,
      marginBottom: 20,
    }}>
      {children}
    </div>
  );
}

/* ─── Life-event chips (secondary strip) ─────────────────── */
const EVENTS = [
  'Job promotions', 'New roles', 'Moving cities', 'Birthdays',
  'Engagements', 'New babies', 'Starting a company', 'Work anniversaries',
];

/* ─── Product-window mockups ─────────────────────────────── */
function BrowserWindow({ children, path = 'harbored.app/dashboard' }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, overflow: 'hidden', width: '100%',
      boxShadow: '0 24px 64px rgba(10,22,40,0.16), 0 3px 14px rgba(10,22,40,0.07)',
      fontFamily: SANS,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#F7F5F0', borderBottom: '1px solid #EEEBE3' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#E8B4AE', '#E6CE9E', '#B5CDB4'].map(c => (
            <span key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, display: 'inline-block' }} />
          ))}
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#8B969C', background: '#fff', borderRadius: 6, padding: '3px 10px', border: '1px solid #EEEBE3', maxWidth: 240, margin: '0 auto' }}>
          {path}
        </div>
        <div style={{ width: 40 }} />
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

function TideGauge({ score, width = 120 }) {
  const above = score >= 70;
  return (
    <div style={{ width }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: C.muted }}>Significance</span>
        <span style={{ fontFamily: SERIF, fontSize: 13, fontWeight: 600, color: above ? C.brass : C.muted }}>{score}</span>
      </div>
      <div style={{ position: 'relative', height: 4, borderRadius: 2, background: '#E5E1D7' }}>
        <div style={{ width: `${score}%`, height: '100%', borderRadius: 2, background: above ? `linear-gradient(90deg, ${C.teal} 55%, ${C.brass})` : '#9AA69F' }} />
        <div style={{ position: 'absolute', left: '70%', top: -3, width: 1, height: 10, background: 'rgba(28,43,51,0.4)' }} />
      </div>
    </div>
  );
}

function MockAvatar({ initials, size = 30 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#1e3a5f', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 600, flexShrink: 0,
    }}>{initials}</div>
  );
}

function FeedMock() {
  const rows = [
    { init: 'JS', name: 'John Sullivan', chip: 'Villanova Basketball', chipColor: '#2E7D5B', head: 'Villanova lands five-star transfer guard Jalen Reyes', score: 92 },
    { init: 'TW', name: 'Tom Whitfield', chip: 'Charleston Commercial Real Estate', chipColor: C.brass, head: 'Downtown retail vacancy hits decade low in Charleston', score: 88 },
    { init: 'SC', name: 'Sarah Chen', chip: 'Formula 1', chipColor: '#2E7D5B', head: 'F1 confirms Chicago street race for 2027', score: 84 },
  ];
  return (
    <BrowserWindow>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, color: C.muted, marginBottom: 10 }}>
        Worth reaching out — 3
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < rows.length - 1 ? '1px solid #F0EEE7' : 'none' }}>
          <MockAvatar initials={r.init} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{r.name}</span>
              <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 7px', borderRadius: 10, background: `${r.chipColor}14`, color: r.chipColor }}>{r.chip}</span>
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.head}</div>
          </div>
          <TideGauge score={r.score} width={86} />
        </div>
      ))}
    </BrowserWindow>
  );
}

function DiscoveryMock() {
  return (
    <BrowserWindow path="harbored.app/discover">
      <div style={{ fontSize: 11, color: C.muted, fontStyle: 'italic', background: '#F7F5F0', border: '1px solid #EEEBE3', borderRadius: 8, padding: '10px 12px', marginBottom: 12, lineHeight: 1.6 }}>
        "Met Tom Whitfield at the Charleston Chamber mixer — he runs a commercial real estate firm downtown, mostly retail and mixed-use. Market's been tight, he said."
      </div>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, color: C.teal, marginBottom: 8 }}>
        Found 2 shared themes
      </div>
      {[
        ['Charleston Commercial Real Estate', 94], ['Downtown Retail Leasing', 79],
      ].map(([label, conf]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 9, background: 'rgba(13,92,99,0.05)', border: '1px solid rgba(13,92,99,0.2)', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{label}</span>
          <span style={{ fontFamily: SERIF, fontSize: 13, fontWeight: 600, color: C.teal }}>{conf}</span>
        </div>
      ))}
    </BrowserWindow>
  );
}

function PrepMock() {
  return (
    <BrowserWindow path="harbored.app/prep">
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, color: C.teal, marginBottom: 2 }}>Prep brief</div>
        <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: C.ink }}>Coffee — Kudu Coffee, King Street</div>
        <div style={{ fontSize: 11, color: C.muted }}>Thursday 8:30 AM · with Tom Whitfield</div>
      </div>
      {[
        '"Downtown retail vacancy hit a decade low" — broke 3 days ago. Tom will have thoughts on where lease rates are headed.',
        'From your notes: closed on a mixed-use building near the Battery last spring — ask how leasing’s going.',
        "It's been 38 days since the Chamber mixer — good timing to follow up.",
      ].map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
          <span style={{ width: 17, height: 17, borderRadius: '50%', background: C.teal, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
          <span style={{ fontSize: 11.5, color: C.ink, lineHeight: 1.55 }}>{p}</span>
        </div>
      ))}
    </BrowserWindow>
  );
}

function DigestMock() {
  return (
    <BrowserWindow path="harbored.app/digest">
      <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 10 }}>Your week in relationships</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[['4', 'reasons to reach out'], ['2', 'drifting quietly']].map(([n, l]) => (
          <div key={l} style={{ borderRadius: 9, border: '1px solid #EEEBE3', padding: '10px 12px' }}>
            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: C.teal, lineHeight: 1 }}>{n}</div>
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>
      {[['TW', 'Tom Whitfield', 'Charleston retail vacancy low — 88'], ['KC', 'Kellan Carney', 'Vikings trade up to No. 4 — 73']].map(([init, name, note]) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1px solid #F0EEE7' }}>
          <MockAvatar initials={init} size={24} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{name}</span>
          <span style={{ fontSize: 11, color: C.muted, marginLeft: 'auto' }}>{note}</span>
        </div>
      ))}
    </BrowserWindow>
  );
}

/* ─── Waitlist Modal ────────────────────────────────────── */
function WaitlistModal({ isOpen, onClose, plan }) {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail]         = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); };
  }, [isOpen]); // eslint-disable-line

  const handleSubmit = e => {
    e.preventDefault();
    if (!email) return;
    fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ firstName, email, plan: plan || undefined }),
    }).catch(() => {});
    const existing = JSON.parse(localStorage.getItem('harbored_waitlist') || '[]');
    existing.push({ firstName, email, plan: plan || null, ts: new Date().toISOString() });
    localStorage.setItem('harbored_waitlist', JSON.stringify(existing));
    setSubmitted(true);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => { setSubmitted(false); setFirstName(''); setEmail(''); }, 280);
  };

  const inputStyle = {
    width: '100%', padding: '13px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    fontFamily: SANS, fontSize: 14,
    color: C.cream, outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.18s',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(5,10,22,0.88)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.93, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.28, ease }}
            onClick={e => e.stopPropagation()}
            style={{
              background: C.navy, borderRadius: 20,
              border: '1px solid rgba(211,169,92,0.22)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.65)',
              width: '100%', maxWidth: 420, padding: 'clamp(32px, 6vw, 48px)', position: 'relative',
            }}
          >
            <button
              onClick={handleClose} aria-label="Close"
              style={{
                position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'rgba(250,248,243,0.45)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 28 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.brassPale} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="2.2"/><line x1="12" y1="7.2" x2="12" y2="21"/><path d="M4.5 14.5 Q12 18.5 19.5 14.5"/>
              </svg>
              <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, color: C.cream }}>Harbored</span>
            </div>

            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 600, color: C.cream, lineHeight: 1.2, marginBottom: 10 }}>
                    Be the first to know.
                  </h2>
                  <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: 14, color: 'rgba(250,248,243,0.48)', lineHeight: 1.65, marginBottom: 28 }}>
                    Harbored is coming soon. Drop your info and we'll reach out when it's ready{plan === 'pro' ? " — we'll flag you as interested in Pro." : '.'}
                  </p>
                  <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                      <input type="text" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'rgba(211,169,92,0.5)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                      <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'rgba(211,169,92,0.5)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                    </div>
                    <button type="submit" style={{
                      width: '100%', padding: '14px', background: C.teal, color: '#fff',
                      fontFamily: SANS, fontWeight: 700, fontSize: 14,
                      border: 'none', borderRadius: 8, cursor: 'pointer',
                      boxShadow: '0 4px 20px rgba(13,92,99,0.4)', transition: 'background 0.18s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#09454B'}
                    onMouseLeave={e => e.currentTarget.style.background = C.teal}>
                      Join the Waitlist
                    </button>
                  </form>
                  <p style={{ fontFamily: SANS, fontSize: 11, color: 'rgba(250,248,243,0.2)', textAlign: 'center', marginTop: 14 }}>
                    No spam. We'll only reach out when Harbored is ready.
                  </p>
                </motion.div>
              ) : (
                <motion.div key="success" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease }}
                  style={{ textAlign: 'center', padding: '24px 0 8px' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(211,169,92,0.1)', border: '1px solid rgba(211,169,92,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.brassPale} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <h3 style={{ fontFamily: SERIF, fontSize: 'clamp(20px, 3.5vw, 26px)', fontWeight: 600, color: C.cream, marginBottom: 10 }}>
                    You're on the list.
                  </h3>
                  <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: 14, color: 'rgba(250,248,243,0.48)', lineHeight: 1.65 }}>
                    We'll reach out when Harbored is ready.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Top nav ─────────────────────────────────────────────── */
function Nav({ scrolled, openModal }) {
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 64, padding: '0 clamp(20px, 5vw, 64px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      transition: 'background 0.35s ease, box-shadow 0.35s ease',
      background: scrolled ? 'rgba(10,22,40,0.96)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      boxShadow: scrolled ? '0 1px 0 rgba(255,255,255,0.05)' : 'none',
    }}>
      <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.brassPale} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="2.2"/><line x1="12" y1="7.2" x2="12" y2="21"/><path d="M4.5 14.5 Q12 18.5 19.5 14.5"/>
        </svg>
        <span style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 600, color: C.cream }}>Harbored</span>
      </a>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
        {[['Common Ground', '#common-ground'], ['Discovery', '#discovery'], ['Prep Briefs', '#prep-briefs'], ['Pricing', '#pricing']].map(([label, href]) => (
          <a key={label} href={href} className="nav-link"
            style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: 'rgba(250,248,243,0.62)', textDecoration: 'none', transition: 'color 0.18s', display: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = C.cream}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(250,248,243,0.62)'}
          >{label}</a>
        ))}
        <button onClick={() => openModal()} style={{
          padding: '9px 20px', background: C.teal, color: '#fff',
          fontFamily: SANS, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0,
          border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'background 0.18s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#09454B'}
        onMouseLeave={e => e.currentTarget.style.background = C.teal}
        >Get Early Access</button>
      </nav>
    </header>
  );
}

/* ─── Sticky platform sub-nav (Klaviyo-style anchors) ────── */
const SUBNAV = [
  ['Common Ground', '#common-ground'],
  ['Discovery', '#discovery'],
  ['Prep Briefs', '#prep-briefs'],
  ['Weekly Digest', '#digest'],
  ['Life Events', '#life-events'],
  ['Pricing', '#pricing'],
];

function SubNav() {
  return (
    <div className="platform-subnav" style={{
      position: 'sticky', top: 64, zIndex: 90,
      background: 'rgba(250,248,243,0.94)', backdropFilter: 'blur(14px)',
      borderBottom: '1px solid #E5DFCF',
    }}>
      <div className="platform-subnav-scroll" style={{
        maxWidth: 1120, margin: '0 auto', padding: '0 clamp(16px, 4vw, 40px)',
        display: 'flex', alignItems: 'center', gap: 4,
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      }}>
        <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted, marginRight: 14, whiteSpace: 'nowrap', flexShrink: 0 }}>
          The Platform
        </span>
        {SUBNAV.map(([label, href]) => (
          <a key={label} href={href} style={{
            fontFamily: SANS, fontSize: 13, fontWeight: 500, color: C.ink,
            textDecoration: 'none', padding: '15px 13px', whiteSpace: 'nowrap',
            borderBottom: '2px solid transparent', transition: 'color 0.15s, border-color 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = C.teal; e.currentTarget.style.borderBottomColor = C.teal; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.ink; e.currentTarget.style.borderBottomColor = 'transparent'; }}
          >{label}</a>
        ))}
      </div>
    </div>
  );
}

/* ─── Alternating feature section ─────────────────────────── */
function FeatureSection({ id, kicker, title, em, body, points = [], flip = false, tint = 'rgba(13,92,99,0.06)', window: Window, cta, onCta }) {
  return (
    <section id={id} style={{ padding: 'clamp(44px, 6vw, 80px) clamp(20px, 6vw, 80px)', scrollMarginTop: 124 }}>
      <div style={{
        maxWidth: 1120, margin: '0 auto',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        gap: 'clamp(32px, 5vw, 72px)',
        flexDirection: flip ? 'row-reverse' : 'row',
      }}>
        <Reveal style={{ flex: '1 1 380px', minWidth: 300 }}>
          <Label>{kicker}</Label>
          <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.6vw, 44px)', fontWeight: 600, lineHeight: 1.14, letterSpacing: '-0.02em', color: C.ink, marginBottom: 18 }}>
            {title}{em && <> <em style={{ fontStyle: 'italic', color: C.teal }}>{em}</em></>}
          </h2>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: 'clamp(14px, 1.5vw, 16.5px)', color: '#4a5a60', lineHeight: 1.72, marginBottom: points.length ? 22 : 28, maxWidth: 460 }}>
            {body}
          </p>
          {points.map(point => (
            <div key={point} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ width: 19, height: 19, borderRadius: '50%', background: 'rgba(13,92,99,0.1)', border: '1px solid rgba(13,92,99,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span style={{ fontFamily: SANS, fontSize: 14, color: '#37444a', lineHeight: 1.55 }}>{point}</span>
            </div>
          ))}
          <button onClick={onCta} style={{
            marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: SANS, fontSize: 14.5, fontWeight: 600, color: C.teal,
          }}
          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
            {cta}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </Reveal>
        <Reveal delay={0.12} style={{ flex: '1 1 400px', minWidth: 300 }}>
          <div style={{ background: tint, borderRadius: 24, padding: 'clamp(18px, 3vw, 34px)' }}>
            <Window />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPlan, setModalPlan] = useState(null);
  const openModal = (plan = null) => { setModalPlan(plan); setIsModalOpen(true); };

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 44);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div style={{ background: C.cream, color: C.ink }}>
      <Nav scrolled={scrolled} openModal={openModal} />

      {/* ══════════════════ HERO — compact, product-forward ══════════════════ */}
      <section style={{
        background: `linear-gradient(180deg, ${C.navy} 0%, #0d1e33 100%)`,
        padding: 'clamp(120px, 16vh, 168px) clamp(20px, 6vw, 80px) clamp(56px, 7vw, 88px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Sailboat watermark */}
        <svg aria-hidden="true" width="220" height="260" viewBox="0 0 108 128" fill="none"
          style={{ position: 'absolute', right: '4%', top: 90, opacity: 0.07, pointerEvents: 'none' }}>
          <line x1="53" y1="6" x2="55" y2="95" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M53,10 Q54,50 55,91 L14,79 Q8,62 13,44 Q22,24 53,10 Z" fill="white" fillOpacity="0.88"/>
          <path d="M53,12 L98,97 Q84,88 72,79 Q63,67 58,48 Q55,30 53,12 Z" fill="white" fillOpacity="0.65"/>
          <path d="M13,99 Q54,108 95,99 L91,103 Q54,112 17,103 Z" fill="white"/>
        </svg>

        <div style={{ maxWidth: 1120, margin: '0 auto', position: 'relative' }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{
              fontFamily: SANS, fontSize: 11, fontWeight: 600, letterSpacing: '0.3em',
              textTransform: 'uppercase', color: C.brassPale, marginBottom: 24,
              animation: 'fadeUp 0.7s 0.05s ease both',
            }}>
              Common Ground, by Harbored
            </div>
            <h1 style={{
              fontFamily: SERIF, fontWeight: 600,
              fontSize: 'clamp(38px, 5.6vw, 68px)', lineHeight: 1.06, letterSpacing: '-0.02em',
              color: C.cream, margin: '0 0 22px',
              animation: 'fadeUp 0.85s 0.15s ease both',
            }}>
              Your network is growing. <em style={{ fontStyle: 'italic' }}>Don't lose touch.</em>
            </h1>
            <p style={{
              fontFamily: SANS, fontWeight: 300, fontSize: 'clamp(15px, 1.6vw, 18px)',
              color: 'rgba(250,248,243,0.55)', maxWidth: 520, lineHeight: 1.7, marginBottom: 34,
              animation: 'fadeUp 0.85s 0.28s ease both',
            }}>
              Tell Harbored what you share with the people from your internships, your program,
              your firm — the team, the city, the market. It watches those themes around the
              clock and tells you the moment there's a real reason to reconnect, message drafted.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18, animation: 'fadeUp 0.85s 0.4s ease both' }}>
              <button onClick={() => openModal()} style={{
                padding: '14px 34px', background: C.teal, color: '#fff',
                fontFamily: SANS, fontWeight: 600, fontSize: 14.5,
                border: 'none', borderRadius: 8, cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(13,92,99,0.45)', transition: 'background 0.18s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#09454B'}
              onMouseLeave={e => e.currentTarget.style.background = C.teal}>
                Get Early Access
              </button>
              <a href="#common-ground" style={{
                display: 'inline-flex', alignItems: 'center', padding: '13px 28px',
                color: 'rgba(250,248,243,0.75)', fontFamily: SANS, fontWeight: 400, fontSize: 14.5,
                textDecoration: 'none', border: '1px solid rgba(250,248,243,0.22)', borderRadius: 8,
                transition: 'border-color 0.18s, color 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(250,248,243,0.55)'; e.currentTarget.style.color = C.cream; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(250,248,243,0.22)'; e.currentTarget.style.color = 'rgba(250,248,243,0.75)'; }}>
                See the platform
              </a>
            </div>
            <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: 12, color: 'rgba(250,248,243,0.28)', animation: 'fadeUp 0.85s 0.5s ease both' }}>
              In private early access — request an invite below.
            </p>
          </div>

          {/* Product window — fully contained so it never clips mid-row */}
          <div style={{ maxWidth: 760, margin: 'clamp(44px, 6vw, 64px) auto 0', animation: 'fadeUp 0.9s 0.55s ease both' }}>
            <FeedMock />
          </div>
        </div>
      </section>

      {/* ══════════════════ STICKY PLATFORM SUB-NAV ══════════════════ */}
      <SubNav />

      {/* ══════════════════ FEATURE: COMMON GROUND ══════════════════ */}
      <FeatureSection
        id="common-ground"
        kicker="Common Ground"
        title="Shared themes,"
        em="watched around the clock."
        body="For every person who matters, tell Harbored what you have in common. Those themes become standing reasons to talk — monitored across live news sources and scored for significance, so you're only interrupted when something clears the reach-out bar."
        points={[
          'Themes across sports, places, markets, hobbies, and industries',
          'A visible reach-out bar at 70 — below it, logged quietly',
          'Message drafted for you to review and send — Auto-Send is opt-in, not the default',
        ]}
        cta="Explore Common Ground"
        onCta={() => openModal()}
        window={FeedMock}
        tint="rgba(13,92,99,0.07)"
      />

      {/* ══════════════════ FEATURE: DISCOVERY ══════════════════ */}
      <FeatureSection
        id="discovery"
        kicker="Discovery"
        title="Met someone worth knowing?"
        em="Tell Harbored what you talked about."
        body="Right after you meet someone — a new contact, a business owner, anyone worth staying close to — describe the relationship in your own words, or drop in the text thread if you've got one. Harbored pulls out the shared ground, quotes the evidence back to you, and starts monitoring the theme the moment you approve it."
        points={[
          'Evidence-backed proposals, not guesses',
          'Works from a quick note or a full conversation',
          'One click to start monitoring each theme',
        ]}
        cta="Explore Discovery"
        onCta={() => openModal()}
        window={DiscoveryMock}
        flip
        tint="rgba(169,126,47,0.09)"
      />

      {/* ══════════════════ FEATURE: PREP BRIEFS ══════════════════ */}
      <FeatureSection
        id="prep-briefs"
        kicker="Prep Briefs"
        title="Never walk into"
        em="a catch-up cold."
        body="Before every coffee or call, Harbored hands you a one-pager: what broke on your shared themes this week, where you left off, your notes, and talking points numbered in the order you'll want them."
        points={[
          'Live theme updates pulled the morning of',
          'Openers ready if you blank',
        ]}
        cta="Explore Prep Briefs"
        onCta={() => openModal()}
        window={PrepMock}
        tint="rgba(30,58,95,0.07)"
      />

      {/* ══════════════════ FEATURE: DIGEST ══════════════════ */}
      <FeatureSection
        id="digest"
        kicker="Weekly Digest"
        title="Your week in relationships,"
        em="on one page."
        body="Every week: the reasons to reach out, who's drifting quietly, and proof the small gestures are compounding. Consistency is the whole game — the digest is how you keep score."
        points={[
          'Reach-out opportunities ranked by significance',
          'Drifting contacts flagged before they go cold',
        ]}
        cta="Explore the Digest"
        onCta={() => openModal()}
        window={DigestMock}
        flip
        tint="rgba(46,125,91,0.08)"
      />

      {/* ══════════════════ STATEMENT BAND ══════════════════ */}
      <section style={{ background: C.navy, padding: 'clamp(72px, 11vw, 128px) clamp(20px, 6vw, 80px)' }}>
        <Reveal style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 'clamp(64px, 11vw, 132px)', fontWeight: 600, color: C.brassPale, lineHeight: 1, marginBottom: 22 }}>
            150
          </div>
          <p style={{ fontFamily: SERIF, fontSize: 'clamp(21px, 2.7vw, 32px)', fontWeight: 500, color: C.cream, lineHeight: 1.42, letterSpacing: '-0.01em', maxWidth: 720, margin: '0 auto' }}>
            is the most relationships anyone can actively keep up with. That's a lot of people worth staying close to —{' '}
            <span style={{ color: C.brassPale }}>Harbored helps you keep every one.</span>
          </p>
          <p style={{ fontFamily: SANS, fontSize: 13, fontWeight: 300, color: 'rgba(250,248,243,0.42)', marginTop: 26, letterSpacing: '0.02em' }}>
            Dunbar's number — Robin Dunbar, University of Oxford.
          </p>
        </Reveal>
      </section>

      {/* ══════════════════ LIFE EVENTS STRIP ══════════════════ */}
      <section id="life-events" style={{ padding: 'clamp(56px, 8vw, 96px) clamp(20px, 6vw, 80px)', background: C.sand, borderBottom: '1px solid #E5DFCF', scrollMarginTop: 124 }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <Reveal style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 30 }}>
            <div>
              <Label>Beyond Your Themes</Label>
              <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(26px, 3.2vw, 38px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                Every milestone, <em style={{ fontStyle: 'italic', color: C.teal }}>kept in view.</em>
              </h2>
            </div>
            <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: 14.5, color: '#4a5a60', maxWidth: 380, lineHeight: 1.65 }}>
              Common ground is the heartbeat — log the milestones in your network too, and Harbored makes sure they don't slip by unnoticed.
            </p>
          </Reveal>
          <RevealGroup style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {EVENTS.map(label => (
              <motion.span key={label} variants={fadeUp} custom={0} style={{
                fontFamily: SANS, fontSize: 13.5, fontWeight: 500, color: C.ink,
                padding: '10px 18px', borderRadius: 24, background: '#fff', border: '1px solid #E0DBCE',
              }}>
                {label}
              </motion.span>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ══════════════════ TESTIMONIAL — single, big ══════════════════ */}
      <section style={{ padding: 'clamp(72px, 10vw, 128px) clamp(20px, 6vw, 80px)', background: C.cream }}>
        <Reveal style={{ maxWidth: 880, margin: '0 auto' }}>
          <div style={{ fontFamily: SERIF, fontSize: 80, lineHeight: 0.6, color: C.brassPale, marginBottom: 26, userSelect: 'none' }}>"</div>
          <blockquote style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 500, fontStyle: 'italic', lineHeight: 1.4, color: C.ink, margin: '0 0 30px' }}>
            My college roommate and I share exactly one thing: Villanova basketball. Harbored pinged
            me the second the transfer news broke, message already written. We hadn't talked in
            months — now we're going to a game.
          </blockquote>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src="https://i.pravatar.cc/80?img=11" alt="Jake M." width={46} height={46} style={{ borderRadius: '50%', objectFit: 'cover' }} />
            <div>
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14.5, color: C.ink }}>Jake M.</div>
              <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 13, color: C.muted }}>Account Executive · early access user</div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════ PRICING ══════════════════ */}
      <section id="pricing" style={{ padding: 'clamp(64px, 9vw, 120px) clamp(20px, 6vw, 80px)', background: C.sand, borderTop: '1px solid #E5DFCF', scrollMarginTop: 124 }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 'clamp(36px, 5vw, 56px)' }}>
            <Label>Pricing</Label>
            <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.6vw, 44px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.12, marginBottom: 12 }}>
              Simple, honest pricing.
            </h2>
            <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: 15.5, color: '#4a5a60' }}>Here's what launch pricing looks like — join the waitlist to lock it in.</p>
          </Reveal>

          <RevealGroup style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <motion.div variants={fadeUp} custom={0}>
              <div style={{ background: '#fff', border: '1px solid #E0DBCE', borderRadius: 16, padding: 'clamp(28px, 4vw, 40px)', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted, marginBottom: 10 }}>Free</div>
                  <div style={{ fontFamily: SERIF, fontSize: 44, fontWeight: 600, color: C.ink, lineHeight: 1 }}>$0<span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 16, color: C.faint }}>/mo</span></div>
                  <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: 13, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>Keep your inner five close — and see what Harbored can do.</p>
                </div>
                <div style={{ borderTop: '1px solid #EBE7DC', paddingTop: 22, flex: 1 }}>
                  {['Monitor up to 5 contacts', '2 Common Ground themes per contact', 'Weekly digest email', 'Manual send only'].map(f => (
                    <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E7D5B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontFamily: SANS, fontSize: 14, color: '#37444a' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => openModal('free')} style={{
                  display: 'block', marginTop: 26, padding: '13px', textAlign: 'center',
                  background: 'transparent', border: `1px solid ${C.ink}`, borderRadius: 8,
                  fontFamily: SANS, fontWeight: 600, fontSize: 14, color: C.ink, cursor: 'pointer', transition: 'background 0.18s, color 0.18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.ink; e.currentTarget.style.color = C.cream; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.ink; }}>
                  Join Waitlist — Free
                </button>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} custom={0.1}>
              <div style={{ background: C.navy, border: `2px solid ${C.brass}`, borderRadius: 16, padding: 'clamp(28px, 4vw, 40px)', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>
                <div style={{ position: 'absolute', top: 22, right: 22, padding: '4px 12px', background: `linear-gradient(135deg, ${C.brass}, ${C.brassPale})`, borderRadius: 20, fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.navy }}>Most Popular</div>
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.brassPale, marginBottom: 10 }}>Harbored Pro</div>
                  <div style={{ fontFamily: SERIF, fontSize: 44, fontWeight: 600, color: C.cream, lineHeight: 1 }}>$9<span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 16, color: 'rgba(250,248,243,0.45)' }}>/mo</span></div>
                  <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: 13, color: 'rgba(250,248,243,0.5)', marginTop: 10, lineHeight: 1.5 }}>For professionals who want their relationships to keep up with their careers.</p>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 22, flex: 1 }}>
                  {['Unlimited contacts & Common Ground themes', 'Common Ground discovery from your conversations', 'Prep briefs before every catch-up', 'AI message drafting in your voice', 'Auto-Send mode', 'All notification channels'].map(f => (
                    <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.brassPale} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontFamily: SANS, fontSize: 14, color: 'rgba(250,248,243,0.78)' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => openModal('pro')} style={{
                  display: 'block', marginTop: 26, padding: '14px', textAlign: 'center',
                  background: C.teal, borderRadius: 8, fontFamily: SANS, fontWeight: 700, fontSize: 14,
                  color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(13,92,99,0.4)', transition: 'background 0.18s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#09454B'}
                onMouseLeave={e => e.currentTarget.style.background = C.teal}>
                  Join Waitlist — Pro
                </button>
              </div>
            </motion.div>
          </RevealGroup>
        </div>
      </section>

      {/* ══════════════════ CTA ══════════════════ */}
      <section style={{ padding: 'clamp(80px, 12vw, 140px) clamp(20px, 6vw, 80px)', background: C.navy, textAlign: 'center' }}>
        <Reveal>
          <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(34px, 5.5vw, 68px)', fontWeight: 600, lineHeight: 1.08, letterSpacing: '-0.02em', color: C.cream, maxWidth: 640, margin: '0 auto 18px' }}>
            Always in your corner.
          </h2>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: 'clamp(15px, 1.7vw, 18px)', color: 'rgba(250,248,243,0.48)', maxWidth: 380, margin: '0 auto 44px', lineHeight: 1.65 }}>
            Join the waitlist. Be the first to show up when it counts.
          </p>
          <button onClick={() => openModal()} style={{
            padding: '16px 44px', background: C.teal, color: '#fff',
            fontFamily: SANS, fontWeight: 700, fontSize: 15,
            border: 'none', borderRadius: 8, cursor: 'pointer',
            boxShadow: '0 6px 28px rgba(13,92,99,0.5)', transition: 'transform 0.18s ease, background 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#09454B'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = C.teal; }}>
            Join the Waitlist
          </button>
          <p style={{ fontFamily: SANS, fontSize: 12, color: 'rgba(250,248,243,0.24)', marginTop: 18 }}>
            No credit card. No spam. We'll email you when it's ready.
          </p>
        </Reveal>
      </section>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer style={{ background: '#060c18', padding: 'clamp(40px, 6vw, 60px) clamp(20px, 6vw, 80px) clamp(24px, 4vw, 32px)', color: 'rgba(250,248,243,0.36)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 36, marginBottom: 40 }}>
            <div style={{ maxWidth: 240 }}>
              <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: C.cream, marginBottom: 6 }}>Harbored</div>
              <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 300, color: 'rgba(250,248,243,0.4)', lineHeight: 1.5 }}>Always in your corner.</div>
            </div>
            <div style={{ display: 'flex', gap: 'clamp(28px, 5vw, 72px)', flexWrap: 'wrap' }}>
              {[
                { heading: 'Platform', links: [['Common Ground', '#common-ground'], ['Discovery', '#discovery'], ['Prep Briefs', '#prep-briefs'], ['Weekly Digest', '#digest']] },
                { heading: 'Company', links: [['Pricing', '#pricing']] },
                { heading: 'Legal',   links: [['Privacy', '#'], ['Terms', '#']] },
              ].map(({ heading, links }) => (
                <div key={heading}>
                  <div style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(250,248,243,0.22)', marginBottom: 16 }}>{heading}</div>
                  {links.map(([l, href]) => (
                    <div key={l} style={{ marginBottom: 10 }}>
                      <a href={href} style={{ fontFamily: SANS, fontSize: 13, fontWeight: 300, color: 'rgba(250,248,243,0.4)', textDecoration: 'none', transition: 'color 0.18s' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'rgba(250,248,243,0.8)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(250,248,243,0.4)'}
                      >{l}</a>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 300 }}>© 2026 Harbored, Inc. All rights reserved.</span>
            <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 300, color: 'rgba(250,248,243,0.25)' }}>Built on common ground.</span>
          </div>
        </div>
      </footer>

      <WaitlistModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} plan={modalPlan} />

      <style>{`
        @media (min-width: 880px) { .nav-link, .nav-login { display: inline !important; } }
        @media (max-width: 767px) { .platform-subnav { display: none !important; } }
        .platform-subnav-scroll::-webkit-scrollbar { height: 0; display: none; }
        .platform-subnav-scroll { scrollbar-width: none; }
        ::placeholder { color: rgba(250,248,243,0.28); }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}
