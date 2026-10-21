import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { T } from './tokens'

const FOCUSABLE = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'

// The app's one modal. A real dialog: labelled, focus moves in on open and
// back out on close, Escape closes, Tab stays inside. On phones it sits at
// the bottom like a sheet; on wider screens it centers.
export default function Sheet({ open, onClose, title, sub, icon, children, footer, width = 520, zIndex = 60 }) {
  const panelRef = useRef(null)
  const restoreRef = useRef(null)

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement
    const panel = panelRef.current
    const first = panel?.querySelector(FOCUSABLE)
    ;(first || panel)?.focus?.()
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.() }
      if (e.key === 'Tab' && panel) {
        const items = [...panel.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null)
        if (!items.length) return
        const firstEl = items[0], lastEl = items[items.length - 1]
        if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus() }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      restoreRef.current?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex, background: 'rgba(4,10,22,0.62)', backdropFilter: 'blur(3px)' }}
          />
          <div style={{
            position: 'fixed', inset: 0, zIndex: zIndex + 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px 16px', pointerEvents: 'none',
          }}>
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={typeof title === 'string' ? title : undefined}
              tabIndex={-1}
              initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              style={{
                pointerEvents: 'auto', outline: 'none',
                width: `min(${width}px, 100%)`, maxHeight: '100%', display: 'flex', flexDirection: 'column',
                background: T.card, borderRadius: 16, border: `1px solid ${T.hairline}`,
                boxShadow: '0 18px 50px -12px rgba(0,0,0,0.6)', fontFamily: T.font,
              }}
            >
              {(title || icon) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px', borderBottom: `1px solid ${T.hairline}`, flexShrink: 0 }}>
                  {icon && (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.accentSoft, color: T.accent, flexShrink: 0 }}>
                      {icon}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {title && <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{title}</div>}
                    {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 2, lineHeight: 1.45 }}>{sub}</div>}
                  </div>
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close"
                      className="hb-press"
                      style={{ width: 40, height: 40, margin: '-8px -10px -8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: T.muted, borderRadius: 10 }}
                    >
                      <X style={{ width: 17, height: 17 }} />
                    </button>
                  )}
                </div>
              )}
              <div style={{ padding: 20, overflowY: 'auto', minHeight: 0 }}>{children}</div>
              {footer && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: `1px solid ${T.hairline}`, flexShrink: 0 }}>
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
