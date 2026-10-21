// One scheduled run (api/scan.js): scan every user, push what the scan found,
// record the run in scan_runs, log a one-line summary, and tell the owner when
// something is wrong. Before this, every degraded mode returned HTTP 200 and
// nothing was recorded, so a dead API key went unnoticed for weeks.
//
// healthy = the scan ran, no user errored (including partial-cleanup errors),
// every item was scored by Claude (items_fallback == 0), and push neither
// threw nor had a failed send. Unhealthy runs email ALERT_EMAIL through Resend
// (when RESEND_API_KEY is set); healthy runs GET HEARTBEAT_URL (when set), so a
// dead-man's switch pages you when the healthy pings stop. Logs and alerts
// carry counts and short user ids only — never emails or names.

import { runScan } from './scanHandler.js'
import { runPush } from './pushHandler.js'
import { sendEmail } from './email.js'
import { isMissingTableError } from './db.js'

export const DEFAULT_ALERT_EMAIL = 'harboredsupport@gmail.com'
// Push doesn't start a new user after this point in the 60s invocation, so the
// run record and alert still get written.
export const PUSH_DEADLINE_MS = 54000

const msg = (err) => String(err?.message || err)

export function buildRunRecord({ startedAt, finishedAt, scan, push, errors = [] }) {
  const pushThrew = !!push?.error
  const userErrors = (scan?.users_errored || 0) + (scan?.cleanup_errors || 0)
  const healthy = !!scan && errors.length === 0 && userErrors === 0 &&
    (scan.items_fallback || 0) === 0 && !pushThrew &&
    (push?.pushes_failed || 0) === 0 && (push?.users_errored || 0) === 0

  const problems = [...errors]
  for (const e of scan?.errors || []) problems.push(`user ${e.user} ${e.stage}: ${e.message}`)
  if (scan?.items_fallback) problems.push(`${scan.items_fallback} item(s) omitted by the model (stored unscored)`)
  for (const e of push?.errors || []) problems.push(`push user ${e.user}: ${e.message}`)
  if (push?.pushes_failed) problems.push(`${push.pushes_failed} APNs send(s) failed`)

  return {
    started_at: startedAt,
    finished_at: finishedAt,
    users_total: scan?.users_total ?? 0,
    users_scanned: scan?.users_scanned ?? 0,
    users_skipped: scan?.users_skipped ?? 0,
    users_errored: scan?.users_errored ?? 0,
    items_claude: scan?.items_claude ?? 0,
    items_fallback: scan?.items_fallback ?? 0,
    above_bar: scan?.above_bar ?? 0,
    pushes_attempted: push?.pushes_attempted ?? 0,
    pushes_ok: push?.pushes_ok ?? 0,
    pushes_failed: push?.pushes_failed ?? 0,
    healthy,
    error: problems.length ? problems.join('\n').slice(0, 2000) : null,
  }
}

export async function recordRun(supabase, record) {
  const { error } = await supabase.from('scan_runs').insert(record)
  if (!error) return 'recorded'
  if (isMissingTableError(error)) {
    console.error('[scan] scan_runs table is missing; apply migration 0004 to keep run history')
    return 'missing-table'
  }
  console.error(`[scan] could not record the run: ${error.message}`)
  return 'failed'
}

function alertText(run) {
  return [
    "Harbored's scan run finished unhealthy.",
    '',
    `Started:  ${run.started_at}`,
    `Finished: ${run.finished_at}`,
    `Users:    total ${run.users_total}, scanned ${run.users_scanned}, skipped ${run.users_skipped}, errored ${run.users_errored}`,
    `Items:    Claude ${run.items_claude}, unscored ${run.items_fallback}, above bar ${run.above_bar}`,
    `Pushes:   attempted ${run.pushes_attempted}, ok ${run.pushes_ok}, failed ${run.pushes_failed}`,
    '',
    'Problems:',
    run.error || '(none recorded)',
    '',
    'Nothing was pushed for users whose scoring failed, and their stored results were left as they were.',
    'Details: the scan_runs table in Supabase and the /api/scan function logs in Vercel.',
  ].join('\n')
}

export async function sendAlert(run, { fetchImpl } = {}) {
  if (!process.env.RESEND_API_KEY) {
    console.error('[scan] run unhealthy; RESEND_API_KEY is not set, so no alert email was sent')
    return 'skipped-no-key'
  }
  const subject = `Harbored scan unhealthy: ${run.users_errored} user error(s), ${run.items_fallback} unscored, ${run.pushes_failed} push failure(s)`
  try {
    await sendEmail({ to: process.env.ALERT_EMAIL || DEFAULT_ALERT_EMAIL, subject, text: alertText(run) }, fetchImpl ? { fetchImpl } : {})
    console.log('[scan] alert email sent')
    return 'sent'
  } catch (err) {
    console.error(`[scan] alert email failed: ${msg(err)}`)
    return 'failed'
  }
}

// Dead-man's switch: only healthy runs ping, so silence means trouble. The
// URL usually embeds a secret token, so it is never logged.
export async function pingHeartbeat({ fetchImpl = globalThis.fetch } = {}) {
  const url = process.env.HEARTBEAT_URL
  if (!url) return 'skipped-no-url'
  try {
    const resp = await fetchImpl(url, { method: 'GET', signal: AbortSignal.timeout(5000) })
    if (!resp.ok) {
      console.error(`[scan] heartbeat ping returned ${resp.status}`)
      return 'failed'
    }
    return 'sent'
  } catch (err) {
    console.error(`[scan] heartbeat ping failed: ${msg(err)}`)
    return 'failed'
  }
}

export async function runScheduledScan(supabase, {
  now = Date.now,
  scan: scanOptions = {},
  push: pushOptions = {},
  record = true,
  notify = true,
  alert = sendAlert,
  heartbeat = pingHeartbeat,
} = {}) {
  const startMs = now()
  const startedAt = new Date(startMs).toISOString()
  const errors = []
  let scan = null
  let push = null

  try {
    scan = await runScan(supabase, { now, startedAt, ...scanOptions })
  } catch (err) {
    errors.push(`scan: ${msg(err)}`)
    console.error(`[scan] run failed before scanning users: ${msg(err)}`)
  }

  // Push runs after the user loop even when some users errored: they are
  // excluded, everyone else still hears about what was found for them.
  if (scan) {
    try {
      push = await runPush(supabase, {
        now,
        since: scan.started_at,
        excludeUserIds: scan.internal?.erroredUserIds || [],
        prefsByUser: scan.internal?.prefsByUser,
        deadline: startMs + PUSH_DEADLINE_MS,
        ...pushOptions,
      })
    } catch (err) {
      push = { error: msg(err) }
      errors.push(`push: ${msg(err)}`)
      console.error(`[scan] push step failed: ${msg(err)}`)
    }
  }

  const run = buildRunRecord({ startedAt, finishedAt: new Date(now()).toISOString(), scan, push, errors })
  const recorded = record ? await recordRun(supabase, run) : 'skipped'

  console.log(`[scan] run ${JSON.stringify({
    ...run,
    detail: scan ? {
      ordered_by: scan.ordered_by,
      users_idle: scan.users_idle,
      rows_written: scan.rows_written,
      news_failed: scan.news_failed,
      cleanup_errors: scan.cleanup_errors,
    } : null,
    push: push && !push.error ? {
      live: push.live,
      dedupe: push.dedupe,
      candidates: push.candidates,
      users_with_new: push.usersWithNew,
      stories_pushed: push.stories_pushed,
      deduped: push.deduped,
      capped_daily: push.capped_daily,
      capped_contact: push.capped_contact,
      gated: push.gated,
      users_no_device: push.usersNoDevice,
      users_prefs_off: push.users_prefs_off,
      users_excluded: push.users_excluded,
      users_deferred: push.users_deferred,
      tokens_pruned: push.tokens_pruned,
    } : push,
  })}`)

  let alerted = 'not-needed'
  let heartbeatResult = 'not-sent'
  if (notify) {
    if (run.healthy) heartbeatResult = await heartbeat()
    else alerted = await alert(run)
  }

  return { ok: !!scan, scan, push, run, recorded, alerted, heartbeat: heartbeatResult }
}
