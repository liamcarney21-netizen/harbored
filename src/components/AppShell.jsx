import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { to: '/feed', icon: '📰', label: 'Feed' },
  { to: '/network', icon: '🤝', label: 'Network' },
  { to: '/messages', icon: '💬', label: 'Messages' },
  { to: '/jobs', icon: '💼', label: 'Jobs' },
  { to: '/profile/1', icon: '👤', label: 'Profile' },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f4f0' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240,
        background: '#0f2040',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 0',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 50,
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '0 24px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 22, fontWeight: 600,
            color: '#fdf6e3',
            letterSpacing: '0.04em',
          }}>⚓ Harbored</div>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 10,
            color: 'rgba(245,200,100,0.5)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginTop: 2,
          }}>Michigan '24</div>
        </div>

        {/* User card */}
        {user && (
          <div style={{
            padding: '20px 20px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            margin: '0 0 8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src={user.avatar}
                alt={user.name}
                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(201,147,58,0.5)' }}
              />
              <div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: '#fdf6e3' }}>{user.name}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(253,246,227,0.4)', marginTop: 1 }}>{user.currentRole}</div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 12px' }}>
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 2,
                textDecoration: 'none',
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#f5c878' : 'rgba(253,246,227,0.6)',
                background: isActive ? 'rgba(201,147,58,0.12)' : 'transparent',
                transition: 'all 0.15s',
              })}
            >
              <span style={{ fontSize: 16 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 8,
              width: '100%',
              background: 'transparent',
              border: 'none',
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              color: 'rgba(253,246,227,0.4)',
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(253,246,227,0.8)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(253,246,227,0.4)'}
          >
            <span style={{ fontSize: 16 }}>🚪</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{
        marginLeft: 240,
        flex: 1,
        minHeight: '100vh',
        padding: '32px',
        maxWidth: 'calc(100vw - 240px)',
      }}>
        {children}
      </main>
    </div>
  );
}
