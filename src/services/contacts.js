// Native Contacts import — iOS (Capacitor) only. Reads the address book through
// @capacitor-community/contacts and normalizes each entry to the shape the import
// modal already consumes ({ name, email, phone, role, company }), so the existing
// multi-select + dedupe UI works unchanged. On the web this is inert: the plugin is
// only dynamically imported inside the native guard, so it never enters the web
// bundle. This replaces the "Contacts → Share → Export vCard → upload" dance on
// device with a single system-permission prompt.
//
// Apple: the app declares NSContactsUsageDescription in ios/ (Info.plist) and
// contacts collection in the privacy nutrition labels. `npx cap sync` wires the
// pod/SPM dependency into the native project after this lands.

export function isNativeContactsAvailable() {
  return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()
}

// Pick the strongest single value from a typed list (phones/emails), preferring
// whatever iOS flagged primary, then falling back to the first non-empty entry.
function pickPrimary(list, field) {
  if (!Array.isArray(list) || !list.length) return ''
  const primary = list.find(x => x?.isPrimary && x[field])
  return (primary?.[field] || list.find(x => x?.[field])?.[field] || '').trim()
}

function normalize(payload) {
  const name =
    payload.name?.display?.trim() ||
    [payload.name?.given, payload.name?.family].filter(Boolean).join(' ').trim()
  return {
    name,
    email: pickPrimary(payload.emails, 'address'),
    phone: pickPrimary(payload.phones, 'number'),
    role: payload.organization?.jobTitle?.trim() || '',
    company: payload.organization?.company?.trim() || '',
    birthday: birthdayFromPayload(payload.birthday),
  }
}

// The plugin returns birthday as { year?, month, day } (month 1-based). We only
// keep the recurring month+day as "MM-DD" to match the vCard path.
function birthdayFromPayload(b) {
  if (!b || !b.month || !b.day) return ''
  const mm = String(b.month).padStart(2, '0')
  const dd = String(b.day).padStart(2, '0')
  return `${mm}-${dd}`
}

// Reads the whole address book (after permission) and returns normalized contacts
// with a name. Throws a user-facing Error if the user denies contacts access.
export async function pickNativeContacts() {
  if (!isNativeContactsAvailable()) return []

  // Dynamic import keeps the native plugin out of the web bundle.
  const { Contacts } = await import('@capacitor-community/contacts')

  let perm = await Contacts.checkPermissions()
  if (perm.contacts === 'prompt' || perm.contacts === 'prompt-with-rationale') {
    perm = await Contacts.requestPermissions()
  }
  if (perm.contacts !== 'granted') {
    throw new Error('Harbored needs permission to read your contacts. You can enable it in Settings → Harbored → Contacts.')
  }

  const { contacts } = await Contacts.getContacts({
    projection: { name: true, phones: true, emails: true, organization: true, birthday: true },
  })

  return (contacts || []).map(normalize).filter(c => c.name)
}
