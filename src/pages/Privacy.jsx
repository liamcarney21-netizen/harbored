import { Link } from 'react-router-dom'
import AnchorMark from '../components/AnchorMark'

const SERIF = '"Fraunces Variable", "Fraunces", "Lora", Georgia, serif'
const SANS = 'Inter, sans-serif'
const INK = '#1C2B33'
const MUTE = '#5C6B73'
const NAVY = '#0a1628'
const LINK = { color: NAVY, fontWeight: 500, textDecoration: 'underline', textDecorationColor: 'rgba(169,126,47,0.6)', textUnderlineOffset: 3 }

const EFFECTIVE = 'October 27, 2026'
const CONTACT_EMAIL = 'harboredsupport@gmail.com'

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
          Harbored ("Harbored", "we", "us") provides the Harbored web and iOS application.
          If you have any question about this policy or your data, email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={LINK}>{CONTACT_EMAIL}</a>.
        </Section>

        <Section title="Information you give us">
          <ul style={{ paddingLeft: 20, margin: '4px 0 0' }}>
            <Bullet><strong>Account details.</strong> Your name, and the email address and password you use to sign in. Authentication is handled by Supabase; we never see your password in plain text.</Bullet>
            <Bullet><strong>Contacts you import.</strong> When you import from your iPhone's contacts, Harbored lists them on your device so you can choose who to bring in. Only the people you select are saved to your account, and only these fields: name, email address, phone number, company and role, and birthday. We do not read your entire address book without your action, and we don't collect fields you don't need us to.</Bullet>
            <Bullet><strong>Birthdays.</strong> If a contact you choose to import has a birthday saved (or you add one yourself), Harbored keeps only the month and day, and uses it only for birthday reminders.</Bullet>
            <Bullet><strong>Themes and notes.</strong> The shared themes, notes, and reminders you add for each contact, how you know them, and what you'd text them about — these are the basis of what Harbored watches for you. When you tell Harbored a suggestion wasn't about a theme, that headline is kept with the theme for 60 days so similar stories are skipped.</Bullet>
            <Bullet><strong>Messages you send.</strong> When you send a drafted message, Harbored saves its text to your account history. See "Sending messages" below.</Bullet>
            <Bullet><strong>How you use the app.</strong> A few moments are recorded with your account and the time: finishing setup, how many people you imported and themes you added, your first scan and first reason, opening or sending a draft, choosing how you know someone or what you'd text them about, skipping a suggestion with the reason you picked, and whether you allowed notifications. These records never include anyone's name or contact details, headlines, or message text, and they're deleted with your account.</Bullet>
            <Bullet><strong>What you tell Harbored about someone.</strong> When you describe a person to find shared themes, out loud or by typing, that text is sent for analysis (see "AI processing" below) and is not stored after the themes are returned. If you use the mic, your device's built-in speech recognition turns your voice into text; Harbored only ever receives the text, never audio.</Bullet>
            <Bullet><strong>Email updates.</strong> If you sign up for updates on our website, we use your first name and email address only to send you those updates.</Bullet>
          </ul>
        </Section>

        <Section title="How we use it">
          <ul style={{ paddingLeft: 20, margin: '4px 0 0' }}>
            <Bullet>To watch public news sources for meaningful developments related to the themes you've saved, and to score how significant each one is.</Bullet>
            <Bullet>To draft outreach messages you can review and send, and, only if you turn it on, to email you a weekly recap of what's worth reaching out about.</Bullet>
            <Bullet>To send push notifications when something is worth reaching out about (iOS only, and only if you allow notifications).</Bullet>
            <Bullet>To see where Harbored helps and where people get stuck, from the usage records above.</Bullet>
            <Bullet>To operate, secure, and improve the service.</Bullet>
          </ul>
          <p style={{ marginTop: 12 }}>
            We do <strong>not</strong> sell your personal information, and we do not use your contacts
            for advertising or share them with data brokers. Ever. Harbored shows no ads and does not
            track you across other companies' apps or websites.
          </p>
        </Section>

        <Section title="AI processing">
          To refine the themes you add, score how much each news story matters, and draft messages,
          Harbored sends the relevant contact's name, company, and role, how you know them, the
          theme text and what you'd text them about, the headlines being scored (and any you marked
          as not about a theme), and your draft text to Anthropic's API (Claude). When you describe
          someone to find themes, that text is sent too. Anthropic does not use this data to train
          its models. Harbored sends only what each request needs and never
          sends your whole address book; your contacts' email addresses, phone numbers, and
          birthdays, and your notes, are not sent to Anthropic.
        </Section>

        <Section title="Who we share it with">
          We share data only with the service providers that make Harbored work, and only as needed:
          <ul style={{ paddingLeft: 20, margin: '10px 0 0' }}>
            <Bullet><strong>Supabase</strong> — database and authentication (stores your account, contacts, themes, message history, and results).</Bullet>
            <Bullet><strong>Anthropic (Claude)</strong> — theme suggestions and refinement, news scoring, and message drafts, as described above.</Bullet>
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
          prefilled. The message is sent by you, through your app and your account; Harbored never
          sends anything on your behalf. When you tap to send, Harbored saves a record to your own
          account history (the text of that draft, who it was for, and when) so the app can show
          when you last reached out. Removing a person removes their history, and deleting your
          account deletes all of it.
        </Section>

        <Section title="Data retention and your controls">
          <ul style={{ paddingLeft: 20, margin: '4px 0 0' }}>
            <Bullet>You can remove any contact, theme, or note at any time from within the app.</Bullet>
            <Bullet>You can delete your account and all of its data (your people, themes, notes, and message history) at any time in the app, under You → Delete account. Deletion is permanent.</Bullet>
            <Bullet>You can also ask us to delete your account and all associated data by emailing{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={LINK}>{CONTACT_EMAIL}</a>. We'll action it promptly.</Bullet>
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
          <a href={`mailto:${CONTACT_EMAIL}`} style={LINK}>{CONTACT_EMAIL}</a>.
        </Section>
      </main>
    </div>
  )
}
