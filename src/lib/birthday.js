// Pure birthday date math, shared by the client (Common Ground selector) and the
// server (scan-time birthday signal provider). No framework or platform deps so
// it imports cleanly into both the Vite bundle and the serverless functions.
const DAY = 86400000

// Days until a contact's next birthday from a recurring "MM-DD" string.
// Returns null for missing/invalid input, 0 on the birthday itself. Feb-29
// birthdays fall back to Feb-28 in non-leap years.
export function daysUntilBirthday(mmdd, now = new Date()) {
  if (!mmdd || !/^\d{2}-\d{2}$/.test(mmdd)) return null
  const [m, d] = mmdd.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const makeDate = (year) => {
    const dt = new Date(year, m - 1, d)
    // Overflow (e.g. Feb 29 → Mar 1) means the day doesn't exist that year; pin to last valid day.
    if (dt.getMonth() !== m - 1) dt.setDate(0)
    return dt
  }
  let next = makeDate(today.getFullYear())
  if (next < today) next = makeDate(today.getFullYear() + 1)
  return Math.round((next - today) / DAY)
}
