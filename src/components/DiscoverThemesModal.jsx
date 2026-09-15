import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Sparkles, Zap, Trophy, MapPin, TrendingUp, Activity, Briefcase } from 'lucide-react'
import { useDataStore } from '../store/dataStore'
import { discoverThemes } from '../services/discovery'

const categoryIcons = { sports: Trophy, place: MapPin, market: TrendingUp, hobby: Activity, industry: Briefcase }
const categoryColors = { sports: '#8FC7A2', place: '#D3A95C', market: '#D3A95C', hobby: '#6E5A8E', industry: '#A65B33' }

export default function DiscoverThemesModal({ open, onClose, contact }) {
  const addTheme = useDataStore(s => s.addTheme)
  const existing = useDataStore(s => s.themesByContact)
  const [text, setText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [excluded, setExcluded] = useState([])

  const existingLabels = new Set((existing[contact?.id] || []).map(t => t.label.toLowerCase()))
  const proposals = (result?.themes || []).filter(t => !existingLabels.has(t.label.toLowerCase()))
  const selectedCount = proposals.filter((_, i) => !excluded.includes(i)).length

  async function analyze() {
    setAnalyzing(true)
    setError(null)
    setResult(null)
    setExcluded([])
    try {
      const r = await discoverThemes(text, contact?.name)
      setResult(r)
      if (!r.themes.length) setError('No clear shared themes found — try pasting a longer stretch of conversation.')
    } catch (e) {
      setError(e.message)
    } finally {
      setAnalyzing(false)
    }
  }

  function acceptSelected() {
    proposals.forEach((t, i) => {
      if (!excluded.includes(i)) addTheme(contact.id, t.label, t.category)
    })
    handleClose()
  }

  function handleClose() {
    setText('')
    setResult(null)
    setError(null)
    setExcluded([])
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
          />
          <div style={{
            position: 'fixed', inset: 0, zIndex: 61, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px 16px', pointerEvents: 'none',
          }}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{
              pointerEvents: 'auto',
              width: 'min(560px, 100%)', maxHeight: '100%', overflowY: 'auto',
              background: '#0f2040', borderRadius: '16px', boxShadow: '0 14px 44px -8px rgba(28,43,51,0.24), 0 3px 10px rgba(28,43,51,0.10)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(211,169,92,0.08)' }}>
                  <Sparkles style={{ width: '15px', height: '15px', color: '#D3A95C' }} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#F5F4EF' }}>Discover Common Ground</div>
                  <div style={{ fontSize: '12px', color: '#8C9AAD' }}>
                    Paste emails or texts between you and {contact?.name?.split(' ')[0] || 'your contact'} — Harbored finds what you share.
                  </div>
                </div>
              </div>
              <button onClick={handleClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C9AAD', padding: '4px' }}>
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!result && (
                <>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={9}
                    placeholder={"Paste a stretch of real conversation. For example:\n\nMe: Did you catch the Nova game Saturday?\nJohn: Unreal finish. Also — played pickleball down in Charleston this weekend…"}
                    aria-label="Conversation text"
                    style={{
                      width: '100%', borderRadius: '12px', padding: '14px 16px', fontSize: '13px', lineHeight: 1.6,
                      resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                      background: '#0a1628', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F4EF', fontFamily: 'Inter, sans-serif',
                    }}
                  />
                  <p style={{ fontSize: '12px', color: '#8C9AAD', lineHeight: 1.5 }}>
                    The text is analyzed and discarded — only the themes you accept are kept. Connecting Gmail for automatic discovery is on the roadmap.
                  </p>
                </>
              )}

              {error && (
                <div style={{ borderRadius: '10px', padding: '12px 16px', fontSize: '13px', background: 'rgba(232,134,122,0.05)', border: '1px solid rgba(232,134,122,0.2)', color: '#E8867A' }}>
                  {error}
                </div>
              )}

              {result && proposals.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, color: '#8C9AAD' }}>
                      Found {proposals.length} shared theme{proposals.length === 1 ? '' : 's'} — tap to exclude
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#D3A95C' }}>
                      <Zap style={{ width: '11px', height: '11px' }} />
                      {result.engine === 'claude' ? 'AI analysis' : 'Keyword analysis'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {proposals.map((t, i) => {
                      const Icon = categoryIcons[t.category] || Activity
                      const color = categoryColors[t.category] || '#8C9AAD'
                      const off = excluded.includes(i)
                      return (
                        <button
                          key={i}
                          onClick={() => setExcluded(x => off ? x.filter(j => j !== i) : [...x, i])}
                          aria-pressed={!off}
                          style={{
                            textAlign: 'left', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer',
                            background: off ? '#F7F5F0' : 'rgba(211,169,92,0.04)',
                            border: `1px solid ${off ? '#E5E1D7' : 'rgba(211,169,92,0.3)'}`,
                            opacity: off ? 0.55 : 1, transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <Icon style={{ width: '13px', height: '13px', color, flexShrink: 0 }} />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#F5F4EF', flex: 1 }}>{t.label}</span>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#D3A95C' }}>{t.confidence}</span>
                            <span style={{
                              width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: off ? '#E5E1D7' : '#D3A95C', color: '#0a1628', flexShrink: 0,
                            }}>
                              {!off && <Check style={{ width: '11px', height: '11px' }} />}
                            </span>
                          </div>
                          {t.evidence && (
                            <p style={{ fontSize: '12px', color: '#8C9AAD', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
                              "{t.evidence}"
                            </p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {result.engine === 'heuristic' && (
                    <p style={{ fontSize: '11px', color: '#8C9AAD', opacity: 0.75 }}>
                      Keyword analysis found these. Add an ANTHROPIC_API_KEY to the server for deeper, AI-powered discovery.
                    </p>
                  )}
                </>
              )}

              {result && proposals.length === 0 && !error && (
                <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '13px', color: '#8C9AAD' }}>
                  Everything found is already on {contact?.name?.split(' ')[0]}'s themes. Nice — you know this person well.
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {result ? (
                <>
                  <button onClick={() => { setResult(null); setError(null) }}
                    style={{ padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#C2CBD8', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Analyze different text
                  </button>
                  <button onClick={acceptSelected} disabled={selectedCount === 0}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                      background: selectedCount > 0 ? '#D3A95C' : '#C6C0B3', color: '#0a1628', border: 'none',
                      cursor: selectedCount > 0 ? 'pointer' : 'default', fontFamily: 'Inter, sans-serif',
                    }}>
                    <Check style={{ width: '13px', height: '13px' }} />
                    Start monitoring {selectedCount} theme{selectedCount === 1 ? '' : 's'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleClose}
                    style={{ padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#C2CBD8', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Cancel
                  </button>
                  <button onClick={analyze} disabled={analyzing || text.trim().length < 40}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                      background: !analyzing && text.trim().length >= 40 ? '#D3A95C' : '#C6C0B3', color: '#0a1628', border: 'none',
                      cursor: !analyzing && text.trim().length >= 40 ? 'pointer' : 'default', fontFamily: 'Inter, sans-serif',
                    }}>
                    <Sparkles style={{ width: '13px', height: '13px' }} />
                    {analyzing ? 'Analyzing…' : 'Find common ground'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
