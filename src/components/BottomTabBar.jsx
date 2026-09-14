import { NavLink } from 'react-router-dom'

// Mobile primary navigation — three tabs, "Alter × Claude" style: blush paper,
// mono caps labels, vermilion for the active tab only. Digest folds into Today;
// Settings becomes "You".
const TABS = [
  { path: '/dashboard',          label: 'TODAY',  end: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="8.5" /><path d="M12 8v4.5l3 2" />
      </svg>
    ) },
  { path: '/dashboard/network',  label: 'PEOPLE',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" />
        <circle cx="16.5" cy="9" r="2.6" /><path d="M15.5 14.6c2.4.2 4.3 1.8 4.9 4.4" />
      </svg>
    ) },
  { path: '/dashboard/settings', label: 'YOU',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="9" r="3.4" /><path d="M5 20c.8-3.6 3.6-5.8 7-5.8s6.2 2.2 7 5.8" />
      </svg>
    ) },
]

const ACCENT = '#DE4A2C'
const MUTED = '#9C8B80'

export default function BottomTabBar() {
  return (
    <nav style={{
      flexShrink: 0, display: 'flex',
      borderTop: '1px solid rgba(27,22,19,0.1)',
      padding: '10px 4px calc(env(safe-area-inset-bottom) + 8px)',
    }}>
      {TABS.map(({ path, label, icon, end }) => (
        <NavLink
          key={path}
          to={path}
          end={end}
          style={{ flex: 1, textDecoration: 'none' }}
        >
          {({ isActive }) => (
            <div className="alter-press" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              padding: '4px 0', minHeight: '44px',
              color: isActive ? ACCENT : MUTED,
            }}>
              <span style={{ display: 'flex' }}>
                {icon}
              </span>
              <span style={{
                fontSize: '10px', letterSpacing: '0.08em',
                fontWeight: isActive ? 700 : 400,
              }}>{label}</span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
