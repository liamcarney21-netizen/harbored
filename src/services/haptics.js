// Haptic grammar for the whole app — one vocabulary, used sparingly:
//   tick     — a selection landed (deck snapped to a new reason, theme added)
//   soft     — a surface opened (draft takeover, modal step)
//   success  — something real happened in the world (message handed off to
//              Messages/Mail, contacts imported)
// Web and unsupported devices no-op silently; a failed buzz must never
// surface as an error.

import { isNative } from '../lib/platform'

let Haptics = null
if (isNative()) {
  import('@capacitor/haptics')
    .then(m => { Haptics = m.Haptics })
    .catch(() => {})
}

function impact(style) {
  Haptics?.impact({ style }).catch(() => {})
}

export const haptic = {
  tick: () => impact('LIGHT'),
  soft: () => impact('MEDIUM'),
  success: () => Haptics?.notification({ type: 'SUCCESS' }).catch(() => {}),
}
