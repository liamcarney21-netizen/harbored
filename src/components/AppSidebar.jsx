import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Bell, Users, MessageSquare, BarChart2, Settings, Anchor, Settings2, Compass, Mail, UserPlus } from 'lucide-react'

const navItems = [
  { path: '/dashboard',           label: 'Common Ground', icon: Compass, end: true, badge: 4 },
  { path: '/dashboard/overview',  label: 'Overview',   icon: LayoutDashboard },
  { path: '/dashboard/alerts',    label: 'Alerts',     icon: Bell,            badge: 2 },
  { path: '/dashboard/network',   label: 'My Network', icon: Users },
  { path: '/dashboard/messages',  label: 'Messages',   icon: MessageSquare },
  { path: '/dashboard/digest',    label: 'Weekly Digest', icon: Mail },
  { path: '/dashboard/analytics', label: 'Analytics',  icon: BarChart2 },
  { path: '/dashboard/settings',  label: 'Settings',   icon: Settings },
]

export default function AppSidebar({ onAddContact }) {
  const navigate = useNavigate()

  return (
    <aside
      style={{
        width: '240px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#FFFFFF',
        borderRight: '1px solid #E8EAED',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '20px',
          borderBottom: '1px solid #E8EAED',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/dashboard')}
      >
        <Anchor style={{ width: '16px', height: '16px', color: '#0A66C2', flexShrink: 0 }} />
        <span style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '16px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: '#1D2226',
        }}>
          HARBORED
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {navItems.map(({ path, label, icon: Icon, badge, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: isActive ? '9px 12px 9px 10px' : '9px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'Inter, system-ui, sans-serif',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
              color: isActive ? '#0A66C2' : '#5E6774',
              background: isActive ? 'rgba(10,102,194,0.08)' : 'transparent',
              borderLeft: isActive ? '2px solid #0A66C2' : '2px solid transparent',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon style={{ width: '15px', height: '15px', flexShrink: 0, color: isActive ? '#0A66C2' : '#5E6774' }} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge && !isActive && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '20px',
                    background: 'rgba(10,102,194,0.15)',
                    color: '#0A66C2',
                  }}>
                    {badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Add contact */}
      <div style={{ padding: '12px' }}>
        <button
          onClick={onAddContact}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '9px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: '#0A66C2', color: '#FFFFFF', border: 'none', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#084D92'}
          onMouseLeave={e => e.currentTarget.style.background = '#0A66C2'}
        >
          <UserPlus style={{ width: '14px', height: '14px' }} /> Add Contact
        </button>
      </div>

      {/* User */}
      <div style={{ padding: '16px', borderTop: '1px solid #E8EAED' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 600, flexShrink: 0,
              background: 'rgba(10,102,194,0.15)', color: '#0A66C2',
            }}>LC</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#1D2226', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Liam Carney
              </div>
              <div style={{ fontSize: '11px', color: '#5E6774', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                liamcarney21@gmail.com
              </div>
            </div>
          </div>
          <Settings2
            style={{ width: '14px', height: '14px', color: '#5E6774', cursor: 'pointer', flexShrink: 0, marginLeft: '8px' }}
            onClick={() => navigate('/dashboard/settings')}
          />
        </div>
      </div>
    </aside>
  )
}
