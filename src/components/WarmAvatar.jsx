// Claude-dark avatar: muted warm tones on charcoal, cream initials.
// Tone is picked deterministically from the initials so a contact keeps
// their color everywhere without storing anything new.
const TONES = ['#4D4238', '#3F4542', '#4A3E4C', '#37424D', '#4D4A38', '#463A3C']

const SIZES = {
  sm: { box: 34, font: 12 },
  md: { box: 42, font: 13 },
  lg: { box: 48, font: 15 },
  xl: { box: 64, font: 20 },
}

function toneFor(initials = '') {
  let h = 0
  for (const ch of String(initials)) h = (h * 31 + ch.charCodeAt(0)) % 997
  return TONES[h % TONES.length]
}

export default function WarmAvatar({ initials, size = 'md' }) {
  const s = SIZES[size] || SIZES.md
  return (
    <div style={{
      width: s.box, height: s.box, borderRadius: '50%', flexShrink: 0,
      background: toneFor(initials), color: '#F5F4EF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: s.font, fontWeight: 600, letterSpacing: '0.02em',
    }}>
      {initials}
    </div>
  )
}
