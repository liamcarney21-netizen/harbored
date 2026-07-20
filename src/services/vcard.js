// Minimal vCard (.vcf) parser — handles the common 3.0/4.0 fields exported
// by iOS/Android/macOS Contacts (FN, N, ORG, TITLE, EMAIL, TEL, BDAY), including
// RFC 6350 line folding (continuation lines start with a space or tab).
function unescapeValue(v) {
  return v
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

export function parseVCard(text) {
  const rawLines = text.split(/\r\n|\n|\r/)
  const lines = []
  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length) {
      lines[lines.length - 1] += line.slice(1)
    } else {
      lines.push(line)
    }
  }

  const cards = []
  let current = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (/^BEGIN:VCARD$/i.test(line)) {
      current = {}
      continue
    }
    if (/^END:VCARD$/i.test(line)) {
      if (current) cards.push(current)
      current = null
      continue
    }
    if (!current) continue

    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const propName = line.slice(0, colonIdx).split(';')[0].toUpperCase()
    const value = line.slice(colonIdx + 1).trim()
    if (!value) continue

    switch (propName) {
      case 'FN':
        current.name = unescapeValue(value)
        break
      case 'N':
        if (!current.name) {
          const [family, given] = value.split(';')
          current.name = [given, family].filter(Boolean).join(' ').trim()
        }
        break
      case 'ORG':
        if (!current.company) current.company = unescapeValue(value.split(';')[0])
        break
      case 'TITLE':
        if (!current.role) current.role = unescapeValue(value)
        break
      case 'EMAIL':
        if (!current.email) current.email = value
        break
      case 'TEL':
        if (!current.phone) current.phone = value
        break
      case 'BDAY':
        if (!current.birthday) current.birthday = normalizeBirthday(value)
        break
      default:
        break
    }
  }

  return cards
    .filter(c => c.name && c.name.trim())
    .map(c => ({
      name: c.name.trim(),
      role: c.role || '',
      company: c.company || '',
      email: c.email || '',
      phone: c.phone || '',
      birthday: c.birthday || '',
    }))
}

// vCard BDAY comes in several shapes: "1990-02-15", "19900215", "--0215"
// (year withheld), sometimes with a trailing time. We only ever act on the
// recurring month+day, so normalize to "MM-DD" and drop the rest. Returns ''
// if we can't find a valid month/day.
export function normalizeBirthday(raw) {
  if (!raw) return ''
  const digits = raw.replace(/[^\d]/g, '')
  let mm, dd
  if (raw.startsWith('--') && digits.length >= 4) {
    // --MMDD (year omitted)
    mm = digits.slice(0, 2); dd = digits.slice(2, 4)
  } else if (digits.length >= 8) {
    // YYYYMMDD
    mm = digits.slice(4, 6); dd = digits.slice(6, 8)
  } else if (digits.length === 4) {
    // MMDD
    mm = digits.slice(0, 2); dd = digits.slice(2, 4)
  } else {
    return ''
  }
  const m = Number(mm), d = Number(dd)
  if (m < 1 || m > 12 || d < 1 || d > 31) return ''
  return `${mm}-${dd}`
}
