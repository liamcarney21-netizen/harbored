import { useState, useEffect, useRef } from 'react'

// Text that writes itself in a few words at a time — a drafted message
// arriving like a thought, not a form letter. The cadence eases in (slow
// first words, then up to speed) so it reads as composing, not teletype.
//
// Finishes instantly when the reader prefers reduced motion, and the parent
// can cut to the end at any time by flipping `active` off (e.g. on tap).
// `onDone` fires exactly once per text, including the instant paths.
export default function StreamText({ text = '', active = true, onDone, style, className }) {
  const words = text.split(/(\s+)/) // keep whitespace tokens so layout is exact
  const [count, setCount] = useState(0)
  const doneRef = useRef(false)
  const timerRef = useRef(null)

  const reduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    doneRef.current = false
    if (!active || reduced || !text) {
      setCount(words.length)
      if (!doneRef.current) { doneRef.current = true; onDone?.() }
      return
    }
    setCount(0)
    let i = 0
    const step = () => {
      // Two word-tokens per step (word + its trailing space), easing from a
      // considered start into a steady hand.
      i = Math.min(words.length, i + 2)
      setCount(i)
      if (i >= words.length) {
        if (!doneRef.current) { doneRef.current = true; onDone?.() }
        return
      }
      const progress = i / words.length
      const delay = progress < 0.12 ? 90 : 38
      timerRef.current = setTimeout(step, delay)
    }
    timerRef.current = setTimeout(step, 120)
    return () => clearTimeout(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, active])

  const streaming = count < words.length
  return (
    <span className={className} style={style} aria-label={text}>
      <span aria-hidden>{words.slice(0, count).join('')}</span>
      {streaming && (
        <span
          aria-hidden
          style={{
            display: 'inline-block', width: '7px', height: '1em',
            background: '#D3A95C', borderRadius: '1.5px', marginLeft: '2px',
            verticalAlign: 'text-bottom', animation: 'hbCaret 1s step-end infinite',
          }}
        />
      )}
    </span>
  )
}
