import { useEffect, useMemo, useState } from 'react'
import {
  importPdfStatements,
  resolveReviewItem,
  updateRuleProfile,
} from './appServices/finnyApp'
import { getMonthlyCloseSummary, getMonthlyStatus, getReviewQueue } from './appServices/monthlyClose'
import { DEFAULT_STATE } from './domain/defaults'
import { reviewItemDetailLines } from './reconcile/reviewExplain'
import type { AppState } from './domain/types'
import { TauriSqliteAdapter } from './storage/tauriSqliteAdapter'

const storage = new TauriSqliteAdapter()

function App() {
  const [tab, setTab] = useState<'home' | 'import' | 'review' | 'ledger' | 'settings'>('home')
  const [state, setState] = useState<AppState | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [persistenceError, setPersistenceError] = useState<string | null>(null)

  useEffect(() => {
    void storage
      .load()
      .then((s) => {
        setState(s)
      })
      .catch((err: unknown) => {
        setLoadError(String(err))
        setState(DEFAULT_STATE)
      })
  }, [])

  const reviewItems = useMemo(() => getReviewQueue(state ?? DEFAULT_STATE), [state])

  const monthlyClose = useMemo(() => getMonthlyCloseSummary(state ?? DEFAULT_STATE), [state])
  const monthlyStatus = useMemo(() => getMonthlyStatus(state ?? DEFAULT_STATE), [state])

  /** Applies state optimistically, persists, then rolls back UI if save fails. */
  async function patchState(next: AppState): Promise<boolean> {
    const previous = state
    if (previous === null) return false
    setState(next)
    setPersistenceError(null)
    try {
      await storage.save(next)
      return true
    } catch (err: unknown) {
      setState(previous)
      setPersistenceError(String(err))
      return false
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length || !state) return
    setBusy(true)
    setMessage('')
    try {
      const result = await importPdfStatements(state, Array.from(files))
      if (result.ok) {
        const saved = await patchState(result.next)
        if (saved) {
          setMessage(result.userMessage)
        } else {
          setMessage(
            'Import was processed in memory but could not be saved. Your previous data is unchanged.',
          )
        }
      } else {
        setMessage(result.userMessage)
      }
    } finally {
      setBusy(false)
    }
  }

  function onResolveReview(itemId: string, action: 'confirm' | 'override') {
    if (!state) return
    void patchState(resolveReviewItem(state, itemId, action))
  }

  if (!state) {
    return (
      <div className="mx-auto max-w-6xl p-4">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-4">
      <header className="mb-3">
        <h1 className="text-2xl font-semibold">Finny</h1>
        <p className="text-sm text-slate-600">Local-only personal finance tracker (v0 vertical slice)</p>
      </header>

      {loadError && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-950"
          role="alert"
        >
          <p className="mb-1 font-medium">Could not load saved data</p>
          <p className="mb-2 break-words text-red-900">{loadError}</p>
          <p className="mb-2 text-red-800">Starting with an empty workspace.</p>
          <button
            type="button"
            className="cursor-pointer rounded border border-red-300 bg-white px-2 py-1 text-sm text-red-900"
            onClick={() => setLoadError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {persistenceError && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-950"
          role="alert"
        >
          <p className="mb-1 font-medium">Could not save changes</p>
          <p className="mb-2 break-words text-red-900">{persistenceError}</p>
          <button
            type="button"
            className="cursor-pointer rounded border border-red-300 bg-white px-2 py-1 text-sm text-red-900"
            onClick={() => setPersistenceError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <nav className="mb-4 flex flex-wrap gap-2">
        {(['home', 'import', 'review', 'ledger', 'settings'] as const).map((item) => (
          <button
            key={item}
            className={`cursor-pointer rounded-md border px-3 py-2 text-sm ${
              tab === item
                ? 'border-blue-300 bg-blue-100 text-blue-900'
                : 'border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100'
            }`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      {tab === 'home' && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-medium">Monthly Close</h2>
          <p className="mb-3 text-sm">
            Continue monthly close ({monthlyStatus.monthKey}): {monthlyStatus.reasonText}
          </p>
          <ul className="mb-3 list-inside list-disc text-sm">
            {monthlyClose.requiredSources.map((src) => (
              <li key={src}>
                {monthlyClose.presentSources.has(src) ? 'x' : '-'} {src}
              </li>
            ))}
          </ul>
          <p className="text-sm">Total imports: {state.imports.length}</p>
          <p className="text-sm">Total extracted transactions: {state.transactions.length}</p>
        </section>
      )}

      {tab === 'import' && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-medium">Import Statements (PDF-first)</h2>
          <input
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={(e) => void handleFiles(e.target.files)}
            disabled={busy}
            className="mb-3 block rounded-md border border-slate-300 bg-white p-2 text-sm"
          />
          {busy && <p className="mb-2 text-sm text-slate-700">Processing PDF files...</p>}
          {message && <p className="mb-2 text-sm text-slate-700">{message}</p>}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-slate-200 px-2 py-2 text-left font-medium">File</th>
                <th className="border-b border-slate-200 px-2 py-2 text-left font-medium">Source</th>
                <th className="border-b border-slate-200 px-2 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {state.imports.map((i) => (
                <tr key={i.id}>
                  <td className="border-b border-slate-200 px-2 py-2">{i.fileName}</td>
                  <td className="border-b border-slate-200 px-2 py-2">{i.sourceType}</td>
                  <td className="border-b border-slate-200 px-2 py-2">
                    {i.warning ? `${i.status} (${i.warning})` : i.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'review' && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-medium">Review Queue ({reviewItems.length})</h2>
          {reviewItems.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
              <p className="font-medium text-slate-800">You’re caught up</p>
              <p className="mt-1">No bank or card lines need a manual match decision right now.</p>
              <p className="mt-2 text-slate-500">When imports leave uncertain settlements, they will appear here in date order.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="mb-2 font-medium text-slate-900">What you’re choosing</p>
                <p className="mb-2">
                  Each item is usually a <strong>bank</strong> line that might pay a <strong>card</strong> bill. Finny
                  could not match it automatically with enough confidence.
                </p>
                <ul className="list-inside list-disc space-y-1 text-slate-600">
                  <li>
                    <strong className="text-slate-800">This paid my card</strong> — Same as confirming the link: the
                    bank line is the card payment, so it is <strong>not</strong> counted again as everyday spending
                    (the card side already reflects the purchase).
                  </li>
                  <li>
                    <strong className="text-slate-800">Something else</strong> — This line is <strong>not</strong>{' '}
                    paying off the card (e.g. a transfer or unrelated payment). Spending rules will treat it as a{' '}
                    <strong>transfer</strong> instead.
                  </li>
                </ul>
              </div>
              {reviewItems.map((item) => {
                const { explanation, sourceFile, markers } = reviewItemDetailLines(
                  item,
                  state,
                  state.profile,
                )
                return (
                <article key={item.id} className="mb-3 rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-950">
                      {explanation.codeLabel}
                    </span>
                    <span className="text-xs text-slate-500">{explanation.code}</span>
                  </div>
                  <p className="text-sm">
                    <strong>{item.description}</strong> — {item.amount.toFixed(2)}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{explanation.humanSummary}</p>
                  {explanation.bestScore !== undefined && (
                    <p className="mt-1 text-xs text-slate-500">
                      Best automatic score: {explanation.bestScore.toFixed(2)} (threshold{' '}
                      {state.profile.confidenceThreshold.toFixed(2)})
                    </p>
                  )}
                  <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                    <li>Type: {item.kind}</li>
                    <li>Source: {sourceFile ?? '—'}</li>
                    {markers.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-left text-sm text-emerald-950 hover:bg-emerald-100"
                      title="Marks this line as paying your card; excluded from double-counting as spend."
                      onClick={() => onResolveReview(item.id, 'confirm')}
                    >
                      <span className="font-medium">This paid my card</span>
                      <span className="mt-0.5 block text-xs font-normal text-emerald-900/90">
                        Don’t count as extra spending (settlement excluded)
                      </span>
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-left text-sm text-amber-950 hover:bg-amber-100"
                      title="Not a card payoff; treat as a transfer for spending logic."
                      onClick={() => onResolveReview(item.id, 'override')}
                    >
                      <span className="font-medium">Something else</span>
                      <span className="mt-0.5 block text-xs font-normal text-amber-900/90">
                        Not paying the card — use transfer treatment
                      </span>
                    </button>
                  </div>
                </article>
              )})}
            </>
          )}
        </section>
      )}

      {tab === 'ledger' && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-medium">Ledger</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-slate-200 px-2 py-2 text-left font-medium">Kind</th>
                <th className="border-b border-slate-200 px-2 py-2 text-left font-medium">Amount</th>
                <th className="border-b border-slate-200 px-2 py-2 text-left font-medium">Status</th>
                <th className="border-b border-slate-200 px-2 py-2 text-left font-medium">Spend impact</th>
              </tr>
            </thead>
            <tbody>
              {state.transactions.map((t) => (
                <tr key={t.id}>
                  <td className="border-b border-slate-200 px-2 py-2">{t.kind}</td>
                  <td className="border-b border-slate-200 px-2 py-2">{t.amount.toFixed(2)}</td>
                  <td className="border-b border-slate-200 px-2 py-2">{t.reconciliationState}</td>
                  <td className="border-b border-slate-200 px-2 py-2">{t.spendImpact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'settings' && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-medium">Rule Profile</h2>
          <label className="mb-2 block text-sm">
            Match window days
            <input
              type="number"
              value={state.profile.matchWindowDays}
              className="ml-2 rounded-md border border-slate-300 px-2 py-1"
              onChange={(e) =>
                void patchState(
                  updateRuleProfile(state, { matchWindowDays: Number(e.target.value) }),
                )
              }
            />
          </label>
          <label className="mb-2 block text-sm">
            Confidence threshold
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={state.profile.confidenceThreshold}
              className="ml-2 rounded-md border border-slate-300 px-2 py-1"
              onChange={(e) =>
                void patchState(
                  updateRuleProfile(state, { confidenceThreshold: Number(e.target.value) }),
                )
              }
            />
          </label>
        </section>
      )}
    </div>
  )
}

export default App
