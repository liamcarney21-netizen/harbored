/* eslint-disable react/no-unknown-property */

export default function LakeScene({ onCtaClick }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100svh',
        minHeight: 640,
        overflow: 'hidden',
        background: '#0A0F1E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >

      {/* ── Grain / noise texture ── */}
      <svg
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: 1,
        }}
      >
        <filter id="hero-grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.68 0.72"
            numOctaves="4"
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix type="saturate" values="0" in="noise" result="grey"/>
          <feBlend in="SourceGraphic" in2="grey" mode="screen" result="blend"/>
          <feComposite in="blend" in2="SourceGraphic" operator="in"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#hero-grain)" opacity="0.055"/>
      </svg>

      {/* ── Ambient depth — left deep-blue bloom ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 70% at 12% 62%, rgba(18,44,82,0.55) 0%, transparent 100%)',
        }}
      />

      {/* ── Faint gold horizon glow (bottom centre) ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: '80%', height: '50%',
          zIndex: 1, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center bottom, rgba(200,130,40,0.09) 0%, transparent 68%)',
        }}
      />

      {/* ── Sailboat watermark — static, bottom-right ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 44,
          right: 56,
          opacity: 0.14,
          zIndex: 2,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <svg
          width="108" height="128"
          viewBox="0 0 108 128"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
        >
          {/* Mast — slight aft rake */}
          <line x1="53" y1="6" x2="55" y2="95"
            stroke="white" strokeWidth="2.2" strokeLinecap="round"/>

          {/* Spreader */}
          <line x1="33" y1="54" x2="75" y2="54"
            stroke="white" strokeWidth="1.4" strokeLinecap="round"/>

          {/* Forestay */}
          <line x1="53" y1="8" x2="98" y2="97"
            stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.6"/>

          {/* Backstay */}
          <line x1="53" y1="8" x2="14" y2="93"
            stroke="white" strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>

          {/* Upper shrouds */}
          <line x1="53" y1="8" x2="33" y2="54"
            stroke="white" strokeWidth="0.7" strokeLinecap="round" opacity="0.45"/>
          <line x1="53" y1="8" x2="75" y2="54"
            stroke="white" strokeWidth="0.7" strokeLinecap="round" opacity="0.45"/>

          {/* Lower shrouds */}
          <line x1="33" y1="54" x2="24" y2="95"
            stroke="white" strokeWidth="0.7" strokeLinecap="round" opacity="0.4"/>
          <line x1="75" y1="54" x2="84" y2="95"
            stroke="white" strokeWidth="0.7" strokeLinecap="round" opacity="0.4"/>

          {/* Mainsail — curved leech */}
          <path
            d="M53,10 Q54,50 55,91 L14,79 Q8,62 13,44 Q22,24 53,10 Z"
            fill="white" fillOpacity="0.88"
          />

          {/* Batten lines */}
          <line x1="54" y1="32" x2="28" y2="41" stroke="white" strokeOpacity="0.2" strokeWidth="0.8"/>
          <line x1="54" y1="54" x2="20" y2="62" stroke="white" strokeOpacity="0.2" strokeWidth="0.8"/>
          <line x1="54" y1="75" x2="17" y2="80" stroke="white" strokeOpacity="0.2" strokeWidth="0.8"/>

          {/* Boom */}
          <line x1="55" y1="91" x2="16" y2="97"
            stroke="white" strokeWidth="1.8" strokeLinecap="round"/>

          {/* Jib */}
          <path
            d="M53,12 L98,97 Q84,88 72,79 Q63,67 58,48 Q55,30 53,12 Z"
            fill="white" fillOpacity="0.65"
          />

          {/* Keel */}
          <path d="M44,103 L54,114 L64,103 Z" fill="white" fillOpacity="0.7"/>

          {/* Hull */}
          <path
            d="M13,99 Q54,108 95,99 L91,103 Q54,112 17,103 Z"
            fill="white"
          />

          {/* Gold waterline stripe */}
          <path
            d="M15,103 Q54,110 93,103"
            stroke="rgba(10,102,194,0.5)" strokeWidth="1.2"
            fill="none" strokeLinecap="round"
          />

          {/* Pennant */}
          <polygon points="53,6 67,11 53,16" fill="white" fillOpacity="0.85"/>
        </svg>
      </div>

      {/* ── Hero content ── */}
      <div
        style={{
          position: 'relative', zIndex: 10,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', textAlign: 'center',
          padding: '66px clamp(20px, 6vw, 80px) 0',
          width: '100%', maxWidth: 940,
        }}
      >
        {/* Eyebrow label */}
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 11, fontWeight: 600,
            letterSpacing: '0.36em', textTransform: 'uppercase',
            color: '#0A66C2',
            marginBottom: 28,
            animation: 'fadeUp 0.7s 0.05s ease both',
          }}
        >
          Network Intelligence
        </div>

        {/* Main headline */}
        <h1
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 500,
            fontSize: 'clamp(46px, 8.2vw, 112px)',
            lineHeight: 1.03,
            letterSpacing: '-0.03em',
            color: '#F8FAFC',
            margin: '0 auto 26px',
            animation: 'fadeUp 0.85s 0.15s ease both',
          }}
        >
          Your network is growing.<br />
          <em style={{ fontStyle: 'italic' }}>Don't lose touch.</em>
        </h1>

        {/* Subheadline */}
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 300,
            fontSize: 'clamp(15px, 1.75vw, 19px)',
            color: 'rgba(248,250,252,0.48)',
            maxWidth: 530,
            lineHeight: 1.74,
            letterSpacing: '0.01em',
            marginBottom: 48,
            animation: 'fadeUp 0.85s 0.28s ease both',
          }}
        >
          Harbored tracks the moments that matter — promotions, milestones,
          life events — and helps you show up every time.
        </p>

        {/* CTA buttons */}
        <div
          style={{
            display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center',
            marginBottom: 28,
            animation: 'fadeUp 0.85s 0.4s ease both',
          }}
        >
          <button
            onClick={onCtaClick}
            style={{
              padding: '15px 40px',
              background: 'linear-gradient(135deg, #0A66C2, #378FE9)',
              color: '#0a0f1e',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600, fontSize: 14,
              letterSpacing: '0.03em',
              border: 'none', borderRadius: 2,
              cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(10,102,194,0.36)',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 36px rgba(10,102,194,0.58)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(10,102,194,0.36)';
            }}
          >
            Get Early Access
          </button>

          <a
            href="#how-it-works"
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '14px 34px',
              background: 'transparent',
              color: 'rgba(248,250,252,0.7)',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400, fontSize: 14,
              letterSpacing: '0.03em',
              textDecoration: 'none',
              border: '1px solid rgba(248,250,252,0.2)',
              borderRadius: 2,
              transition: 'border-color 0.18s ease, color 0.18s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(248,250,252,0.52)';
              e.currentTarget.style.color = '#F8FAFC';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(248,250,252,0.2)';
              e.currentTarget.style.color = 'rgba(248,250,252,0.7)';
            }}
          >
            See How It Works
          </a>
        </div>

        {/* Social proof */}
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 300, fontSize: 12,
            color: 'rgba(248,250,252,0.25)',
            letterSpacing: '0.02em',
            animation: 'fadeUp 0.85s 0.52s ease both',
          }}
        >
          Trusted by professionals at Goldman Sachs, Stripe, Google, and more.
        </div>
      </div>
    </div>
  );
}
