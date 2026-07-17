import { Link } from 'react-router-dom'
import AnchorMark from '../components/AnchorMark'

const SERIF = '"Fraunces", Georgia, serif'
const SANS = 'Inter, sans-serif'
const INK = '#1C2B33'
const MUTE = '#5C6B73'
const TEAL = '#0D5C63'

const CONTACT_EMAIL = 'harboredsupport@gmail.com'

// Support page — doubles as the App Store "Support URL". Keep answers truthful to how
// the app actually behaves; update alongside product changes (and Privacy.jsx).
const FAQ = [
  {
    q: 'How does Harbored decide what’s worth reaching out about?',
    a: 'For each person, you tell Harbored the themes you share — a team, a city, a market, a hobby. Harbored watches those themes across live news and scores each development for significance. Only the ones that clear your reach-out bar surface as prompts; everything below it is logged quietly so you’re never buried in noise.',
  },
  {
    q: 'Does Harbored send messages for me?',
    a: 'It drafts them; you send them. When you tap send, Harbored opens your own email or Messages app with the draft prefilled. Nothing goes out without you, and the content of what you send never passes through our servers.',
  },
  {
    q: 'How do I import my contacts?',
    a: 'On iPhone, pick the people you want straight from your contacts — only the fields Harbored needs (name, email, phone, company) come across. You can also upload a vCard (.vcf) export, or add people one at a time. Harbored never reads your whole address book without your action.',
  },
  {
    q: 'How do I turn notifications on or off?',
    a: 'Push notifications are opt-in. You’ll be asked when you first use the app, and you can change it anytime in iOS Settings → Harbored → Notifications. When on, you’re only pinged when an update clears your reach-out bar.',
  },
  {
    q: 'How do I delete my data or my account?',
    a: 'You can remove any contact, theme, or note in the app at any time, and Settings has controls to clear your data. To delete your account and everything associated with it, email us and we’ll action it promptly.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Harbored never sells your data and never uses your contacts for advertising. You choose who to import and what’s stored. See the full ',
    link: { to: '/privacy', label: 'Privacy Policy' },
    aAfter: ' for exactly what we collect and who it’s shared with.',
  },
  {
    q: 'What does it cost?',
    a: 'Harbored has a free tier to get a feel for it, and a Pro plan that unlocks unlimited contacts and themes, Discovery, prep briefs, auto-send, and every channel. Manage your plan in Settings.',
  },
]

function Item({ item }) {
  return (
    <div style={{ padding: '22px 0', borderBottom: '1px solid #E6E2D8' }}>
      <h2 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: INK, margin: '0 0 8px' }}>{item.q}</h2>
      <p style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.7, color: '#3E4B52', margin: 0 }}>
        {item.a}
        {item.link && <Link to={item.link.to} style={{ color: TEAL, fontWeight: 500, textDecoration: 'none' }}>{item.link.label}</Link>}
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
          Something not working, or a question the answers below don't cover? Email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: TEAL, fontWeight: 500 }}>{CONTACT_EMAIL}</a>{' '}
          and a real person will get back to you.
        </p>

        {/* Contact card */}
        <a href={`mailto:${CONTACT_EMAIL}?subject=Harbored%20support`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 22,
          padding: '11px 22px', background: TEAL, color: '#fff', borderRadius: 8,
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
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: TEAL, fontWeight: 500 }}>{CONTACT_EMAIL}</a>.
        </p>
      </main>
    </div>
  )
}
