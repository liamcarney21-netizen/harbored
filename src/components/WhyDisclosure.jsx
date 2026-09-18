import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SIGNIFICANCE_THRESHOLD } from '../data/commonGround'

const INK = '#F5F4EF'
const MUTED = '#8C9AAD'
const ACCENT = '#D3A95C'
const HAIRLINE = 'rgba(255,255,255,0.08)'

// The reasoning behind a reason, one tap away. Every card asserts "this
// cleared the bar" — this is where that claim shows its work: the tide-line
// gauge against the threshold, the scorer's own one-sentence judgment, and
// the signals that moved it. Trust in the push is the whole product; this is
// the receipt.
export default function WhyDisclosure({ update, kind, style }) {
  const [open, setOpen] = useState(false)
  if (!update || typeof update.score !== 'number') return null

  const above = kind !== 'favor'
  const label = above ? 'Why this cleared the bar' : 'Why it stayed below the bar'
  const points = above ? update.factors : (update.holdReason ? [update.holdReason] : null)

  return (
    <div style={style}>
      <button
        className="hb-press"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '32px',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontSize: '12px', color: MUTED, fontFamily: 'inherit', textDecoration: 'underline',
          textUnderlineOffset: '3px', textDecorationColor: 'rgba(140,154,173,0.5)',
        }}
      >
        {label}
        <svg
          width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              marginTop: '10px', padding: '14px 16px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${HAIRLINE}`,
            }}>
              {/* Tide line — significance against the reach-out bar */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED }}>
                  Significance
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: above ? ACCENT : MUTED, fontVariantNumeric: 'tabular-nums' }}>
                  {update.score}
                  <span style={{ fontWeight: 400, color: MUTED }}> / bar {SIGNIFICANCE_THRESHOLD}</span>
                </span>
              </div>
              <div style={{ position: 'relative', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.09)', marginTop: '9px', overflow: 'visible' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, update.score)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                  style={{
                    height: '100%', borderRadius: '3px',
                    background: above ? ACCENT : 'rgba(211,169,92,0.45)',
                  }}
                />
                <div style={{
                  position: 'absolute', top: '-3px', bottom: '-3px', width: '2px', borderRadius: '1px',
                  left: `${SIGNIFICANCE_THRESHOLD}%`, background: 'rgba(245,244,239,0.55)',
                }} />
              </div>

              {/* The scorer's own sentence on this one */}
              {update.rationale && (
                <p className="hb-display" style={{ fontStyle: 'italic', fontSize: '13px', lineHeight: 1.55, color: '#C2CBD8', margin: '12px 0 0' }}>
                  {update.rationale}
                </p>
              )}

              {points && points.length > 0 && (
                <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {points.map((f, i) => (
                    <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', lineHeight: 1.5, color: MUTED }}>
                      <span style={{ color: above ? ACCENT : MUTED, flexShrink: 0 }}>·</span>
                      <span style={{ minWidth: 0 }}>{f}</span>
                    </li>
                  ))}
                </ul>
              )}

              {(update.source || update.time) && (
                <div style={{ fontSize: '11px', color: MUTED, marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${HAIRLINE}` }}>
                  {[update.source, update.time && `found ${update.time}`].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
