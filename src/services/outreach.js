// Real sending via deep links: opens the user's own mail/SMS app with the
// draft prefilled. Zero infrastructure — upgrade path is the Gmail API.
// Texts beat email when both exist: this is how people actually reach their
// own crew, and the draft copy is written conversationally.

export function sendChannelFor(contact) {
  if (contact?.phone) return 'sms'
  if (contact?.email) return 'email'
  return null
}

export function buildSendLink(contact, message, subject = '') {
  if (contact?.phone) {
    return `sms:${contact.phone.replace(/[^+\d]/g, '')}&body=${encodeURIComponent(message)}`
  }
  if (contact?.email) {
    const params = new URLSearchParams()
    if (subject) params.set('subject', subject)
    params.set('body', message)
    return `mailto:${contact.email}?${params.toString().replace(/\+/g, '%20')}`
  }
  return null
}

export function openSend(contact, message, subject) {
  const link = buildSendLink(contact, message, subject)
  if (!link) return null
  window.location.href = link
  return sendChannelFor(contact)
}
