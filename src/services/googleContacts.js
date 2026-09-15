// Google Contacts import — the standard web path (no file dance). Uses Google
// Identity Services' client-side token flow: the user approves read-only access
// in Google's own popup, we call the People API directly from the browser, and
// nothing touches our server. Each entry is normalized to the shape the import
// modal already consumes ({ name, email, phone, role, company, birthday }).
//
// Setup (one-time, Google Cloud Console): create an OAuth client ID (Web),
// enable the People API, add the site origins (localhost:5173 and the prod
// domain) as authorized JavaScript origins, and set VITE_GOOGLE_CLIENT_ID.

const SCOPE = 'https://www.googleapis.com/auth/contacts.readonly'

export function isGoogleImportConfigured() {
  return !!import.meta.env.VITE_GOOGLE_CLIENT_ID
}

function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gsi]')
    if (existing) {
      existing.addEventListener('load', resolve)
      existing.addEventListener('error', () => reject(new Error('Could not load Google sign-in.')))
      return
    }
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.dataset.gsi = 'true'
    s.onload = resolve
    s.onerror = () => reject(new Error('Could not load Google sign-in.'))
    document.head.appendChild(s)
  })
}

function requestToken(clientId) {
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp?.access_token) resolve(resp.access_token)
        else reject(new Error('Google sign-in was cancelled.'))
      },
      error_callback: () => reject(new Error('Google sign-in was cancelled.')),
    })
    client.requestAccessToken()
  })
}

function birthdayFrom(person) {
  const d = person.birthdays?.find(b => b?.date?.month && b?.date?.day)?.date
  return d ? `${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}` : ''
}

export async function fetchGoogleContacts() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error("Google import isn't switched on for this deployment yet.")
  }
  await loadGis()
  const token = await requestToken(clientId)

  const people = []
  let pageToken = ''
  do {
    const url = new URL('https://people.googleapis.com/v1/people/me/connections')
    url.searchParams.set('personFields', 'names,emailAddresses,phoneNumbers,organizations,birthdays')
    url.searchParams.set('pageSize', '1000')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error('Could not read your Google contacts.')
    const data = await res.json()
    people.push(...(data.connections || []))
    pageToken = data.nextPageToken || ''
  } while (pageToken && people.length < 5000)

  return people
    .map(p => ({
      name: p.names?.[0]?.displayName?.trim() || '',
      email: p.emailAddresses?.[0]?.value || '',
      phone: p.phoneNumbers?.[0]?.value || '',
      role: p.organizations?.[0]?.title || '',
      company: p.organizations?.[0]?.name || '',
      birthday: birthdayFrom(p),
    }))
    .filter(c => c.name)
}
