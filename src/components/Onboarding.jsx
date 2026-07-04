import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Anchor, Compass, Gauge, Bell, TrendingUp, ArrowRight, ArrowLeft, Check } from 'lucide-react'

const STEPS = [
  {
    icon: Anchor,
    kicker: 'Welcome to Harbored',
    title: 'Your network is your most valuable asset.',
    body: "And it erodes quietly. The promotions you never congratulated, the moves you never acknowledged, the people who slowly became strangers. Harbored exists so that never happens — it watches over the relationships your career is built on, and tells you exactly when to show up.",
    visual: null,
  },
  {
    icon: Compass,
    kicker: 'The heart of Harbored',
    title: 'Common Ground',
    body: "For every person who matters, tell Harbored what you have in common — a team you both follow, a city you both love, a market you both watch. These shared themes become standing reasons to talk. This is where your network stops being a list of names and becomes a set of living connections.",
    visual: 'themes',
  },
  {
    icon: Gauge,
    kicker: 'Signal, not noise',
    title: 'We only interrupt you when it matters.',
    body: "Harbored monitors every shared theme around the clock and scores each development for significance. Routine news gets logged quietly. Only updates that clear the reach-out bar arrive at your door — with the message already drafted in your voice. You decide with one click.",
    visual: 'gauge',
  },
  {
    icon: Bell,
    kicker: 'Never miss a moment',
    title: 'Every milestone, caught.',
    body: "Promotions, new roles, engagements, moves — Alerts detects the life events happening across your network, and Messages keeps a record of every outreach you make. The moments that strengthen a relationship are fleeting. Harbored makes sure you're there for them.",
    visual: null,
  },
  {
    icon: TrendingUp,
    kicker: 'Watch it compound',
    title: 'Relationships, measured.',
    body: "My Network shows you the health of every relationship — who's strong, who's cooling, who's at risk of drifting away. Analytics proves the return of showing up consistently. Small, well-timed gestures compound into a network that works for you. Start now by adding the first person worth staying close to.",
    visual: null,
  },
]

function ThemesVisual() {
  const chips = ['Villanova Basketball', 'Pickleball in Charleston', 'Minneapolis Real Estate']
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
      {chips.map((c, i) => (
        <motion.span
          key={c}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.15, duration: 0.3 }}
          style={{
            padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
            background: 'rgba(13,92,99,0.08)', color: '#0D5C63',
            border: '1px solid rgba(13,92,99,0.2)', fontFamily: 'Inter, sans-serif',
          }}
        >
          {c}
        </motion.span>
      ))}
    </div>
  )
}

function GaugeVisual() {
  return (
    <div style={{ maxWidth: '300px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', color: '#5C6B73', fontFamily: 'Inter, sans-serif' }}>Significance</span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          style={{ fontSize: '13px', fontWeight: 700, color: '#0D5C63', fontFamily: 'Inter, sans-serif' }}
        >
          92 — worth reaching out
        </motion.span>
      </div>
      <div style={{ position: 'relative', height: '6px', borderRadius: '3px', background: '#E5E1D7' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '92%' }}
          transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #0D5C63 55%, #A97E2F)' }}
        />
        <div style={{ position: 'absolute', left: '70%', top: '-4px', width: '2px', height: '14px', background: 'rgba(29,34,38,0.4)', borderRadius: '1px' }} />
      </div>
      <div style={{ fontSize: '11px', color: '#5C6B73', marginTop: '6px', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>
        Reach-out threshold: 70
      </div>
    </div>
  )
}

export default function Onboarding({ onFinish }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(29,34,38,0.6)', backdropFilter: 'blur(4px)',
        padding: '24px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          width: '100%', maxWidth: '560px', borderRadius: '16px',
          background: '#FFFFFF', boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #EEEBE3' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Anchor style={{ width: '14px', height: '14px', color: '#0D5C63' }} />
            <span style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '16px', fontWeight: 600, color: '#1C2B33' }}>Harbored</span>
          </div>
          <button
            onClick={onFinish}
            style={{ fontSize: '12px', fontWeight: 500, color: '#5C6B73', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
          >
            Skip tour
          </button>
        </div>

        {/* Step content */}
        <div style={{ padding: '40px 40px 32px', minHeight: '320px', display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1 }}
            >
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(13,92,99,0.08)', marginBottom: '20px',
              }}>
                <Icon style={{ width: '26px', height: '26px', color: '#0D5C63' }} />
              </div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, color: '#0D5C63', marginBottom: '10px' }}>
                {current.kicker}
              </div>
              <h2 style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '24px', fontWeight: 600, color: '#1C2B33', marginBottom: '14px', lineHeight: 1.3 }}>
                {current.title}
              </h2>
              <p style={{ fontSize: '14px', lineHeight: 1.65, color: '#5C6B73', maxWidth: '440px', marginBottom: current.visual ? '24px' : 0 }}>
                {current.body}
              </p>
              {current.visual === 'themes' && <ThemesVisual />}
              {current.visual === 'gauge' && <GaugeVisual />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderTop: '1px solid #EEEBE3' }}>
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            aria-label="Previous step"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              background: 'none', border: '1px solid #DEDACF', cursor: step === 0 ? 'default' : 'pointer',
              color: step === 0 ? '#C6C0B3' : '#3E4B52', fontFamily: 'Inter, sans-serif',
              opacity: step === 0 ? 0.6 : 1, transition: 'all 0.15s',
            }}
          >
            <ArrowLeft style={{ width: '13px', height: '13px' }} /> Back
          </button>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '8px' }} role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                style={{
                  width: i === step ? '20px' : '7px', height: '7px', borderRadius: '4px',
                  background: i === step ? '#0D5C63' : i < step ? 'rgba(13,92,99,0.4)' : '#DEDACF',
                  border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.25s ease',
                }}
              />
            ))}
          </div>

          <button
            onClick={() => (isLast ? onFinish(true) : setStep(s => s + 1))}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              background: '#0D5C63', color: '#FFFFFF', border: 'none', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#09454B'}
            onMouseLeave={e => e.currentTarget.style.background = '#0D5C63'}
          >
            {isLast ? (
              <>Add your first contact <Check style={{ width: '13px', height: '13px' }} /></>
            ) : (
              <>Continue <ArrowRight style={{ width: '13px', height: '13px' }} /></>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
