// The one wait-state mark: Harbored's asterisk, softly breathing while the
// app works something out. Every "we're thinking" moment renders this —
// voice mapping, theme refining, scanning, account deletion — so a wait
// always reads as intent, never as a stall.
export default function ThinkingMark({ size = 16, label, spinning = false, style, labelStyle }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', ...style }}>
      <svg
        width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="#D3A95C" strokeWidth="2.4" strokeLinecap="round" aria-hidden
        style={{ animation: spinning ? 'hbSpin 1.6s linear infinite' : 'hbThink 1.8s ease-in-out infinite', flexShrink: 0 }}
      >
        <path d="M12 3v18" /><path d="M3 12h18" />
        <path d="M5.6 5.6l12.8 12.8" /><path d="M18.4 5.6L5.6 18.4" />
      </svg>
      {label && <span style={{ fontSize: '13px', color: '#8C9AAD', lineHeight: 1.5, ...labelStyle }}>{label}</span>}
    </span>
  )
}
