// "Alter × Claude" avatar: warm paper tones with ink initials, monospace.
// Tone is picked deterministically from the initials so a contact keeps
// their color everywhere without storing anything new.
const TONES = ['#E8CFC0', '#DCD4C8', '#E3D1D6', '#D9DCCE', '#D5D9DC', '#E6D8C4']

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
      background: toneFor(initials), color: '#1B1613',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: s.font, fontWeight: 700,
    }}>
      {initials}
    </div>
  )
}
