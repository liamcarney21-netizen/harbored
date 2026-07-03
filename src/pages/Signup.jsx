import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Anchor } from 'lucide-react';

const inputStyle = {
  width: '100%', padding: '12px 16px', boxSizing: 'border-box',
  background: '#FFFFFF',
  border: '1px solid #CDD3D9',
  borderRadius: 8,
  fontFamily: 'Inter, sans-serif', fontSize: 15,
  color: '#1D2226', outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const labelStyle = {
  display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
  color: '#44484D', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8,
};

function focusRing(e) {
  e.target.style.borderColor = '#0A66C2';
  e.target.style.boxShadow = '0 0 0 3px rgba(10,102,194,0.15)';
}
function blurRing(e) {
  e.target.style.borderColor = '#CDD3D9';
  e.target.style.boxShadow = 'none';
}

export default function Signup() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', university: '', gradYear: '', major: '' });
  const navigate = useNavigate();

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleContinue = () => {
    if (step === 1) setStep(2);
    else {
      localStorage.setItem('harbored_loggedin', 'true');
      navigate('/dashboard');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F3F2EF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: '100%', maxWidth: 460,
          background: '#FFFFFF',
          border: '1px solid #E8EAED',
          borderRadius: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          padding: '48px 40px',
        }}
      >
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
            <Anchor style={{ width: 18, height: 18, color: '#0A66C2' }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 700, letterSpacing: '0.1em', color: '#1D2226' }}>
              HARBORED
            </span>
          </div>
        </Link>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: s <= step ? '#0A66C2' : '#E4E6E9',
              transition: 'background 0.4s',
            }} />
          ))}
        </div>

        <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 22, fontWeight: 700, color: '#1D2226', marginBottom: 6, textAlign: 'center' }}>
          {step === 1 ? 'Create your account' : 'About you'}
        </h1>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#5E6774', textAlign: 'center', marginBottom: 32 }}>
          {step === 1 ? 'Your network, kept close.' : 'Help us find your network.'}
        </p>

        {step === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="su-name" style={labelStyle}>Full Name</label>
              <input id="su-name" style={inputStyle} placeholder="Maya Chen" value={form.name} onChange={e => update('name', e.target.value)}
                onFocus={focusRing} onBlur={blurRing} />
            </div>
            <div>
              <label htmlFor="su-email" style={labelStyle}>Email</label>
              <input id="su-email" type="email" style={inputStyle} placeholder="you@university.edu" value={form.email} onChange={e => update('email', e.target.value)}
                onFocus={focusRing} onBlur={blurRing} />
            </div>
            <div>
              <label htmlFor="su-password" style={labelStyle}>Password</label>
              <input id="su-password" type="password" style={inputStyle} placeholder="••••••••" value={form.password} onChange={e => update('password', e.target.value)}
                onFocus={focusRing} onBlur={blurRing} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="su-university" style={labelStyle}>University</label>
              <input id="su-university" style={inputStyle} placeholder="University of Michigan" value={form.university} onChange={e => update('university', e.target.value)}
                onFocus={focusRing} onBlur={blurRing} />
            </div>
            <div>
              <label htmlFor="su-gradyear" style={labelStyle}>Graduation Year</label>
              <input id="su-gradyear" style={inputStyle} placeholder="2024" value={form.gradYear} onChange={e => update('gradYear', e.target.value)}
                onFocus={focusRing} onBlur={blurRing} />
            </div>
            <div>
              <label htmlFor="su-major" style={labelStyle}>Major</label>
              <input id="su-major" style={inputStyle} placeholder="Economics" value={form.major} onChange={e => update('major', e.target.value)}
                onFocus={focusRing} onBlur={blurRing} />
            </div>
          </div>
        )}

        <button onClick={handleContinue} style={{
          width: '100%', padding: '13px', marginTop: 28,
          background: '#0A66C2',
          color: '#FFFFFF',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600, fontSize: 15,
          border: 'none', borderRadius: 24,
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#084D92'}
        onMouseLeave={e => e.currentTarget.style.background = '#0A66C2'}
        >
          {step === 1 ? 'Continue' : 'Join Harbored'}
        </button>

        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#5E6774', textAlign: 'center', marginTop: 20 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#0A66C2', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
