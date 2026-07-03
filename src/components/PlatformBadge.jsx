const platformConfig = {
  linkedin: { label: 'in',  bg: '#0077B5', title: 'LinkedIn'  },
  instagram: { label: '▲',  bg: '#E1306C', title: 'Instagram' },
  x:         { label: 'X',  bg: '#14171A', title: 'X (Twitter)' },
  tiktok:    { label: 'TT', bg: '#010101', title: 'TikTok'    },
}

export default function PlatformBadge({ platform, size = 'sm' }) {
  const cfg = platformConfig[platform] || { label: platform[0].toUpperCase(), bg: '#333', title: platform }
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-xs' : 'w-6 h-6 text-xs'
  return (
    <div
      className={`${sizeClass} rounded flex items-center justify-center font-bold flex-shrink-0`}
      style={{ backgroundColor: cfg.bg, color: '#fff' }}
      title={cfg.title}
    >
      {cfg.label}
    </div>
  )
}
