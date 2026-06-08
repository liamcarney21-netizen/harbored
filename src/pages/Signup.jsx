import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

export default function Signup() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', university: '', gradYear: '', major: '' });
  const navigate = useNavigate();
  const { demoLogin } = useAuthStore();

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 8,
    fontFamily: 'Inter, sans-serif', fontSize: 15,
    color: '#fdf6e3', outline: 'none',
    transition: 'border-color 0.2s',
  };
  const labelStyle = {
    display: 'block',
    fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
    color: 'rgba(253,246,227,0.5)',
    letterSpacing: '0.1em', textTransform: 'uppercase',
    marginBottom: 8,
  };

  const handleContinue = () => {
    if (step === 1) setStep(2);
    else {
      demoLogin();
      navigate('/feed');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f2040 0%, #1a3558 60%, #c9933a22 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          width: '100%', maxWidth: 460,
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          padding: '48px 40px',
        }}
      >
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: '#fdf6e3', letterSpacing: '0.06em', textAlign: 'center', marginBottom: 32 }}>
            ⚓ Harbored
          </div>
        </Link>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: s <= step ? '#c9933a' : 'rgba(255,255,255,0.12)',
              transition: 'background 0.4s',
            }} />
          ))}
        </div>

        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 30, fontWeight: 500, color: '#fdf6e3', marginBottom: 6, textAlign: 'center' }}>
          {step === 1 ? 'Create your account' : 'About you'}
        </h1>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgba(253,246,227,0.45)', textAlign: 'center', marginBottom: 32, fontWeight: 300 }}>
          {step === 1 ? 'Your harbor awaits.' : 'Help us find your network.'}
        </p>

        {step === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input style={inputStyle} placeholder="Maya Chen" value={form.name} onChange={e => update('name', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'rgba(201,147,58,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.14)'} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" style={inputStyle} placeholder="you@university.edu" value={form.email} onChange={e => update('email', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'rgba(201,147,58,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.14)'} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" style={inputStyle} placeholder="••••••••" value={form.password} onChange={e => update('password', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'rgba(201,147,58,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.14)'} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>University</label>
              <input style={inputStyle} placeholder="University of Michigan" value={form.university} onChange={e => update('university', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'rgba(201,147,58,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.14)'} />
            </div>
            <div>
              <label style={labelStyle}>Graduation Year</label>
              <input style={inputStyle} placeholder="2024" value={form.gradYear} onChange={e => update('gradYear', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'rgba(201,147,58,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.14)'} />
            </div>
            <div>
              <label style={labelStyle}>Major</label>
              <input style={inputStyle} placeholder="Economics" value={form.major} onChange={e => update('major', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'rgba(201,147,58,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.14)'} />
            </div>
          </div>
        )}

        <button onClick={handleContinue} style={{
          width: '100%', padding: '13px', marginTop: 28,
          background: 'linear-gradient(135deg, #c9933a, #e8b86d)',
          color: '#0f2040',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700, fontSize: 14,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          border: 'none', borderRadius: 8,
          cursor: 'pointer',
        }}>
          {step === 1 ? 'Continue →' : 'Join Harbored'}
        </button>

        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgba(253,246,227,0.4)', textAlign: 'center', marginTop: 20 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#f5c878', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
