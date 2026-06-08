import { useRef, useState, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import LakeScene from '../components/LakeScene';

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

function Reveal({ children, delay = 0, style = {}, as = 'div' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-72px' });
  const Tag = motion[as] ?? motion.div;
  return (
    <Tag ref={ref} variants={fadeUp} custom={delay} initial="hidden" animate={inView ? 'visible' : 'hidden'} style={style}>
      {children}
    </Tag>
  );
}

function RevealGroup({ children, style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-56px' });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden" animate={inView ? 'visible' : 'hidden'} style={style}>
      {children}
    </motion.div>
  );
}

/* ─── Design tokens ─────────────────────────────────────── */
const C = {
  navy:      '#0a1628',
  navyLight: '#1a3558',
  gold:      '#c8882e',
  goldLight: '#e8a83c',
  goldPale:  '#f5c56a',
  sand:      '#f5ead8',
  cream:     '#faf8f4',
  white:     '#ffffff',
  muted:     '#6b7280',
  faint:     '#9ca3af',
};

const sec = { padding: 'clamp(80px, 11vw, 136px) clamp(20px, 6vw, 80px)' };

function Label({ children, light = false, center = false }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 14px', borderRadius: 20,
      background: light ? 'rgba(245,197,106,0.12)' : 'rgba(200,136,46,0.1)',
      border: `1px solid ${light ? 'rgba(245,197,106,0.25)' : 'rgba(200,136,46,0.22)'}`,
      fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
      letterSpacing: '0.22em', textTransform: 'uppercase',
      color: light ? C.goldPale : C.gold,
      marginBottom: 22,
      ...(center ? { display: 'flex', margin: '0 auto 22px' } : {}),
    }}>
      {children}
    </div>
  );
}

const Icon = ({ d, size = 26, color = C.gold }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

const Icons = {
  Promotion:   <Icon d="M12 20V4M5 11l7-7 7 7M3 20h18" />,
  NewRole:     <Icon d={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12.01" y2="12"/><path d="M2 12h20"/></>} />,
  MovingCity:  <Icon d={<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>} />,
  Birthday:    <Icon d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 3V1M8 3l-1-1M16 3l1-1"/></>} />,
  Engagement:  <Icon d={<><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></>} />,
  NewBaby:     <Icon d={<><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>} />,
  StartCompany:<Icon d={<><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></>} />,
  WorkAnniv:   <Icon d={<><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></>} />,
};

const EVENTS = [
  { key: 'Promotion',    icon: Icons.Promotion,    label: 'Job Promotion',        desc: "When someone levels up — we're on it." },
  { key: 'NewRole',      icon: Icons.NewRole,      label: 'New Role',             desc: 'Career changes before they fade from your feed.' },
  { key: 'MovingCity',   icon: Icons.MovingCity,   label: 'Moving Cities',        desc: 'Know when someone lands in your city.' },
  { key: 'Birthday',     icon: Icons.Birthday,     label: 'Birthday',             desc: 'The right message, the right day, every time.' },
  { key: 'Engagement',   icon: Icons.Engagement,   label: 'Engagement & Marriage',desc: 'Big life moments deserve a personal note.' },
  { key: 'NewBaby',      icon: Icons.NewBaby,      label: 'New Baby',             desc: 'The moments people remember for a lifetime.' },
  { key: 'StartCompany', icon: Icons.StartCompany, label: 'Starting a Company',   desc: 'Spot the founders in your network early.' },
  { key: 'WorkAnniv',   icon: Icons.WorkAnniv,    label: 'Work Anniversary',     desc: 'A quiet milestone worth acknowledging.' },
];

const CHANNELS = [
  { name: 'Text / SMS', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="9.01" y2="10"/><line x1="12" y1="10" x2="12.01" y2="10"/><line x1="15" y1="10" x2="15.01" y2="10"/></svg> },
  { name: 'Email',      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
  { name: 'Slack',      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/><path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/><path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/><path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"/><path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/><path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z"/><path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z"/></svg> },
  { name: 'Teams',      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="14" height="13" rx="2"/><path d="M16 11h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2"/><circle cx="16" cy="5" r="2"/><path d="M9 7V4"/><line x1="6" y1="4" x2="12" y2="4"/></svg> },
  { name: 'WhatsApp',   icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> },
];

/* ─── Platform icons for trust bar ─────────────────────── */
const PLATFORMS = [
  {
    name: 'LinkedIn', bg: '#0077b5',
    icon: <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, lineHeight: 1 }}>in</span>,
  },
  {
    name: 'Gmail', bg: '#ea4335',
    icon: <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>G</span>,
  },
  {
    name: 'Outlook', bg: '#0078d4',
    icon: <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>O</span>,
  },
  {
    name: 'Instagram', bg: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 55%, #fcb045 100%)',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5"/>
        <circle cx="12" cy="12" r="5"/>
        <circle cx="17.5" cy="6.5" r="0.8" fill="#fff" stroke="none"/>
      </svg>
    ),
  },
  {
    name: 'X', bg: '#000',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L2.25 2.25h6.988l4.26 5.633 4.746-5.633Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/>
      </svg>
    ),
  },
  {
    name: 'TikTok', bg: '#010101',
    icon: (
      <svg width="12" height="13" viewBox="0 0 24 24" fill="#fff">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.15 8.15 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z"/>
      </svg>
    ),
  },
  {
    name: 'Contacts', bg: '#4a9d6f',
    icon: <span style={{ color: '#fff', fontSize: 13, lineHeight: 1 }}>☎</span>,
  },
];

/* ─── Mock UI card ──────────────────────────────────────── */
function MockCard() {
  const [autoSend, setAutoSend] = useState(false);
  const [status, setStatus] = useState('idle');
  const handleSend = () => setStatus('sent');
  const handleSkip = () => setStatus('skipped');
  const handleReset = () => setStatus('idle');

  return (
    <div style={{
      background: '#fff', borderRadius: 20,
      boxShadow: '0 24px 80px rgba(10,22,40,0.14), 0 4px 20px rgba(10,22,40,0.06)',
      overflow: 'hidden', maxWidth: 440, width: '100%',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #1a3558 100%)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,197,106,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="2.5"/><line x1="12" y1="7.5" x2="12" y2="22"/><path d="M4 14 Q12 18 20 14"/>
          </svg>
          <span style={{ color: 'rgba(253,248,238,0.85)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em' }}>HARBORED</span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.goldPale, background: 'rgba(245,197,106,0.12)', padding: '3px 8px', borderRadius: 10, border: '1px solid rgba(245,197,106,0.2)' }}>New event</span>
      </div>

      <div style={{ padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 18 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src="https://i.pravatar.cc/80?img=32" alt="Sarah Chen" width={46} height={46} style={{ borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: '#0077b5', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 8, fontWeight: 700, lineHeight: 1 }}>in</span>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0a1628', marginBottom: 4 }}>Sarah Chen</div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
              Just promoted to <span style={{ fontWeight: 600, color: C.navy }}>VP of Marketing</span> at Stripe
            </div>
            <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>2 hours ago · via LinkedIn</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="2" strokeLinecap="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Harbored drafted
          </span>
          <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
        </div>

        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div key="draft" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ background: '#f9fafb', border: '1px solid #f0f0f0', borderRadius: 12, padding: '14px 16px', marginBottom: 16, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', gap: 3 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#d1d5db', animation: `bobVertical ${1 + i * 0.2}s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />)}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: '#1f2937', margin: 0, paddingRight: 24 }}>
                "Sarah! Just saw the news — VP at Stripe, that's huge. So well deserved, congrats! Would love to catch up soon."
              </p>
            </motion.div>
          )}
          {status === 'sent' && (
            <motion.div key="sent" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>✓</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>Message sent to Sarah</div>
              <button onClick={handleReset} style={{ marginTop: 10, background: 'none', border: 'none', fontSize: 11, color: '#9ca3af', textDecoration: 'underline', cursor: 'pointer' }}>Undo</button>
            </motion.div>
          )}
          {status === 'skipped' && (
            <motion.div key="skipped" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: C.faint }}>Skipped — no worries.</div>
              <button onClick={handleReset} style={{ marginTop: 8, background: 'none', border: 'none', fontSize: 11, color: '#9ca3af', textDecoration: 'underline', cursor: 'pointer' }}>See draft again</button>
            </motion.div>
          )}
        </AnimatePresence>

        {status === 'idle' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button onClick={handleSend} style={{ flex: 1, padding: '10px 0', background: 'linear-gradient(135deg, #0a1628, #1a3558)', color: '#fdf8ee', border: 'none', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Send
            </button>
            <button style={{ padding: '10px 18px', background: 'transparent', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#d1d5db'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
            <button onClick={handleSkip} style={{ padding: '10px 16px', background: 'transparent', color: C.faint, border: '1px solid transparent', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 13, cursor: 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#6b7280'} onMouseLeave={e => e.currentTarget.style.color = C.faint}>
              Skip
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: autoSend ? 'rgba(200,136,46,0.06)' : '#f9fafb', borderRadius: 10, border: `1px solid ${autoSend ? 'rgba(200,136,46,0.2)' : '#f3f4f6'}`, transition: 'all 0.2s ease' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1f2937' }}>Auto-Send</div>
            <div style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>{autoSend ? 'On — Harbored will send automatically' : 'Off — you approve each message'}</div>
          </div>
          <button onClick={() => setAutoSend(v => !v)} style={{ width: 42, height: 24, borderRadius: 12, background: autoSend ? C.gold : '#e5e7eb', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.22s ease', flexShrink: 0 }} aria-label="Toggle Auto-Send">
            <div style={{ position: 'absolute', top: 3, left: autoSend ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.18)', transition: 'left 0.22s ease' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Waitlist Modal ────────────────────────────────────── */
function WaitlistModal({ isOpen, onClose }) {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail]         = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Lock scroll + Escape key
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
    const existing = JSON.parse(localStorage.getItem('harbored_waitlist') || '[]');
    existing.push({ firstName, email, ts: new Date().toISOString() });
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
    fontFamily: 'Inter, sans-serif', fontSize: 14,
    color: '#fdf8ee', outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.18s',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(5,10,22,0.88)',
            backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0a1628',
              borderRadius: 20,
              border: '1px solid rgba(200,136,46,0.22)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)',
              width: '100%', maxWidth: 420,
              padding: 'clamp(32px, 6vw, 48px)',
              position: 'relative',
            }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              aria-label="Close"
              style={{
                position: 'absolute', top: 16, right: 16,
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'rgba(253,248,238,0.45)',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fdf8ee'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(253,248,238,0.45)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 28 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="2.2"/>
                <line x1="12" y1="7.2" x2="12" y2="21"/>
                <path d="M4.5 14.5 Q12 18.5 19.5 14.5"/>
              </svg>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600, color: '#fdf8ee', letterSpacing: '0.02em' }}>Harbored</span>
            </div>

            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 500, color: '#fdf8ee', lineHeight: 1.2, marginBottom: 10 }}>
                    Be the first to know.
                  </h2>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 14, color: 'rgba(253,248,238,0.48)', lineHeight: 1.65, marginBottom: 28 }}>
                    Harbored is coming soon. Drop your info and we'll reach out when it's ready.
                  </p>

                  <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                      <input
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'rgba(200,136,46,0.5)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'rgba(200,136,46,0.5)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        width: '100%', padding: '14px',
                        background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                        color: C.navy,
                        fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14,
                        border: 'none', borderRadius: 8, cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(200,136,46,0.38)',
                        transition: 'opacity 0.18s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      Join the Waitlist
                    </button>
                  </form>

                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(253,248,238,0.2)', textAlign: 'center', marginTop: 14 }}>
                    No spam. We'll only reach out when Harbored is ready.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  style={{ textAlign: 'center', padding: '24px 0 8px' }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(200,136,46,0.1)', border: '1px solid rgba(200,136,46,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(20px, 3.5vw, 26px)', fontWeight: 500, color: '#fdf8ee', marginBottom: 10, lineHeight: 1.2 }}>
                    You're on the list.
                  </h3>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 14, color: 'rgba(253,248,238,0.48)', lineHeight: 1.65 }}>
                    We'll be in touch.
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

/* ─── Nav ─────────────────────────────────────────────────── */
function Nav({ scrolled, openModal }) {
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 66, padding: '0 clamp(20px, 5vw, 64px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      transition: 'background 0.35s ease, backdrop-filter 0.35s ease, box-shadow 0.35s ease',
      background: scrolled ? 'rgba(10,22,40,0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      boxShadow: scrolled ? '0 1px 0 rgba(255,255,255,0.05)' : 'none',
    }}>
      <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="2.2"/><line x1="12" y1="7.2" x2="12" y2="21"/><path d="M4.5 14.5 Q12 18.5 19.5 14.5"/>
        </svg>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 600, color: '#fdf8ee', letterSpacing: '0.03em' }}>Harbored</span>
      </a>

      <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {['How It Works', 'Features', 'Pricing'].map(label => (
          <a key={label}
            href={`#${label.toLowerCase().replace(/ /g,'-')}`}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: 'rgba(253,248,238,0.62)', textDecoration: 'none', transition: 'color 0.18s', display: 'none' }}
            className="nav-link"
            onMouseEnter={e => e.currentTarget.style.color = '#fdf8ee'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(253,248,238,0.62)'}
          >{label}</a>
        ))}
        <button
          onClick={openModal}
          style={{
            padding: '9px 22px',
            background: 'linear-gradient(135deg, #c8882e, #e8a83c)',
            color: '#0a1628',
            fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
            letterSpacing: '0.03em', textDecoration: 'none',
            border: 'none', borderRadius: 2, cursor: 'pointer',
            transition: 'opacity 0.18s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >Get Early Access</button>
      </nav>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const openModal = () => setIsModalOpen(true);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 44);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div style={{ background: C.cream, color: C.navy }}>
      <Nav scrolled={scrolled} openModal={openModal} />

      {/* ══════════════════ HERO ══════════════════ */}
      <LakeScene onCtaClick={openModal} />

      {/* ══════════════════ INTEGRATIONS TRUST BAR ══════════════════ */}
      <div style={{
        background: C.navy,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        padding: '20px clamp(20px, 6vw, 80px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 'clamp(12px, 3vw, 36px)', flexWrap: 'wrap',
      }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(253,248,238,0.28)', whiteSpace: 'nowrap' }}>
          Monitors your world via
        </span>
        {PLATFORMS.map(({ name, bg, icon }) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 5,
              background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>{icon}</div>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: 'rgba(253,248,238,0.52)' }}>{name}</span>
          </div>
        ))}
      </div>

      {/* ══════════════════ HOW IT WORKS ══════════════════ */}
      <section id="how-it-works" style={{ ...sec, background: C.cream }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: 'clamp(52px, 8vw, 88px)' }}>
            <Label center>How It Works</Label>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.025em', margin: '0 auto 18px' }}>
              Set it up once.<br />
              <em style={{ fontStyle: 'italic', color: C.gold }}>Stay present forever.</em>
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 'clamp(15px, 1.7vw, 18px)', color: '#4a5a70', maxWidth: 440, margin: '0 auto', lineHeight: 1.68 }}>
              Harbored does the watching so you can focus on what actually matters.
            </p>
          </Reveal>

          <RevealGroup style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
            {[
              { n: '01', icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, title: 'Connect Your World', body: "Link LinkedIn, import your contacts, or add people manually. Harbored builds your network map automatically — no spreadsheet required.", dark: false },
              { n: '02', icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.goldPale} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>, title: 'We Watch. You Live.', body: "Our AI monitors your network 24/7 — promotions, new roles, birthdays, moves, life milestones, and more. You won't miss a thing.", dark: true },
              { n: '03', icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>, title: 'Show Up When It Counts', body: 'Get notified your way — text, email, Slack. We draft the message in your voice. You approve and send, or let Harbored handle it automatically.', dark: false },
            ].map(({ n, icon, title, body, dark }) => (
              <motion.div key={n} variants={fadeUp} custom={0}>
                <div style={{ padding: 'clamp(28px, 4vw, 44px) clamp(24px, 3vw, 38px)', background: dark ? C.navy : '#fff', height: '100%', position: 'relative', overflow: 'hidden', borderRadius: n === '01' ? '12px 0 0 12px' : n === '03' ? '0 12px 12px 0' : 0 }}>
                  <span style={{ position: 'absolute', top: 18, right: 22, fontFamily: "'Playfair Display', serif", fontSize: 68, fontWeight: 700, lineHeight: 1, color: dark ? 'rgba(245,197,106,0.08)' : 'rgba(10,22,40,0.04)', userSelect: 'none' }}>{n}</span>
                  <div style={{ marginBottom: 20 }}>{icon}</div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(19px, 2.2vw, 23px)', fontWeight: 600, lineHeight: 1.3, marginBottom: 14, color: dark ? '#fdf8ee' : C.navy }}>{title}</h3>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 'clamp(13px, 1.4vw, 15px)', lineHeight: 1.72, color: dark ? 'rgba(253,248,238,0.55)' : '#4a5a70' }}>{body}</p>
                  {dark && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` }} />}
                </div>
              </motion.div>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ══════════════════ NEVER MISS A MOMENT ══════════════════ */}
      <section id="features" style={{ ...sec, background: `linear-gradient(180deg, ${C.sand} 0%, #fdf8f0 100%)`, borderTop: '1px solid #ede0c4', borderBottom: '1px solid #ede0c4' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: 'clamp(52px, 7vw, 80px)' }}>
            <Label center>Event Detection</Label>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.025em', margin: '0 auto 16px' }}>
              Never miss a moment<br />
              <em style={{ fontStyle: 'italic', color: C.gold }}>that matters.</em>
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 'clamp(14px, 1.6vw, 17px)', color: '#4a5a70', maxWidth: 420, margin: '0 auto', lineHeight: 1.68 }}>
              Harbored is always watching for the moments your network deserves acknowledgment.
            </p>
          </Reveal>

          <RevealGroup style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {EVENTS.map(({ key, icon, label, desc }) => (
              <motion.div key={key} variants={fadeUp} custom={0}
                style={{ padding: 'clamp(20px, 2.8vw, 28px)', background: '#fff', borderRadius: 12, border: '1px solid #ede8de', transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(10,22,40,0.08)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = '#d4b88a'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#ede8de'; }}
              >
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(200,136,46,0.08)', border: '1px solid rgba(200,136,46,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>{icon}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(15px, 1.7vw, 17px)', fontWeight: 600, marginBottom: 8, color: C.navy, lineHeight: 1.3 }}>{label}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 13, lineHeight: 1.65, color: '#6b7280' }}>{desc}</div>
              </motion.div>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ══════════════════ YOUR VOICE ══════════════════ */}
      <section id="your-voice" style={{ ...sec, background: '#fff' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'clamp(40px, 7vw, 80px)', alignItems: 'center' }}>
          <Reveal>
            <Label>AI Message Drafting</Label>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(30px, 4.5vw, 54px)', fontWeight: 500, lineHeight: 1.12, letterSpacing: '-0.025em', marginBottom: 20 }}>
              Your voice.<br />
              <em style={{ fontStyle: 'italic', color: C.gold }}>Not a robot's.</em>
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 'clamp(14px, 1.5vw, 17px)', color: '#4a5a70', lineHeight: 1.72, marginBottom: 28, maxWidth: 400 }}>
              Harbored learns how you talk. It reads your past messages, your tone, even the words you overuse — and drafts something you'd actually send.
            </p>
            {['Trained on your own message history', 'Sounds casual when you are, formal when you need to be', 'Editable before it goes — always your call', 'Auto-Send for the moments you want to stay effortless'].map(point => (
              <div key={point} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(200,136,46,0.12)', border: '1px solid rgba(200,136,46,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 400, color: '#374151', lineHeight: 1.55 }}>{point}</span>
              </div>
            ))}
            <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 16, color: '#4a5a70', marginTop: 28, maxWidth: 360, lineHeight: 1.6 }}>
              "Every message sounds like you — because it is."
            </p>
          </Reveal>
          <Reveal delay={0.15} style={{ display: 'flex', justifyContent: 'center' }}>
            <MockCard />
          </Reveal>
        </div>
      </section>

      {/* ══════════════════ NOTIFY YOU, YOUR WAY ══════════════════ */}
      <section style={{ ...sec, background: C.navy, textAlign: 'center' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <Reveal>
            <Label light center>Notifications</Label>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(30px, 4.5vw, 54px)', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.025em', color: '#fdf8ee', marginBottom: 16 }}>
              Get notified however you<br />
              <em style={{ fontStyle: 'italic', color: C.goldPale }}>actually pay attention.</em>
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 'clamp(14px, 1.6vw, 17px)', color: 'rgba(253,248,238,0.52)', maxWidth: 440, margin: '0 auto 56px', lineHeight: 1.68 }}>
              Set your preference per contact, per event type, or all at once. Harbored fits into your life — not the other way around.
            </p>
          </Reveal>

          <RevealGroup style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(16px, 4vw, 48px)', flexWrap: 'wrap', marginBottom: 48 }}>
            {CHANNELS.map(({ name, icon }) => (
              <motion.div key={name} variants={fadeUp} custom={0}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', minWidth: 100, transition: 'background 0.2s ease, border-color 0.2s ease, transform 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(200,136,46,0.3)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {icon}
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: 'rgba(253,248,238,0.6)', whiteSpace: 'nowrap' }}>{name}</span>
              </motion.div>
            ))}
          </RevealGroup>

          <Reveal delay={0.1}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', background: 'rgba(200,136,46,0.1)', border: '1px solid rgba(200,136,46,0.2)', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 400, color: 'rgba(253,248,238,0.6)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              You control frequency — daily digest, real-time, or weekly summary
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════ PRICING ══════════════════ */}
      <section id="pricing" style={{ ...sec, background: C.cream }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: 'clamp(48px, 7vw, 72px)' }}>
            <Label center>Pricing</Label>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(30px, 4.5vw, 54px)', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 14 }}>
              Simple, honest pricing.
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 16, color: '#4a5a70', lineHeight: 1.65 }}>Start free. Upgrade when you're ready.</p>
          </Reveal>

          <RevealGroup style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 20 }}>
            {/* Free */}
            <motion.div variants={fadeUp} custom={0}>
              <div style={{ background: '#fff', border: '1px solid #e8e0d0', borderRadius: 16, padding: 'clamp(28px, 4vw, 40px)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted, marginBottom: 10 }}>Free</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 600, color: C.navy, lineHeight: 1 }}>$0<span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 16, color: C.faint }}>/mo</span></div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 13, color: '#6b7280', marginTop: 10, lineHeight: 1.5 }}>A great way to see how Harbored works before going all in.</p>
                </div>
                <div style={{ borderTop: '1px solid #f0ece4', paddingTop: 24, flex: 1 }}>
                  {['Monitor up to 25 contacts', 'Email notifications', 'Manual send only', 'Basic event detection'].map(f => (
                    <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#374151' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={openModal} style={{ display: 'block', marginTop: 28, padding: '13px', textAlign: 'center', background: 'transparent', border: '1px solid #0a1628', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, color: C.navy, cursor: 'pointer', transition: 'background 0.18s, color 0.18s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.navy; e.currentTarget.style.color = '#fdf8ee'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.navy; }}>
                  Start Free
                </button>
              </div>
            </motion.div>

            {/* Pro */}
            <motion.div variants={fadeUp} custom={0.1}>
              <div style={{ background: C.navy, border: `2px solid ${C.gold}`, borderRadius: 16, padding: 'clamp(28px, 4vw, 40px)', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 22, right: 22, padding: '4px 12px', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, borderRadius: 20, fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.navy }}>Most Popular</div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.goldPale, marginBottom: 10, opacity: 0.8 }}>Harbored Pro</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 600, color: '#fdf8ee', lineHeight: 1 }}>$12<span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 16, color: 'rgba(253,248,238,0.45)' }}>/mo</span></div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 13, color: 'rgba(253,248,238,0.5)', marginTop: 10, lineHeight: 1.5 }}>For professionals who want their relationships to keep up with their careers.</p>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, flex: 1 }}>
                  {['Unlimited contacts', 'All notification channels', 'AI message drafting', 'Auto-Send mode', 'Priority event detection', 'Custom message tone profiles'].map(f => (
                    <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.goldPale} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'rgba(253,248,238,0.78)' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={openModal} style={{ display: 'block', marginTop: 28, padding: '14px', textAlign: 'center', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, borderRadius: 8, fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: C.navy, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(200,136,46,0.4)', transition: 'opacity 0.18s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  Get Harbored Pro
                </button>
              </div>
            </motion.div>
          </RevealGroup>
        </div>
      </section>

      {/* ══════════════════ TESTIMONIALS ══════════════════ */}
      <section style={{ ...sec, background: `linear-gradient(180deg, #fdf8f0 0%, ${C.cream} 100%)`, borderTop: '1px solid #ede8de' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: 'clamp(48px, 7vw, 72px)' }}>
            <Label center>Real People</Label>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(30px, 4.5vw, 54px)', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.025em' }}>
              Thoughtful people.<br />
              <em style={{ fontStyle: 'italic', color: C.gold }}>Busy schedules.</em>
            </h2>
          </Reveal>

          <RevealGroup style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              { quote: "I got a text from Harbored saying my old manager just made partner. I sent her a message in 10 seconds. She replied within the hour. That's a relationship I almost let go cold.", name: 'Jake M.', role: 'Account Executive', avatar: 'https://i.pravatar.cc/80?img=11' },
              { quote: 'I turned on Auto-Send for birthdays and work anniversaries. People think I\'m incredibly thoughtful. I\'m just busy.', name: 'Priya S.', role: 'Product Manager', avatar: 'https://i.pravatar.cc/80?img=46' },
              { quote: "I've reconnected with 6 people from my first job in the last 3 months. Harbored noticed things I completely missed.", name: 'Connor B.', role: 'Associate, Goldman Sachs', avatar: 'https://i.pravatar.cc/80?img=53' },
            ].map(({ quote, name, role, avatar }) => (
              <motion.div key={name} variants={fadeUp} custom={0}>
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ede8de', padding: 'clamp(26px, 3.5vw, 38px)', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 28, bottom: 28, width: 3, borderRadius: '0 2px 2px 0', background: `linear-gradient(180deg, ${C.gold}, ${C.goldLight})` }} />
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 64, lineHeight: 0.7, color: C.goldPale, marginBottom: 18, opacity: 0.7, userSelect: 'none' }}>"</div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 'clamp(13.5px, 1.4vw, 15.5px)', fontStyle: 'italic', lineHeight: 1.74, color: '#374151', flex: 1, marginBottom: 24 }}>{quote}</p>
                  <div style={{ height: 1, background: '#f0ece4', marginBottom: 20 }} />
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <img src={avatar} alt={name} width={42} height={42} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, color: C.navy }}>{name}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 12, color: C.faint, marginTop: 2 }}>{role}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ══════════════════ CTA ══════════════════ */}
      <section id="get-started" style={{ padding: 'clamp(88px, 13vw, 148px) clamp(20px, 6vw, 80px)', background: C.navy, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <svg aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, width: '100%', opacity: 0.06, pointerEvents: 'none' }} viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,50 C300,90 600,10 900,50 C1200,90 1440,30 1440,50 L1440,0 L0,0 Z" fill={C.gold}/>
        </svg>
        <Reveal>
          <Label light center>Get Started</Label>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(36px, 6vw, 76px)', fontWeight: 500, lineHeight: 1.08, letterSpacing: '-0.025em', color: '#fdf8ee', maxWidth: 640, margin: '0 auto 18px' }}>
            Always in your corner.
          </h2>
          <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 'clamp(15px, 1.7vw, 18px)', color: 'rgba(253,248,238,0.48)', maxWidth: 380, margin: '0 auto 48px', lineHeight: 1.65 }}>
            Join the waitlist. Be the first to show up when it counts.
          </p>
          <button
            onClick={openModal}
            style={{
              padding: '16px 44px',
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
              color: C.navy,
              fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15,
              letterSpacing: '0.02em',
              border: 'none', borderRadius: 2, cursor: 'pointer',
              boxShadow: '0 6px 28px rgba(200,136,46,0.45)',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 36px rgba(200,136,46,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(200,136,46,0.45)'; }}
          >
            Join the Waitlist
          </button>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(253,248,238,0.24)', marginTop: 18 }}>
            No credit card. No spam. Cancel anytime.
          </p>
        </Reveal>
      </section>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer style={{ background: '#060c18', padding: 'clamp(40px, 6vw, 60px) clamp(20px, 6vw, 80px) clamp(24px, 4vw, 32px)', color: 'rgba(253,248,238,0.36)' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 36, marginBottom: 40 }}>
            <div style={{ maxWidth: 240 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 600, color: '#fdf8ee', marginBottom: 6 }}>⚓ Harbored</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 300, color: 'rgba(253,248,238,0.4)', lineHeight: 1.5 }}>Always in your corner.</div>
            </div>
            <div style={{ display: 'flex', gap: 'clamp(28px, 5vw, 72px)', flexWrap: 'wrap' }}>
              {[
                { heading: 'Product', links: ['How It Works', 'Pricing', 'Features'] },
                { heading: 'Company', links: ['About', 'Blog', 'Contact'] },
                { heading: 'Legal',   links: ['Privacy', 'Terms'] },
              ].map(({ heading, links }) => (
                <div key={heading}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(253,248,238,0.22)', marginBottom: 16 }}>{heading}</div>
                  {links.map(l => (
                    <div key={l} style={{ marginBottom: 10 }}>
                      <a href="#" style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 300, color: 'rgba(253,248,238,0.4)', textDecoration: 'none', transition: 'color 0.18s' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'rgba(253,248,238,0.8)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(253,248,238,0.4)'}
                      >{l}</a>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 300 }}>© 2026 Harbored, Inc. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 20 }}>
              {[
                { label: 'X', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L2.25 2.25h6.988l4.26 5.633 4.746-5.633Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z', fill: true },
                { label: 'LinkedIn', path: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z', fill: false },
                { label: 'Instagram', path: null, fill: false },
              ].map(({ label, path, fill }) => (
                <a key={label} href="#" aria-label={label} style={{ color: 'rgba(253,248,238,0.3)', transition: 'color 0.18s', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(245,197,106,0.8)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(253,248,238,0.3)'}
                >
                  {label === 'Instagram' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
                    </svg>
                  ) : label === 'LinkedIn' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                      <rect x="2" y="9" width="4" height="12"/>
                      <circle cx="4" cy="4" r="2"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={path}/></svg>
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ══════════════════ MODAL ══════════════════ */}
      <WaitlistModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <style>{`
        @media (min-width: 768px) { .nav-link { display: inline !important; } }
        ::placeholder { color: rgba(253,248,238,0.28); }
        @keyframes bobVertical { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
      `}</style>
    </div>
  );
}
