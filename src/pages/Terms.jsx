import { Link } from 'react-router-dom'
import AnchorMark from '../components/AnchorMark'

const SERIF = '"Fraunces Variable", "Fraunces", "Lora", Georgia, serif'
const SANS = 'Inter, sans-serif'
const INK = '#1C2B33'
const MUTE = '#5C6B73'
const NAVY = '#0a1628'
const LINK = { color: NAVY, fontWeight: 500, textDecoration: 'underline', textDecorationColor: 'rgba(169,126,47,0.6)', textUnderlineOffset: 3 }

const EFFECTIVE = 'October 21, 2026'
const CONTACT_EMAIL = 'harboredsupport@gmail.com'

// Terms of use — plain English, same shell as Privacy.jsx. Keep it truthful to how the
// app actually behaves (it never sends for you; data is deletable in-app). Deliberately
// names no company entity and no governing jurisdiction.
function Section({ title, children }) {
  return (
    <section style={{ marginTop: 34 }}>
      <h2 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: INK, margin: '0 0 12px' }}>{title}</h2>
      <div style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.7, color: '#3E4B52' }}>{children}</div>
    </section>
  )
}

export default function Terms() {
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
          Terms of Use
        </h1>
        <p style={{ fontSize: 13, color: MUTE, marginTop: 12 }}>Effective {EFFECTIVE}</p>

        <p style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.7, color: '#3E4B52', marginTop: 24 }}>
          These terms cover your use of Harbored: the iPhone app and this website. We kept them short
          and in plain English. By using Harbored, you agree to them; if you don't, please don't use it.
        </p>

        <Section title="What Harbored does">
          Harbored helps you stay in touch with the people who matter to you. You tell it what you
          share with each person (a team, a company, a city, a market) and it watches public news on
          those themes. When something looks like a real reason to reach out, Harbored shows you the
          story and drafts a message you can send. It also reminds you of birthdays and of people
          you haven't talked to in a while.
        </Section>

        <Section title="Your contacts and data stay yours">
          Everything you put into Harbored, including the people you import, your themes and notes,
          and the messages you send, remains yours. We use it only to run Harbored for you, as
          described in our <Link to="/privacy" style={LINK}>Privacy Policy</Link>. You can remove any
          person, theme, or note at any time, and you can delete your account and all of its data in
          the app, under You → Delete account. Deletion is permanent.
        </Section>

        <Section title="You send every message">
          Harbored never sends messages on your behalf. It drafts; you decide. Every message is sent
          by you, from your own Mail or Messages app and your own account, so read each draft before
          you send it. What you send is up to you.
        </Section>

        <Section title="News comes from public sources">
          The stories Harbored shows come from public news sources such as Google News. We don't
          write, check, or control them, and they may be inaccurate, incomplete, or out of date.
          Harbored also uses AI to judge which stories matter and to write drafts, and it can get
          those wrong. Check the facts before you rely on a story or pass it along.
        </Section>

        <Section title="No promise of relevance">
          Harbored tries hard to surface only real reasons to reach out, but we can't promise that
          every story it shows will be relevant or well timed, or that it will catch every story that
          matters to you or the people you care about.
        </Section>

        <Section title="Provided as is">
          Harbored is provided "as is" and "as available," without warranties of any kind, express
          or implied. We don't guarantee that it will always be available, uninterrupted, or free of
          errors, and its features may change over time.
        </Section>

        <Section title="Closing accounts">
          We may suspend or close an account that is used for abuse: for example, to harass or spam
          people, to break the law, or to overload, probe, or misuse Harbored or its AI features. You
          can stop using Harbored and delete your account at any time.
        </Section>

        <Section title="Changes to these terms">
          If we change these terms, we'll post the new version on this page and update the date
          above. If you keep using Harbored after a change, the updated terms apply.
        </Section>

        <Section title="Contact">
          Questions about these terms:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={LINK}>{CONTACT_EMAIL}</a>.
        </Section>
      </main>
    </div>
  )
}
