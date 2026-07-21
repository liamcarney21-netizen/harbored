import { NavLink } from 'react-router-dom'
import { Compass, Users, Mail, Settings } from 'lucide-react'

// Mobile primary navigation — a LinkedIn-style bottom tab bar that replaces the
// old hamburger drawer, so the installed app reads like a native app instead of
// a website in a shell. Palette matches the landing: navy / white / teal.
const TABS = [
  { path: '/dashboard',          label: 'Common Ground', icon: Compass, end: true },
  { path: '/dashboard/network',  label: 'Network',       icon: Users },
  { path: '/dashboard/digest',   label: 'Digest',        icon: Mail },
  { path: '/dashboard/settings', label: 'Settings',      icon: Settings },
]

const TEAL = '#0D5C63'
const MUTED = '#8A97A0'

export default function BottomTabBar() {
  return (
    <nav style={{
      flexShrink: 0, display: 'flex', background: '#FFFFFF',
      borderTop: '1px solid #E4E9EC',
      padding: '7px 4px calc(env(safe-area-inset-bottom) + 7px)',
    }}>
      {TABS.map(({ path, label, icon: Icon, end }) => (
        <NavLink
          key={path}
          to={path}
          end={end}
          style={{ flex: 1, textDecoration: 'none' }}
        >
          {({ isActive }) => (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
              padding: '4px 0', color: isActive ? TEAL : MUTED,
              transition: 'color 0.15s ease',
            }}>
              <Icon style={{ width: 23, height: 23 }} strokeWidth={isActive ? 2.4 : 1.9} />
              <span style={{
                fontFamily: 'Inter, sans-serif', fontSize: '10.5px',
                fontWeight: isActive ? 600 : 500, letterSpacing: '0.01em',
              }}>{label}</span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
