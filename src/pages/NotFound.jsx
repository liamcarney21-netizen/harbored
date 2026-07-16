import { Link } from 'react-router-dom'
import AnchorMark from '../components/AnchorMark'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', background: '#F6F4EF',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', textAlign: 'center', fontFamily: 'Inter, sans-serif',
    }}>
      <AnchorMark size={28} color="#A97E2F" style={{ marginBottom: 20 }} />
      <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: 'clamp(56px, 10vw, 96px)', fontWeight: 600, color: '#1C2B33', lineHeight: 1 }}>
        404
      </div>
      <h1 style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 600, color: '#1C2B33', margin: '14px 0 10px' }}>
        Adrift, but not lost.
      </h1>
      <p style={{ fontSize: 14, color: '#5C6B73', maxWidth: 380, lineHeight: 1.65, marginBottom: 28 }}>
        This page doesn't exist — or it drifted somewhere we can't find it.
        Let's get you back to harbor.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/" style={{
          padding: '11px 24px', background: '#0D5C63', color: '#fff', borderRadius: 8,
          fontSize: 14, fontWeight: 600, textDecoration: 'none',
        }}>
          Back to home
        </Link>
        <Link to="/dashboard" style={{
          padding: '11px 24px', background: 'none', color: '#3E4B52', borderRadius: 8,
          fontSize: 14, fontWeight: 500, textDecoration: 'none', border: '1px solid #CCC6B9',
        }}>
          Open the app
        </Link>
      </div>
    </div>
  )
}
