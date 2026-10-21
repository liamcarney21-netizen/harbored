import { AnimatePresence, motion } from 'framer-motion'
import { T } from './tokens'
import { useToast } from './toastStore'

export function ToastHost() {
  const toast = useToast(s => s.toast)
  const hide = useToast(s => s.hide)
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed', left: '50%', transform: 'translateX(-50%)',
            bottom: 'calc(env(safe-area-inset-bottom) + 84px)', zIndex: 90,
            display: 'flex', alignItems: 'center', gap: 14, maxWidth: 'min(440px, calc(100vw - 32px))',
            padding: '12px 16px', borderRadius: 12, background: T.raised, color: T.ink,
            border: `1px solid ${T.hairlineStrong}`, boxShadow: '0 12px 30px -10px rgba(0,0,0,0.6)',
            fontFamily: T.font, fontSize: 13,
          }}
        >
          <span style={{ minWidth: 0 }}>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="hb-press"
              onClick={() => { toast.onAction?.(); hide() }}
              style={{ background: 'none', border: 'none', color: T.accent, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: '6px 2px', flexShrink: 0 }}
            >
              {toast.action}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
