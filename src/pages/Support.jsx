import { Link } from 'react-router-dom'
import AnchorMark from '../components/AnchorMark'

const SERIF = '"Fraunces Variable", "Fraunces", "Lora", Georgia, serif'
const SANS = 'Inter, sans-serif'
const INK = '#1C2B33'
const MUTE = '#5C6B73'
const NAVY = '#0a1628'
const LINK = { color: NAVY, fontWeight: 500, textDecoration: 'underline', textDecorationColor: 'rgba(169,126,47,0.6)', textUnderlineOffset: 3 }

const CONTACT_EMAIL = 'harboredsupport@gmail.com'
const APP_STORE_URL = 'https://apps.apple.com/us/app/harbored/id6812816966'

// Support page — doubles as the App Store "Support URL". Keep answers truthful to how
// the app actually behaves; update alongside product changes (and Privacy.jsx).
const FAQ = [
  {
    q: 'How does Harbored decide what’s worth reaching out about?',
    a: 'For each person, you tell Harbored the themes you share — a team, a city, a market, a hobby. Harbored watches those themes across live news and scores each development for significance. Only the developments genuinely worth a message become reasons to reach out; everything else stays quiet, so you’re never buried in noise.',
  },
  {
    q: 'Does Harbored send messages for me?',
    a: 'It drafts them; you send them. When you tap send, Harbored opens your own email or Messages app with the draft prefilled, and the message goes out from your own account. Nothing goes out without you. Harbored keeps the draft’s text in your account history so it can show when you last reached out.',
  },
  {
    q: 'How do I import my contacts?',
    a: 'On iPhone, pick the people you want straight from your contacts — only the fields Harbored needs (name, email, phone, company and role, birthday) come across. On the web, add people one at a time — one-tap import lives in the iPhone app. Harbored never reads your whole address book without your action.',
  },
  {
    q: 'How do I turn notifications on or off?',
    a: 'Push notifications are opt-in. You’ll be asked when you first use the app, and you can change it anytime in iOS Settings → Harbored → Notifications. When on, you’re only pinged when something is genuinely worth reaching out about.',
  },
  {
    q: 'How do I delete my data or my account?',
    a: 'You can remove any contact, theme, or note in the app at any time. To delete your account and everything associated with it, open the You tab and tap Delete account — it’s permanent. You can also email us and we’ll action it promptly.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Harbored never sells your data and never uses your contacts for advertising. You choose who to import and what’s stored. See the full ',
    link: { to: '/privacy', label: 'Privacy Policy' },
    aAfter: ' for exactly what we collect and who it’s shared with.',
  },
  {
    q: 'What does it cost?',
    a: 'Nothing — Harbored is free on the ',
    link: { href: APP_STORE_URL, label: 'App Store' },
    aAfter: '.',
  },
]

function Item({ item }) {
  return (
    <div style={{ padding: '22px 0', borderBottom: '1px solid #E6E2D8' }}>
      <h2 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: INK, margin: '0 0 8px' }}>{item.q}</h2>
      <p style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.7, color: '#3E4B52', margin: 0 }}>
        {item.a}
        {item.link?.to && <Link to={item.link.to} style={LINK}>{item.link.label}</Link>}
        {item.link?.href && <a href={item.link.href} target="_blank" rel="noopener" style={LINK}>{item.link.label}</a>}
        {item.aAfter}
      </p>
    </div>
  )
}

export default function Support() {
  return (
    <div style={{ minHeight: '100vh', background: '#F6F4EF', fontFamily: SANS }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #E6E2D8' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <AnchorMark size={22} color="#A97E2F" />
            <span style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: INK }}>Harbored</span>
          </Link>
          <Link to="/" style={{ fontSize: 13, fontWeight: 500, color: MUTE, textDecoration: 'none' }}>← Back to home</Link>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 96px' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(30px, 5vw, 42px)', fontWeight: 600, color: INK, lineHeight: 1.1, margin: 0 }}>
          Support
        </h1>
        <p style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.7, color: '#3E4B52', marginTop: 20 }}>
          Harbored is a free iPhone app, available on the{' '}
          <a href={APP_STORE_URL} target="_blank" rel="noopener" style={LINK}>App Store</a>.
          Something not working, or a question the answers below don't cover? Email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={LINK}>{CONTACT_EMAIL}</a>{' '}
          and a real person will get back to you.
        </p>

        {/* Contact card */}
        <a href={`mailto:${CONTACT_EMAIL}?subject=Harbored%20support`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 22,
          padding: '11px 22px', background: NAVY, color: '#fff', borderRadius: 8,
          fontSize: 14, fontWeight: 600, textDecoration: 'none',
        }}>
          Email support
        </a>

        {/* FAQ */}
        <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: INK, margin: '48px 0 4px' }}>
          Common questions
        </h2>
        <div>
          {FAQ.map((item, i) => <Item key={i} item={item} />)}
        </div>

        <p style={{ fontFamily: SANS, fontSize: 14, lineHeight: 1.7, color: MUTE, marginTop: 32 }}>
          Still stuck? We usually reply within a day. Reach us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={LINK}>{CONTACT_EMAIL}</a>.
        </p>
      </main>
    </div>
  )
}
