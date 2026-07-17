import { Link } from 'react-router-dom'
import AnchorMark from '../components/AnchorMark'

const SERIF = '"Fraunces", Georgia, serif'
const SANS = 'Inter, sans-serif'
const INK = '#1C2B33'
const MUTE = '#5C6B73'
const TEAL = '#0D5C63'

const EFFECTIVE = 'July 17, 2026'
const CONTACT_EMAIL = 'liamcarney21@gmail.com'

// Substantive privacy policy — Harbored imports contacts and stores personal data,
// so this is a real disclosure (and a required URL for App Store review), not filler.
// Keep it truthful to what the app actually does; update alongside data-handling changes.
function Section({ title, children }) {
  return (
    <section style={{ marginTop: 34 }}>
      <h2 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: INK, margin: '0 0 12px' }}>{title}</h2>
      <div style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.7, color: '#3E4B52' }}>{children}</div>
    </section>
  )
}

function Bullet({ children }) {
  return <li style={{ marginBottom: 8 }}>{children}</li>
}

export default function Privacy() {
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
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: MUTE, marginTop: 12 }}>Effective {EFFECTIVE}</p>

        <p style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.7, color: '#3E4B52', marginTop: 24 }}>
          Harbored helps you stay genuinely in touch with the people in your network. To do that,
          it holds some personal information — yours and, when you choose to import them, your
          contacts'. This policy explains exactly what we collect, why, who it's shared with, and
          the control you have over it. We wrote it to be read, not to be survived.
        </p>

        <Section title="Who we are">
          Harbored, Inc. ("Harbored", "we", "us") provides the Harbored web and iOS application.
          If you have any question about this policy or your data, email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: TEAL, fontWeight: 500 }}>{CONTACT_EMAIL}</a>.
        </Section>

        <Section title="Information you give us">
          <ul style={{ paddingLeft: 20, margin: '4px 0 0' }}>
            <Bullet><strong>Account details.</strong> The email address and password you use to sign in. Authentication is handled by Supabase; we never see your password in plain text.</Bullet>
            <Bullet><strong>Contacts you import.</strong> When you import from your phone or a vCard file, Harbored reads only the contacts you select, and only these fields: name, email address, phone number, and company/role. We do not read your entire address book without your action, and we don't collect fields you don't need us to.</Bullet>
            <Bullet><strong>Themes and notes.</strong> The shared themes, notes, and reminders you add for each contact — these are the basis of what Harbored watches for you.</Bullet>
            <Bullet><strong>Conversation text you paste into Discovery.</strong> When you use Discovery to surface shared themes, the text you paste is sent for analysis (see "AI processing" below) and is not stored after the themes are returned.</Bullet>
          </ul>
        </Section>

        <Section title="How we use it">
          <ul style={{ paddingLeft: 20, margin: '4px 0 0' }}>
            <Bullet>To watch public news sources for meaningful developments related to the themes you've saved, and to score how significant each one is.</Bullet>
            <Bullet>To draft outreach messages you can review and send, and to send you a periodic digest of what's worth reaching out about.</Bullet>
            <Bullet>To send push notifications when something clears your reach-out bar (iOS only, and only if you allow notifications).</Bullet>
            <Bullet>To operate, secure, and improve the service.</Bullet>
          </ul>
          <p style={{ marginTop: 12 }}>
            We do <strong>not</strong> sell your personal information, and we do not use your contacts
            for advertising or share them with data brokers. Ever.
          </p>
        </Section>

        <Section title="AI processing">
          Harbored uses Anthropic's Claude to score the significance of news and to extract shared
          themes in Discovery. When these features run, the relevant text (for example, a headline
          and the theme it relates to, or conversation text you paste) is sent to Anthropic for
          processing and returned to you. Anthropic does not train its models on this data. We send
          only what the feature needs — not your full contact list.
        </Section>

        <Section title="Who we share it with">
          We share data only with the service providers that make Harbored work, and only as needed:
          <ul style={{ paddingLeft: 20, margin: '10px 0 0' }}>
            <Bullet><strong>Supabase</strong> — database and authentication (stores your account, contacts, themes, and results).</Bullet>
            <Bullet><strong>Anthropic (Claude)</strong> — significance scoring and Discovery, as described above.</Bullet>
            <Bullet><strong>Google News</strong> — the public news source we query for theme developments.</Bullet>
            <Bullet><strong>Resend</strong> — delivery of digest and notification emails.</Bullet>
            <Bullet><strong>Apple Push Notification service</strong> — delivery of iOS push notifications (a device token is stored to reach your device).</Bullet>
            <Bullet><strong>Vercel</strong> — application hosting.</Bullet>
          </ul>
          <p style={{ marginTop: 12 }}>
            We may also disclose information if required by law, or to protect the rights, safety, and
            security of Harbored and its users.
          </p>
        </Section>

        <Section title="Sending messages">
          When you send outreach from Harbored, we open your own email or messaging app with a draft
          prefilled. The message goes through your app and your account — the content of what you
          send is not routed through or stored by our servers. Harbored records that a touch
          happened (who and when) so it can track relationship health, not what you said.
        </Section>

        <Section title="Data retention and your controls">
          <ul style={{ paddingLeft: 20, margin: '4px 0 0' }}>
            <Bullet>You can remove any contact, theme, or note at any time from within the app.</Bullet>
            <Bullet>Settings includes controls to clear your data.</Bullet>
            <Bullet>You can ask us to delete your account and all associated data by emailing{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: TEAL, fontWeight: 500 }}>{CONTACT_EMAIL}</a>. We'll action it promptly.</Bullet>
            <Bullet>Depending on where you live, you may have rights to access, correct, export, or delete your personal information. Email us and we'll help.</Bullet>
          </ul>
        </Section>

        <Section title="Security">
          Data is encrypted in transit. Access to stored data is restricted, and each user can only
          reach their own records. No system is perfectly secure, but we take reasonable measures to
          protect your information and limit what we collect in the first place.
        </Section>

        <Section title="Children">
          Harbored is not directed to children under 13, and we do not knowingly collect their
          personal information.
        </Section>

        <Section title="Changes to this policy">
          If we make material changes, we'll update the effective date above and, where appropriate,
          notify you in the app. Continued use after a change means you accept the updated policy.
        </Section>

        <Section title="Contact">
          Questions, requests, or concerns:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: TEAL, fontWeight: 500 }}>{CONTACT_EMAIL}</a>.
        </Section>
      </main>
    </div>
  )
}
