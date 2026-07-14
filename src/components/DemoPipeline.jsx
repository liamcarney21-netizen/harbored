import { motion } from 'framer-motion'
import { Smartphone, Radar, Zap, ChevronRight, X } from 'lucide-react'

// Demo-only "how it works" strip. Ties the three moving parts into one legible
// story for a first-time viewer: Apple Contacts in → shared themes → Claude
// scores each update and drafts the message. Step 1 opens the real import modal.
const STEPS = [
  {
    n: 1,
    Icon: Smartphone,
    title: 'Bring in your people',
    body: 'Import straight from Apple Contacts — a .vcf export or your phone’s picker.',
    action: true,
  },
  {
    n: 2,
    Icon: Radar,
    title: 'Name what you share',
    body: 'Tell Harbored the themes you have in common — a team, a city, a market.',
  },
  {
    n: 3,
    Icon: Zap,
    title: 'Claude watches & scores',
    body: 'It reads the news per theme and scores each update — you only hear about what clears the bar, message drafted.',
  },
]

function Step({ step, onImport }) {
  const { Icon, title, body, n, action } = step
  const inner = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
          background: 'rgba(13,92,99,0.08)', color: '#0D5C63',
        }}>
          <Icon style={{ width: '13px', height: '13px' }} />
        </span>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#A97E2F' }}>
          STEP {n}
        </span>
      </div>
      <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1C2B33', marginBottom: '3px' }}>
        {title}
      </div>
      <p style={{ fontSize: '12px', color: '#5C6B73', lineHeight: 1.5 }}>{body}</p>
      {action && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11.5px', fontWeight: 600, color: '#0D5C63', marginTop: '7px' }}>
          Try it <ChevronRight style={{ width: '12px', height: '12px' }} />
        </span>
      )}
    </>
  )
  if (action) {
    return (
      <button
        onClick={onImport}
        style={{
          flex: '1 1 180px', minWidth: '160px', textAlign: 'left',
          background: 'rgba(13,92,99,0.03)', border: '1px solid rgba(13,92,99,0.18)',
          borderRadius: '10px', padding: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(13,92,99,0.07)'; e.currentTarget.style.borderColor = 'rgba(13,92,99,0.35)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(13,92,99,0.03)'; e.currentTarget.style.borderColor = 'rgba(13,92,99,0.18)' }}
      >
        {inner}
      </button>
    )
  }
  return (
    <div style={{ flex: '1 1 180px', minWidth: '160px', padding: '14px' }}>
      {inner}
    </div>
  )
}

export default function DemoPipeline({ onImport, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: '#FFFFFF', border: '1px solid #E6E2D8', borderRadius: '14px',
        padding: '18px 20px', marginBottom: '24px', fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5C6B73' }}>
          How Harbored works
        </span>
        <button
          onClick={onDismiss}
          aria-label="Dismiss walkthrough"
          style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: '#5C6B73', padding: '2px', opacity: 0.7, flexShrink: 0 }}
        >
          <X style={{ width: '14px', height: '14px' }} />
        </button>
      </div>
      <p style={{ fontSize: '13px', color: '#3E4B52', lineHeight: 1.55, marginBottom: '16px', maxWidth: '620px' }}>
        Staying close from a distance is hard when you can't see what's happening in someone's
        world — so you go quiet, or reach out sounding out of touch. Harbored watches the things
        you share and tells you when there's a real reason to reconnect.
      </p>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: '10px', flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => (
          <div key={s.n} style={{ display: 'contents' }}>
            <Step step={s} onImport={onImport} />
            {i < STEPS.length - 1 && (
              <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', color: '#CFC8B8', flexShrink: 0 }}>
                <ChevronRight style={{ width: '16px', height: '16px' }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <p style={{ fontSize: '11.5px', color: '#5C6B73', opacity: 0.85, marginTop: '14px' }}>
        The opportunities below are a live example — a seeded network already through all three steps.
      </p>
    </motion.div>
  )
}
