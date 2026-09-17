import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Compass, Gauge, TrendingUp, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import AnchorMark from './AnchorMark'

const STEPS = [
  {
    icon: AnchorMark,
    kicker: 'How Harbored works',
    title: 'Going quiet is never on purpose.',
    body: "You don't stop caring about people — you just stop knowing when to reach out, and what to say that doesn't feel random. Harbored fixes exactly that part: it finds you a real reason, and writes the first draft.",
    visual: null,
  },
  {
    icon: Compass,
    kicker: 'Step one',
    title: 'Tell it what you share.',
    body: "For each person, tap what connects you — a team you both follow, a city, a market, a hobby. Or just talk about them out loud and Harbored maps it. Those themes become standing reasons to stay in touch.",
    visual: 'themes',
  },
  {
    icon: Gauge,
    kicker: 'Step two',
    title: 'Harbored keeps watch.',
    body: "It follows your themes in the news around the clock and scores everything it finds. Routine coverage is logged quietly. Only the things genuinely worth a message reach you — as a front page written about your people.",
    visual: 'gauge',
  },
  {
    icon: TrendingUp,
    kicker: 'Step three',
    title: 'You send it — nothing sends itself.',
    body: "Every reason comes with a short message already drafted. It opens in your own Messages or Mail; you can edit or toss it. And when someone's been quiet too long, Harbored quietly nudges before they drift. Start by bringing in a few of your people.",
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
            background: 'rgba(211,169,92,0.08)', color: '#D3A95C',
            border: '1px solid rgba(211,169,92,0.2)', fontFamily: 'Inter, sans-serif',
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
        <span style={{ fontSize: '11px', color: '#8C9AAD', fontFamily: 'Inter, sans-serif' }}>Significance</span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          style={{ fontSize: '13px', fontWeight: 700, color: '#D3A95C', fontFamily: 'Inter, sans-serif' }}
        >
          92 — worth reaching out
        </motion.span>
      </div>
      <div style={{ position: 'relative', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.12)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '92%' }}
          transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #D3A95C 55%, #D3A95C)' }}
        />
        <div style={{ position: 'absolute', left: '70%', top: '-4px', width: '2px', height: '14px', background: 'rgba(29,34,38,0.4)', borderRadius: '1px' }} />
      </div>
      <div style={{ fontSize: '11px', color: '#8C9AAD', marginTop: '6px', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>
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
          background: '#0f2040', boxShadow: '0 14px 44px -8px rgba(28,43,51,0.24), 0 3px 10px rgba(28,43,51,0.10)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AnchorMark size={14} color="#D3A95C" />
            <span style={{ fontFamily: '"Lora", Georgia, serif', fontSize: '16px', fontWeight: 600, color: '#F5F4EF' }}>Harbored</span>
          </div>
          <button
            onClick={onFinish}
            style={{ fontSize: '12px', fontWeight: 500, color: '#8C9AAD', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
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
                background: 'rgba(211,169,92,0.08)', marginBottom: '20px',
              }}>
                <Icon style={{ width: '26px', height: '26px', color: '#D3A95C' }} />
              </div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, color: '#D3A95C', marginBottom: '10px' }}>
                {current.kicker}
              </div>
              <h2 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: '24px', fontWeight: 600, color: '#F5F4EF', marginBottom: '14px', lineHeight: 1.3 }}>
                {current.title}
              </h2>
              <p style={{ fontSize: '14px', lineHeight: 1.65, color: '#8C9AAD', maxWidth: '440px', marginBottom: current.visual ? '24px' : 0 }}>
                {current.body}
              </p>
              {current.visual === 'themes' && <ThemesVisual />}
              {current.visual === 'gauge' && <GaugeVisual />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            aria-label="Previous step"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              background: 'none', border: '1px solid rgba(255,255,255,0.15)', cursor: step === 0 ? 'default' : 'pointer',
              color: step === 0 ? '#5B6880' : '#C2CBD8', fontFamily: 'Inter, sans-serif',
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
                  background: i === step ? '#D3A95C' : i < step ? 'rgba(211,169,92,0.4)' : 'rgba(255,255,255,0.18)',
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
              background: '#D3A95C', color: '#0a1628', border: 'none', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#C29245'}
            onMouseLeave={e => e.currentTarget.style.background = '#D3A95C'}
          >
            {isLast ? (
              <>Bring in your people <Check style={{ width: '13px', height: '13px' }} /></>
            ) : (
              <>Continue <ArrowRight style={{ width: '13px', height: '13px' }} /></>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
