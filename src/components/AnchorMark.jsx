// The one canonical Harbored anchor — same geometry as the PWA icon
// (public/icon.svg): round head, straight shank, a straight crossbar, and a
// curved fluke. Use this everywhere an anchor appears so the mark is identical
// across the site (nav, app chrome, onboarding, 404). Normalized to a 24×24
// viewBox so it drops in wherever a lucide icon was, sized in px.
export default function AnchorMark({ size = 16, color = 'currentColor', strokeWidth = 2, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      <circle cx="12" cy="5.7" r="2" />
      <line x1="12" y1="7.7" x2="12" y2="19.5" />
      <line x1="8.25" y1="10.5" x2="15.75" y2="10.5" />
      <path d="M4.9 14.25 Q12 20.25 19.1 14.25" />
    </svg>
  )
}
