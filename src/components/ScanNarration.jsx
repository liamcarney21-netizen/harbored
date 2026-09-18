import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// While the scan runs, narrate it with the user's own themes — "Reading
// Wake Forest coverage…" — so the wait reads as Harbored actually working
// through their people, not a generic spinner. Lines rotate on a calm cadence
// and never repeat back-to-back.
export default function ScanNarration({ contacts = [], themesByContact = {}, style }) {
  const lines = useMemo(() => {
    const out = []
    for (const contact of contacts) {
      const first = (contact.name || '').split(' ')[0]
      for (const theme of themesByContact[contact.id] || []) {
        out.push(`Reading ${theme.label} coverage…`)
        if (first) out.push(`Checking what's new for ${first}…`)
      }
    }
    // De-dupe (shared themes, repeat names) while keeping order, then shuffle
    // lightly so consecutive scans don't narrate identically.
    const unique = [...new Set(out)]
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[unique[i], unique[j]] = [unique[j], unique[i]]
    }
    unique.push('Scoring what surfaced…')
    return unique.length > 1 ? unique : ['Checking the news on everything you share.']
  }, [contacts, themesByContact])

  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (lines.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % lines.length), 1900)
    return () => clearInterval(t)
  }, [lines])

  return (
    <div style={{ minHeight: '22px', ...style }}>
      <AnimatePresence mode="wait">
        <motion.p
          key={lines[idx]}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ fontSize: '14px', lineHeight: 1.6, color: '#C2CBD8', margin: 0 }}
        >
          {lines[idx]}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
