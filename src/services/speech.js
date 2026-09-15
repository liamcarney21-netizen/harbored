// Voice input — the browser's built-in speech recognition (Web Speech API).
// No keys, no audio uploads: on iOS Safari and Chrome the OS transcribes
// locally/natively and we only ever see text. Callers must handle absence
// (isSpeechSupported) — desktop Firefox, for one, has no recognizer.

export function isSpeechSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

// One-shot recognizer: start() listens until stop() (or the platform's own
// silence timeout), streaming the running transcript through onText.
export function createRecognizer({ onText, onEnd, onError }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  const rec = new SR()
  rec.continuous = true
  rec.interimResults = true
  rec.lang = 'en-US'

  let finalText = ''
  let stopped = false

  rec.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) finalText += r[0].transcript + ' '
      else interim += r[0].transcript
    }
    onText?.((finalText + interim).trim())
  }
  rec.onerror = (e) => {
    if (stopped) return
    onError?.(e.error === 'not-allowed' || e.error === 'service-not-allowed'
      ? 'Microphone access was blocked — allow it in your browser settings, or type instead.'
      : "Couldn't hear that — try again, or type it.")
  }
  rec.onend = () => {
    if (!stopped) onEnd?.(finalText.trim())
  }

  return {
    start: () => { try { rec.start() } catch { /* already started */ } },
    stop: () => { stopped = true; try { rec.stop() } catch { /* not started */ } return finalText.trim() },
  }
}
