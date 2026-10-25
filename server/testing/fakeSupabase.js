// In-memory stand-in for the parts of supabase-js the server uses. Unlike a
// stub that ignores filters, this one applies them (eq/neq/is/in/gte/gt/lte/
// lt, order with nullsFirst, range/limit, maybeSingle), so deleting a filter in
// production code makes a test fail. It also behaves like Postgres where the
// scan depends on it:
//  - scan_results.score is an integer: 72.5 fails the insert, like 22P02;
//  - unique keys: notified_stories (user_id, story_key), user_data (user_id),
//    device_tokens (user_id, token) — duplicates fail with 23505;
//  - multi-row inserts are atomic;
//  - missingTables / missingColumns simulate a migration that hasn't been
//    applied (42P01 / 42703 / PGRST204), so the fallbacks get exercised.
// failWhen({ table, op, rows, patch, filters }) can inject an error per call.
// Test-only: nothing in api/ imports it.

const UNIQUE_KEYS = {
  notified_stories: [['user_id', 'story_key']],
  user_data: [['user_id']],
  device_tokens: [['user_id', 'token']],
}
const INTEGER_COLUMNS = {
  scan_results: ['score'],
  scan_runs: ['users_total', 'users_scanned', 'users_skipped', 'users_errored', 'items_claude', 'items_fallback', 'above_bar', 'pushes_attempted', 'pushes_ok', 'pushes_failed'],
}
const NOT_NULL = { scan_results: ['user_id', 'contact_id', 'headline', 'score', 'above_bar'], notified_stories: ['user_id', 'story_key'] }

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))

function asComparable(v) {
  if (typeof v === 'number' || typeof v === 'boolean') return Number(v)
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const t = Date.parse(v)
    if (Number.isFinite(t)) return t
  }
  return v
}
function compare(a, b) {
  const x = asComparable(a)
  const y = asComparable(b)
  if (typeof x === 'number' && typeof y === 'number') return x - y
  return String(x) < String(y) ? -1 : String(x) > String(y) ? 1 : 0
}
const isNullish = (v) => v === null || v === undefined
const looseEq = (a, b) => a === b || (!isNullish(a) && !isNullish(b) && String(a) === String(b))

export function createFakeSupabase({
  tables = {},
  missingTables = [],
  missingColumns = {},
  users = [],
  sessions = {},
  failWhen = null,
} = {}) {
  const db = {}
  for (const [name, rows] of Object.entries(tables)) db[name] = clone(rows)
  const missing = new Set(missingTables)
  const calls = []
  let seq = 0
  const state = { failWhen }

  function missingColumnIn(table, cols) {
    const gone = missingColumns[table] || []
    return cols.find(c => gone.includes(c))
  }

  class Query {
    constructor(table) {
      this.table = table
      this.op = 'select'
      this.columns = '*'
      this.filters = []
      this.orders = []
      this.rangeArgs = null
      this.limitN = null
      this.returning = false
      this.single = null
      this.payload = null
      this.upsertOpts = null
    }
    select(cols = '*') {
      if (this.op === 'select') this.columns = cols
      else this.returning = true
      return this
    }
    insert(rows) { this.op = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this }
    upsert(rows, opts = {}) { this.op = 'upsert'; this.payload = Array.isArray(rows) ? rows : [rows]; this.upsertOpts = opts; return this }
    update(patch) { this.op = 'update'; this.payload = patch; return this }
    delete({ count } = {}) { this.op = 'delete'; this.countMode = count || null; return this }
    eq(col, v) { this.filters.push({ col, kind: 'eq', v }); return this }
    neq(col, v) { this.filters.push({ col, kind: 'neq', v }); return this }
    is(col, v) { this.filters.push({ col, kind: 'is', v }); return this }
    in(col, v) { this.filters.push({ col, kind: 'in', v: [...v] }); return this }
    gte(col, v) { this.filters.push({ col, kind: 'gte', v }); return this }
    gt(col, v) { this.filters.push({ col, kind: 'gt', v }); return this }
    lte(col, v) { this.filters.push({ col, kind: 'lte', v }); return this }
    lt(col, v) { this.filters.push({ col, kind: 'lt', v }); return this }
    order(col, { ascending = true, nullsFirst } = {}) { this.orders.push({ col, ascending, nullsFirst: nullsFirst ?? !ascending }); return this }
    range(from, to) { this.rangeArgs = [from, to]; return this }
    limit(n) { this.limitN = n; return this }
    maybeSingle() { this.single = 'maybe'; return this }
    single() { this.single = 'one'; return this }
    then(resolve, reject) {
      try { resolve(this.execute()) } catch (err) { reject ? reject(err) : resolve({ data: null, error: { message: String(err.message || err) } }) }
    }

    matches(row) {
      return this.filters.every(({ col, kind, v }) => {
        const x = row[col]
        switch (kind) {
          case 'eq': return looseEq(x, v)
          case 'neq': return !isNullish(x) && !looseEq(x, v)
          case 'is': return v === null ? isNullish(x) : x === v
          case 'in': return v.some(y => looseEq(x, y))
          case 'gte': return !isNullish(x) && compare(x, v) >= 0
          case 'gt': return !isNullish(x) && compare(x, v) > 0
          case 'lte': return !isNullish(x) && compare(x, v) <= 0
          case 'lt': return !isNullish(x) && compare(x, v) < 0
          default: return true
        }
      })
    }

    fail(code, message) { return { data: null, error: { code, message } } }

    validateRows(rows, existing) {
      const ints = INTEGER_COLUMNS[this.table] || []
      const notNull = NOT_NULL[this.table] || []
      for (const r of rows) {
        for (const c of ints) {
          if (r[c] !== undefined && r[c] !== null && !Number.isInteger(r[c])) {
            return this.fail('22P02', `invalid input syntax for type integer: "${r[c]}"`)
          }
        }
        for (const c of notNull) {
          if (r[c] === null) return this.fail('23502', `null value in column "${c}" of relation "${this.table}" violates not-null constraint`)
        }
      }
      for (const key of UNIQUE_KEYS[this.table] || []) {
        const seen = new Set(existing.map(r => key.map(k => String(r[k])).join('|')))
        for (const r of rows) {
          const k = key.map(c => String(r[c])).join('|')
          if (seen.has(k)) return this.fail('23505', `duplicate key value violates unique constraint "${this.table}_${key.join('_')}_key"`)
          seen.add(k)
        }
      }
      return null
    }

    withDefaults(r) {
      const row = { ...clone(r) }
      if (this.table === 'scan_results') {
        row.id ??= `sr-${++seq}`
        row.notified_at ??= null
        row.above_bar ??= false
        row.score ??= 0
      } else if (this.table === 'scan_runs') {
        row.id ??= ++seq
      } else if (this.table === 'device_tokens') {
        row.id ??= `dt-${++seq}`
      } else if (this.table === 'notified_stories') {
        row.notified_at ??= new Date().toISOString()
      }
      return row
    }

    execute() {
      calls.push({ table: this.table, op: this.op, filters: clone(this.filters), payload: clone(this.payload) })
      if (missing.has(this.table)) {
        return this.fail('42P01', `relation "public.${this.table}" does not exist`)
      }
      const injected = state.failWhen?.({ table: this.table, op: this.op, rows: this.op === 'insert' || this.op === 'upsert' ? this.payload : null, patch: this.op === 'update' ? this.payload : null, filters: this.filters })
      if (injected) return { data: null, error: injected }

      db[this.table] ??= []
      const table = db[this.table]
      const referenced = [...this.filters.map(f => f.col), ...this.orders.map(o => o.col)]
      if (this.op === 'select' && this.columns !== '*') referenced.push(...this.columns.split(',').map(c => c.trim()).filter(Boolean))
      const gone = missingColumnIn(this.table, referenced)
      if (gone) return this.fail('42703', `column ${this.table}.${gone} does not exist`)

      if (this.op === 'insert' || this.op === 'upsert') {
        const writeCols = this.payload.flatMap(r => Object.keys(r))
        const goneW = missingColumnIn(this.table, writeCols)
        if (goneW) return this.fail('PGRST204', `Could not find the '${goneW}' column of '${this.table}' in the schema cache`)
        const rows = this.payload.map(r => this.withDefaults(r))
        if (this.op === 'upsert') {
          const key = (this.upsertOpts?.onConflict || '').split(',').map(s => s.trim()).filter(Boolean)
          const inserted = []
          for (const r of rows) {
            const hit = key.length ? table.find(e => key.every(k => looseEq(e[k], r[k]))) : null
            if (hit) { if (!this.upsertOpts?.ignoreDuplicates) Object.assign(hit, r) }
            else { const err = this.validateRows([r], table); if (err) return err; table.push(r); inserted.push(r) }
          }
          return { data: this.returning ? clone(inserted) : null, error: null }
        }
        const err = this.validateRows(rows, table)
        if (err) return err
        table.push(...rows)
        return { data: this.returning ? clone(rows) : null, error: null }
      }

      if (this.op === 'update') {
        const goneU = missingColumnIn(this.table, Object.keys(this.payload || {}))
        if (goneU) return this.fail('PGRST204', `Could not find the '${goneU}' column of '${this.table}' in the schema cache`)
        const hits = table.filter(r => this.matches(r))
        const err = this.validateRows(hits.map(r => ({ ...r, ...this.payload })), [])
        if (err) return err
        for (const r of hits) Object.assign(r, clone(this.payload))
        return { data: this.returning ? clone(hits) : null, error: null }
      }

      if (this.op === 'delete') {
        const keep = []
        const removed = []
        for (const r of table) (this.matches(r) ? removed : keep).push(r)
        db[this.table] = keep
        return { data: this.returning ? clone(removed) : null, error: null, ...(this.countMode ? { count: removed.length } : {}) }
      }

      // select
      let rows = table.filter(r => this.matches(r))
      if (this.orders.length) {
        rows = [...rows].sort((a, b) => {
          for (const { col, ascending, nullsFirst } of this.orders) {
            const an = isNullish(a[col])
            const bn = isNullish(b[col])
            if (an !== bn) return (an ? -1 : 1) * (nullsFirst ? 1 : -1)
            if (an && bn) continue
            const c = compare(a[col], b[col])
            if (c !== 0) return ascending ? c : -c
          }
          return 0
        })
      }
      if (this.rangeArgs) rows = rows.slice(this.rangeArgs[0], this.rangeArgs[1] + 1)
      if (this.limitN !== null) rows = rows.slice(0, this.limitN)
      if (this.columns !== '*') {
        const cols = this.columns.split(',').map(c => c.trim()).filter(Boolean)
        rows = rows.map(r => Object.fromEntries(cols.map(c => [c, r[c] ?? null])))
      }
      rows = clone(rows)
      if (this.single === 'maybe') {
        if (rows.length > 1) return this.fail('PGRST116', 'JSON object requested, multiple (or no) rows returned')
        return { data: rows[0] ?? null, error: null }
      }
      if (this.single === 'one') {
        if (rows.length !== 1) return this.fail('PGRST116', 'JSON object requested, multiple (or no) rows returned')
        return { data: rows[0], error: null }
      }
      return { data: rows, error: null }
    }
  }

  return {
    db,
    calls,
    setFailWhen(fn) { state.failWhen = fn },
    rows(table) { return clone(db[table] || []) },
    from(table) { return new Query(table) },
    auth: {
      getUser: async (token) => {
        const user = sessions[token]
        return user ? { data: { user }, error: null } : { data: { user: null }, error: { message: 'invalid JWT' } }
      },
      admin: {
        listUsers: async () => ({ data: { users: clone(users) }, error: null }),
      },
    },
  }
}
