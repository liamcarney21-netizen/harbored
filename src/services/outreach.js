// Real sending via deep links: opens the user's own mail/SMS app with the
// draft prefilled. Zero infrastructure — upgrade path is the Gmail API.

export function sendChannelFor(contact) {
  if (contact?.email) return 'email'
  if (contact?.phone) return 'sms'
  return null
}

export function buildSendLink(contact, message, subject = '') {
  if (contact?.email) {
    const params = new URLSearchParams()
    if (subject) params.set('subject', subject)
    params.set('body', message)
    return `mailto:${contact.email}?${params.toString().replace(/\+/g, '%20')}`
  }
  if (contact?.phone) {
    return `sms:${contact.phone.replace(/[^+\d]/g, '')}&body=${encodeURIComponent(message)}`
  }
  return null
}

export function openSend(contact, message, subject) {
  const link = buildSendLink(contact, message, subject)
  if (!link) return null
  window.location.href = link
  return sendChannelFor(contact)
}
