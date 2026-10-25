// The home-screen widget reads one JSON value from the shared app group,
// written by the WidgetBridge plugin in the app target (ios/App/App), which
// also asks WidgetKit to redraw. Native only; no-ops on the web.
import { registerPlugin } from '@capacitor/core'
import { isNative } from '../lib/platform'

const WidgetBridge = registerPlugin('WidgetBridge')

export async function publishWidget(payload) {
  if (!isNative()) return
  try {
    await WidgetBridge.publish(payload ? { value: JSON.stringify({ ...payload, updatedAt: Date.now() }) } : {})
  } catch { /* widget is best effort */ }
}

export async function clearWidget() {
  return publishWidget(null)
}
