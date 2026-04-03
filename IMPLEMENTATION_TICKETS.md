# Finny Implementation Tickets (v1)

This document breaks implementation into actionable tickets with dependencies and a recommended execution order.

References:
- [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md)
- [DESIGN_REQUIREMENTS.md](DESIGN_REQUIREMENTS.md)
- [ENGINEERING_REQUIREMENTS.md](ENGINEERING_REQUIREMENTS.md)

## Traceability (PRD / Design)

High-level map from [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) (PRD) and [DESIGN_REQUIREMENTS.md](DESIGN_REQUIREMENTS.md) (DR) to tickets. For full acceptance detail, read each ticket and the spec sections cited.

| Requirement | Ticket(s) | Status / notes |
|-------------|-----------|----------------|
| **FR-1** Local-only | TKT-004, TKT-017, TKT-021 | Runtime local; **NFR-5** user-installable EXE: TKT-021–022. |
| **FR-2** Statement ingestion | TKT-005, TKT-006, TKT-013, TKT-031 | PDF upload + metadata; duplicate skip; **DR §5.2** DnD + reprocess option → **TKT-031**. Statement period as first-class field → **TKT-028** (with FR-3). |
| **FR-3** Transaction normalization | TKT-002, TKT-006–008, **TKT-028** | Today: subset of fields; debit/credit/currency/period/trace → **TKT-028** (+ schema). |
| **FR-4** Ledger + reconciliation states | TKT-002, TKT-004, TKT-009, TKT-011, TKT-015 | Implemented for extracted rows. |
| **FR-5** Settlement detection + confidence | TKT-009, TKT-010, TKT-014, TKT-016, TKT-026 | Implemented. |
| **FR-6** Double-count prevention | TKT-009, TKT-011, TKT-016, **TKT-028**, **TKT-029** | **Partial:** settlement pairing works; PRD “underlying card transactions” need **TKT-028**. **UC-2** transfer chain → **TKT-029**. |
| **FR-7** Manual exceptions | TKT-011, TKT-014, TKT-026, TKT-027 | Implemented (Review + Ledger reopen). |
| **UC-1** UOB settlement | TKT-007, TKT-009 | Implemented for parser-covered markers (narrow; see **Known MVP narrowing**). |
| **UC-2** UOB→DBS→card | **TKT-029**, TKT-028, TKT-023 | Not fully modeled; advanced rules **TKT-023**. |
| **PRD §11** Rule profile | TKT-016, **TKT-023** | MVP: window, threshold, issuer scope; mappings/patterns post-v1 **TKT-023**. |
| **PRD §2.2 / §16** Success + exit criteria | TKT-020, TKT-022 | Goldens + release checklist; tie to AC explicitly in **TKT-020**, **TKT-022**. |
| **NFR-1** Privacy / data location | TKT-004, **TKT-033**, TKT-025 | Show path + trust copy → **TKT-033**. |
| **NFR-2** Performance (incremental reconcile) | — | Full re-reconcile on import today; no dedicated ticket (optional future). |
| **NFR-3** Reliability | TKT-005, TKT-025 | Idempotent import; DB/IPC hardening **TKT-025**. |
| **NFR-4** Explainability | TKT-014, TKT-015, TKT-027 | Detail/review copy; “rule name” depth varies. |
| **NFR-5** Packaged executable | TKT-021, TKT-022 | Backlog. |
| **DR §3.1** Continue monthly close CTA | TKT-012, **TKT-030** | Deterministic routing done; **user-selected month** vs `inferMonthKey` → **TKT-030**. |
| **DR §5.1** Home / coverage / health | TKT-012, TKT-013, **TKT-030** | Coverage + counts; month picker + health strip → **TKT-030**. |
| **DR §5.2** Import UX | TKT-013, **TKT-031** | Per-file outcomes; DnD + duplicate reprocess → **TKT-031**. |
| **DR §5.3** Ledger | TKT-015, **TKT-032** | Filters + detail; sort + month range + badge labels → **TKT-032**. |
| **DR §5.4–5.5** Review + Settings | TKT-014, TKT-016, TKT-026, **TKT-033** | Review done; Settings path/trust **TKT-033**; advanced forms **TKT-023**. |
| **DR §6–7** Reconciliation UX + spend mental model | TKT-014, TKT-015, TKT-028 | Labels/spend model deepen with **TKT-032**, **TKT-028**. |
| **DR §8–9** System states + trust copy | TKT-013, **TKT-033** | Import feedback; data path **TKT-033**. |
| **DR §10** Accessibility | **TKT-034** | Baseline backlog. |
| **DR §2.1** First-run / data dir failure | TKT-004, TKT-025, **TKT-033** | Recovery UX partially; hardening **TKT-025** / surface path **TKT-033**. |
| **ER §7** Parser module (multi-line, boilerplate, IPC contract) | TKT-006–008, **TKT-028**, TKT-025 | Settlement-first parsers today; breadth **TKT-028**; validation/round-trip **TKT-025**. |

### Known MVP narrowing (parsers vs PRD FR-3 / FR-6)

[`statementParser.ts`](finance-tracker/src/parsers/statementParser.ts) today emits only **settlement-shaped** bank lines (e.g. UOB/DBS bill payment blocks), **card payment credit** lines, and **DBS FAST** as `TRANSFER`. It does **not** parse full card purchase grids or general bank ledgers. That is **narrower** than PRD **FR-3** / **FR-6** wording (“underlying card transactions”, full normalization). **TKT-028** is the planned bridge; until then, traceability marks FR-6 as **partial**.

## Current Implementation Reality (Snapshot)

- Frontend stack is React + TypeScript + Vite, packaged via Tauri.
- Tailwind CSS is already integrated (via PostCSS) and current UI styling uses utility classes.
- Core logic lives in `appServices/`, `parsers/`, `reconcile/`, `storage/`; `App.tsx` composes UI and wires storage.
- Persistence: Tauri uses SQLite under the app data directory (`src-tauri/src/db.rs`); development is **Tauri-only** (no standalone-browser persistence path).
- Initial load and save failures surface in the UI (empty workspace fallback on load failure; optimistic save with rollback on write failure).
- **Dev workflow:** Tauri-only (`npx tauri dev`). The browser-localStorage adapter and factory were removed; standalone `npm run dev` in a tab is not a supported persistence path.
- **Ledger scope (PRD):** **Settlement-first** — imported rows are primarily bank settlements, card payment credits, and DBS FAST transfers; not a full statement line-item ledger. Full extraction is **TKT-028**.
- **Imports:** SHA-256 file hash on each import (SQLite `content_hash`); duplicate successful files are **skipped** (non-destructive). No duplicate-file **reprocess** UX yet — **TKT-031**. Transaction fingerprints dedupe re-imported rows. Parsing goes through `runStatementPipeline` → `parseTransactionsForSource` by source type.
- **Reconciliation:** `matchWindowDays` filters bank↔card candidates when both transaction dates parse; `statementDate` normalises common formats to ISO in parsers when possible.
- **Home / month (DR §5.1):** `monthKey` is **inferred** from latest successful import timestamps (`inferMonthKey` in `monthlyClose.ts`), not user-selected — **TKT-030**.
- **Settings / trust (DR §9, NFR-1):** App data path surfaced to users and “open folder” are not fully covered — **TKT-033** (persistence hardening: **TKT-025**).
- **Process:** New behavior follows **test-driven development** (see [Test-driven development](#test-driven-development-policy)); each backlog ticket states how TDD applies.

## Ticket Legend

- Priority: `P0` (must-have), `P1` (important), `P2` (nice-to-have for v1 hardening)
- Type: `Foundation`, `Backend`, `Frontend`, `Quality`, `Release`
- **TDD:** Every ticket includes a **TDD** line. Behavior-changing work uses red → green → refactor; details and exemptions are in [Test-driven development](#test-driven-development-policy).

## Test-driven development (policy)

Finny treats **test-driven development** as the default way to land code: express the requirement as an automated check first, implement until it passes, then refactor with tests green.

### Workflow

1. **Red:** Add or extend an automated test that fails under the current code (or documents a bug).
2. **Green:** Implement the smallest change that makes the suite pass (including `npm run test` in `finance-tracker`, and `cargo test` in `src-tauri` when Rust changes).
3. **Refactor:** Improve structure without changing behavior, keeping tests green.

Tests should land in the **same change** as the implementation (same PR / same merge), not in a follow-up unless the ticket explicitly splits “spike” vs “harden” (avoid shipping untested behavior).

### Where tests live

| Area | Convention |
|------|------------|
| TypeScript logic, parsers, services, UI-free hooks | Vitest: `src/**/*.test.ts` (see [Automated unit tests](#automated-unit-tests-vitest)) |
| Rust DB, migrations, IPC | `cargo test` / integration tests (see TKT-025, TKT-019) |
| React UI | Prefer extracting testable logic into functions covered by Vitest; add component or E2E coverage when the ticket is UI-primary (TKT-013–015) |

### Definition of Done (with TDD)

- A ticket is not **DONE** until its **TDD** acceptance is met: new or fixed behavior has matching automated coverage, and documented manual steps are only allowed where the policy exempts automation.
- **Legacy tickets** already marked DONE before this policy were not all implemented with TDD; any **reopen** or **follow-up** on those areas must follow this policy. Backfill coverage is tracked under TKT-018, TKT-019, and TKT-025 as appropriate.

### Tickets whose primary output is tests or release glue

- **TKT-018 / TKT-019 / TKT-020:** Deliverable is the suite or golden outputs — still follow red → green (add failing scenario first, then implement or fix production code until green).
- **TKT-021:** Automate what is practical (e.g. CI build of the installer); document repeatable manual smoke where automation is costly.
- **TKT-022:** Checklist must explicitly include **all automated tests passing**; other items may remain manual sign-off.

### Exemptions

- **Documentation-only** edits (no code or config that affects build/runtime) do not require new tests.
- **TKT-022** does not require new test *code* by itself, but must require verification that existing suites pass.

## Automated unit tests (Vitest)

Run from `finance-tracker`: `npm run test` (or `npm run test:watch`). Tests live under `src/**/*.test.ts` with shared text fixtures in `src/test/fixtures/statements.ts`.

| Ticket | Test file(s) | What is covered |
|--------|---------------|-----------------|
| **TKT-005** | `utils/fileHash.test.ts`, `import/transactionFingerprint.test.ts`, `appServices/finnyApp.test.ts` | SHA-256 hex helper; fingerprint stability/set; duplicate file skip, failed-import retry, duplicate row skip on re-import |
| **TKT-006** | `parsers/pipeline.test.ts`, `parsers/statementParser.test.ts` | Source detection; `runStatementPipeline` warnings and dispatch |
| **TKT-007** | `parsers/statementParser.test.ts` (+ fixtures) | Fixture-driven UOB bank/card line patterns (not full PDF corpus) |
| **TKT-008** | `parsers/statementParser.test.ts` (+ fixtures) | Fixture-driven DBS bank/card/FAST-style lines (not full PDF corpus) |
| **TKT-009** | `reconcile/reconcile.test.ts` | Ref-based `AutoMatched`; no match / ambiguous `NeedsReview`; `confidenceThreshold` behavior |
| **TKT-010** | `utils/statementDate.test.ts`, `reconcile/reconcile.test.ts` | `parseStatementDate` / ISO + DD/MM/YYYY + month-name; `matchWindowDays` gates candidates in `reconcile`; parsers emit ISO when parse succeeds |
| **TKT-011** | `appServices/finnyApp.test.ts` | `resolveReviewItem` confirm vs override; linked counterpart updated in sync; override clears `linkedTransactionId` |
| **TKT-012** | `appServices/monthlyClose.test.ts` | `getMonthlyCloseSummary` (four sources, FAILED imports ignored); `getReviewQueue` + ordering (see TKT-014); `inferMonthKey` + `getMonthlyStatus` (ER §11) |
| **TKT-018** | *See rows above*; `reconcile.test.ts` | Parser + pipeline + reconcile + fingerprint/hash + monthly close + import orchestration; reconcile: linked `AutoMatched`/`UserConfirmed` stable on re-run, one card → one bank; gaps: deeper parser edge cases, golden outputs (TKT-020) |
| **TKT-013** | `appServices/importDisplay.test.ts`, `appServices/finnyApp.test.ts` | Import row outcome (`success` / `partial` / `failed`), failure taxonomy hints; `ImportPdfResult.session` (duplicate files + skipped txn rows); UI copy in `App.tsx` import tab |
| **TKT-014** | `reconcile/reviewExplain.test.ts`, `appServices/monthlyClose.test.ts` | Review reason codes (`NO_COUNTERPART_IN_WINDOW`, `DATE_OUTSIDE_MATCH_WINDOW`, `LOW_CONFIDENCE`, `AMBIGUOUS_CANDIDATES`, `CARD_CREDIT_UNMATCHED`); markers + import file; stable review queue sort |
| **TKT-015** | `appServices/ledgerView.test.ts` | `filterLedgerTransactions` (source / needs review / settlement-only); `buildLedgerDetailModel` (import trace, link peer, review vs reconciled copy) |
| **TKT-019** | `appServices/finnyApp.test.ts`, `appServices/finnyApp.integration.test.ts` | Import → reconcile (incl. DBS auto-match chain), `ImportPdfResult.session` dedupe signals, monthly status → `resolveReviewItem` → `VIEW_SUMMARY`; **no** SQLite / IPC round-trip (TKT-025) |
| **TKT-024** | `appServices/finnyApp.test.ts` | Service-layer import and review/profile helpers under test |
| **TKT-016** | `reconcile/settlementCandidates.test.ts`, `reconcile/reconcile.test.ts`, `reconcile/reviewExplain.test.ts`, `appServices/finnyApp.test.ts` | `sameIssuerCardMatchingOnly` scopes settlement candidates; SQLite `rule_profile` column; Settings UI |
| **TKT-026** | `appServices/settlementReview.test.ts` | `listSettlementCardCandidates`, `confirmSettlementPair` (link + remap); `matchBankAgainstCards` includes card already linked to same bank; Review tab pairing UI in `App.tsx` |
| **TKT-027** | `appServices/settlementReview.test.ts`, `appServices/ledgerView.test.ts` | `reopenSettlementForReview` (unlink + `NeedsReview` both sides); `ledgerBankSettlementCanReopenForReview`; Ledger detail action in `App.tsx` → Review tab |
| **TKT-020** | `test/goldens/goldens.test.ts`, `test/goldens/*.expected.json` | Deterministic import → reconcile snapshots: DBS ref+amount AutoMatched pair; UOB same amount/date below auto-match threshold (NeedsReview) |
| **TKT-028–034** | — | **Backlog** — add Vitest (or manual verification in TKT-022) per ticket when implementation starts. |

Tickets not listed here have **no** dedicated automated tests in the repo yet.

## Ticket Backlog

### TKT-001 - Restructure app into modules
- **Status:** DONE
- **Priority:** P0
- **Type:** Foundation
- **TDD:** Required per [Test-driven development](#test-driven-development-policy).
- **Description:** Split current monolithic `App.tsx` into module boundaries: `parsers`, `reconcile`, `storage`, `domain`, `ui` to align with architecture requirements.
- **Acceptance criteria:**
  - `App.tsx` contains composition and UI flow only.
  - Parsing/reconciliation/storage logic moved into separate files.
  - App behavior unchanged after refactor.
- **Dependencies:** None

### TKT-002 - Add domain model and shared types package
- **Status:** DONE
- **Priority:** P0
- **Type:** Foundation
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); exercise types via consumer tests (parsers, services, or contract tests), not “types-only” trivia.
- **Description:** Create canonical domain types (`ImportRecord`, `Transaction`, `ReconciliationLink`, `RuleProfile`, `MonthlyStatus`, enums).
- **Acceptance criteria:**
  - All modules consume shared types from one location.
  - No duplicate ad-hoc type definitions.
- **Dependencies:** TKT-001

### TKT-003 - Introduce storage abstraction layer
- **Status:** DONE
- **Priority:** P0
- **Type:** Foundation
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); verify behavior with a fake or mock adapter and/or integration tests (TKT-019/025).
- **Description:** Define `StorageAdapter` interface with methods for imports, transactions, links, settings, monthly status.
- **Acceptance criteria:**
  - UI and services depend on the storage interface, not on SQLite or IPC details.
- **Dependencies:** TKT-001, TKT-002

### TKT-004 - Implement Tauri SQLite persistence
- **Status:** DONE
- **Priority:** P0
- **Type:** Backend
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); Rust-side tests (temp DB, migrations, round-trip) per TKT-025 — land failing test first for new schema or IPC behavior.
- **Description:** Persist application state in Tauri-side SQLite with schema migrations.
- **Acceptance criteria:**
  - App data persists in SQLite file in local app directory.
  - Tables for imports, transactions, reconciliation links, rule profile, monthly status.
  - Migration path exists from empty DB to current schema.
- **Dependencies:** TKT-003

### TKT-025 - Persistence and IPC contract hardening
- **Priority:** P1
- **Type:** Quality / Backend
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); acceptance criteria tests drive contract and migration fixes (red → green in Rust first where feasible).
- **Description:** Follow-up work after SQLite integration: reduce drift and operational risk beyond the v0 vertical slice.
- **Acceptance criteria:**
  - **Domain parity:** Rust `AppState` (`src-tauri/src/state.rs`) and TypeScript `domain/types.ts` stay aligned (choose one: generated types from a single source, JSON Schema validation on IPC, or automated contract / round-trip tests).
  - **Validation:** Reject or normalize invalid enum strings and malformed payloads at the Tauri command boundary before writing SQL (today many fields are untyped `String` in Rust).
  - **Write strategy:** Document or replace full table replace on each save if ledger size requires incremental upserts; measure or cap worst-case save time.
  - **Links invariant:** Either enforce or document the relationship between `transactions.linked_transaction_id` and rows in `reconciliation_links` (links are currently derived from bank settlement rows on save).
  - **Tests:** Add at least one Rust integration test: temp file DB, run migrations, save and reload `AppState` (complements TKT-018/019).
  - **IPC validation:** Enforce valid enums / payload shape at Tauri command boundary per acceptance above (reduces serde/SQL corruption risk).
  - **Data directory:** Startup and recovery behavior aligned with [DESIGN_REQUIREMENTS.md](DESIGN_REQUIREMENTS.md) **§2.1** and [ENGINEERING_REQUIREMENTS.md](ENGINEERING_REQUIREMENTS.md) data-path expectations; user-visible path surfacing is **TKT-033** (avoid duplicating product copy in Rust-only changes).
- **Dependencies:** TKT-004

### TKT-005 - Implement idempotent import guardrails
- **Status:** DONE
- **Priority:** P0
- **Type:** Backend
- **TDD:** Required per [Test-driven development](#test-driven-development-policy).
- **Description:** Add file-hash based duplicate detection and normalized transaction hash dedupe to prevent duplicate rows on re-import.
- **Unit tests:** `fileHash.test.ts`, `transactionFingerprint.test.ts`, `finnyApp.test.ts` (see [Automated unit tests](#automated-unit-tests-vitest)).
- **Acceptance criteria:**
  - Re-importing same file adds no duplicate transactions.
  - Duplicate import result is visible to user as non-destructive outcome.
- **Dependencies:** TKT-004

### TKT-006 - Build parser pipeline framework
- **Status:** DONE
- **Priority:** P0
- **Type:** Backend
- **TDD:** Required per [Test-driven development](#test-driven-development-policy).
- **Description:** Introduce parser contract and parser registry by source type (`UOB_BANK`, `UOB_CARD`, `DBS_BANK`, `DBS_CARD`).
- **Unit tests:** `pipeline.test.ts`, `statementParser.test.ts`.
- **Acceptance criteria:**
  - `parse(file) -> ParsedDocument + ParsedEvents + warnings`.
  - Source detection and parser dispatch are isolated from UI.
- **Dependencies:** TKT-001, TKT-002

### TKT-007 - Harden UOB PDF parsers (bank + card)
- **Status:** DONE (fixture-level coverage; full PDF corpus not required for v1)
- **Priority:** P0
- **Type:** Backend
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); add fixture text and failing parser expectations before changing extraction logic.
- **Scope / PRD note:** MVP delivery here is **settlement and card payment-line patterns** (bill pay, card credits, etc.), not a full statement grid. Full line-item extraction for **FR-3** / **FR-6** is **TKT-028** and must not be assumed complete from “Harden UOB parsers” alone.
- **Description:** Implement robust UOB extraction using section-aware parsing, multiline handling, and boilerplate filtering.
- **Unit tests:** `statementParser.test.ts` + `src/test/fixtures/statements.ts` (text snippets only; not full PDF golden files).
- **Acceptance criteria:**
  - Extract known UOB settlement/payment markers reliably.
  - Ignore non-transaction page noise.
  - Sample UOB PDFs parse into expected records.
- **Dependencies:** TKT-006, TKT-004

### TKT-008 - Harden DBS/POSB PDF parsers (bank + card)
- **Status:** DONE (fixture-level coverage; full PDF corpus not required for v1)
- **Priority:** P0
- **Type:** Backend
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); add fixture text and failing parser expectations before changing extraction logic.
- **Scope / PRD note:** Same as **TKT-007** — fixture-level **settlement / payment / FAST** shapes; full ledger lines → **TKT-028**.
- **Description:** Implement robust DBS/POSB extraction, including consolidated statement section filtering and reference extraction.
- **Unit tests:** `statementParser.test.ts` + fixtures (text snippets only; not full PDF golden files).
- **Acceptance criteria:**
  - Extract DBS bill payment markers and `REF`/`REF NO`.
  - Exclude SRS/informational sections from deposit ledger rows.
  - Sample DBS PDFs parse into expected records.
- **Dependencies:** TKT-006, TKT-004

### TKT-009 - Implement deterministic reconciliation engine v1
- **Status:** DONE
- **Priority:** P0
- **Type:** Backend
- **TDD:** Required per [Test-driven development](#test-driven-development-policy).
- **Description:** Build reconciliation service with one-to-one default and review fallback, confidence scoring, and explainability payload.
- **Unit tests:** `reconcile.test.ts`.
- **Acceptance criteria:**
  - Supports UOB and DBS matching evidence.
  - `NeedsReview` on ambiguous/low-confidence cases.
  - Produces spend-impact tags and state transitions.
- **Dependencies:** TKT-007, TKT-008

### TKT-010 - Implement real date normalization and match window logic
- **Status:** DONE
- **Priority:** P0
- **Type:** Backend
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); add failing `reconcile` (or date-helper) tests for window boundaries before changing matching logic.
- **Description:** Parse transaction dates into structured values and apply `matchWindowDays` in candidate matching.
- **Unit tests:** `statementDate.test.ts`, `reconcile.test.ts` (match-window inclusion/exclusion); parsers use `statementDate` for ISO-normalised `Transaction.date` when recognised.
- **Acceptance criteria:**
  - Date parsing is deterministic for supported formats.
  - `matchWindowDays` actively affects reconciliation outcomes.
- **Dependencies:** TKT-009

### TKT-011 - Implement review actions with linked-state integrity
- **Status:** DONE
- **Priority:** P0
- **Type:** Backend/Frontend
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); extend service or integration tests before changing link persistence semantics.
- **Description:** Ensure confirm/override decisions update both sides of a link (where applicable) and persist explainability.
- **Unit tests:** `finnyApp.test.ts` (`resolveReviewItem` including linked-bank/card symmetry; SQLite persistence still TKT-025).
- **Acceptance criteria:**
  - Review actions maintain consistent link state.
  - State transitions follow `AutoMatched`, `NeedsReview`, `UserConfirmed`, `UserOverridden`.
- **Dependencies:** TKT-009, TKT-004

### TKT-012 - Home status service (`Continue monthly close`)
- **Status:** DONE
- **Priority:** P0
- **Type:** Backend/Frontend
- **TDD:** Required per [Test-driven development](#test-driven-development-policy).
- **Description:** Implement deterministic monthly status contract (`IMPORT_MISSING`, `RESOLVE_REVIEW`, `VIEW_SUMMARY`) and reason text (`getMonthlyStatus` + `inferMonthKey` in `monthlyClose.ts`; Home uses `reasonText` and `monthKey`).
- **Unit tests:** `monthlyClose.test.ts`.
- **Acceptance criteria:**
  - Home CTA route reason matches status contract.
  - Status computed from imports + unresolved review counts.
- **Gap / follow-up:** `inferMonthKey` is **not** a user-selected month; [DESIGN_REQUIREMENTS.md](DESIGN_REQUIREMENTS.md) **§5.1** / **§3.1** month picker and health strip → **TKT-030**.
- **Dependencies:** TKT-005, TKT-011

### TKT-013 - Import UI hardening and feedback states
- **Status:** DONE
- **Priority:** P1
- **Type:** Frontend
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); cover user-visible outcomes with component tests, Vitest-tested view-model helpers, or a thin E2E/smoke path — avoid merging UI-only behavior with no automated check.
- **Description:** Improve import screen with per-file status, warnings, duplicate/reprocess messaging, and failure categories.
- **Unit tests:** `importDisplay.test.ts`; `finnyApp` returns `session` on success; import tab in `App.tsx` (badges, banner, legend).
- **Acceptance criteria:**
  - User can distinguish success, partial, failed, duplicate outcomes.
  - Non-transaction section handling surfaces as info, not fatal errors.
  - Styling implementation remains Tailwind-first (no new legacy stylesheet dependency).
- **Gap / follow-up:** [DESIGN_REQUIREMENTS.md](DESIGN_REQUIREMENTS.md) **§5.2** drag-and-drop and **§4.2** duplicate **reprocess** vs dismiss — **TKT-031**; PRD **FR-2** idempotent messaging alignment.
- **Dependencies:** TKT-007, TKT-008, TKT-005

### TKT-014 - Review queue UX hardening
- **Status:** DONE
- **Priority:** P1
- **Type:** Frontend
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); same stack expectations as TKT-013 (extracted logic in Vitest where possible).
- **Description:** Add reason codes, confidence, extracted markers (card token/reference), stable ordering, and empty state polish.
- **Unit tests:** `reconcile/reviewExplain.test.ts`, `monthlyClose.test.ts` (queue sort); shared scoring in `reconcile/settlementCandidates.ts` (used by `reconcile.ts`).
- **Acceptance criteria:**
  - Each review item shows what/why/spend impact.
  - Supports confirm + override flows cleanly.
- **Dependencies:** TKT-011

### TKT-026 - Manual settlement pairing and link remap (FR-7 / Scenario C)
- **Status:** DONE
- **Priority:** P1
- **Type:** Frontend / Application services
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); failing Vitest for `resolveReviewItem` (or successor) and review-queue helpers before UI wiring; optional integration scenario in `finnyApp.integration.test.ts`.
- **Unit tests:** `appServices/settlementReview.test.ts`.
- **Description:** Close the gap versus [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) **FR-7** (“confirm, reject, or **remap** settlement **links**”), **Scenario C** (user **remaps** link), and [DESIGN_REQUIREMENTS.md](DESIGN_REQUIREMENTS.md) Review actions (“**Pick another candidate**”, confirm suggested link). Today, confirm/override on an **unlinked** bank settlement only updates spend semantics and does **not** create a `linkedTransactionId`; users cannot choose which card credit pairs with a settlement.
- **Acceptance criteria:**
  - For a `NeedsReview` `BANK_SETTLEMENT` with no link, the Review UI offers a **concrete pairing path**: show ranked/eligible `CARD_CREDIT` candidates (reuse `matchBankAgainstCards` / same gates as auto-match, e.g. amount, match window, issuer scope from rule profile) and let the user **select one** and confirm, setting **bidirectional** `linkedTransactionId` and `UserConfirmed` / `SETTLEMENT_EXCLUDED` on both sides (aligned with TKT-011 symmetry).
  - When the engine suggested a single best candidate but below threshold, surface it as the **default selection**; user can pick another eligible candidate or proceed with override (“not settlement”) as today.
  - **Remap:** If a bank line is already linked (e.g. user corrects a wrong auto-match), user can change the paired card to another eligible line or clear the link per product rules; persisted state stays consistent on save/reload (see **TKT-025** links invariant).
  - Re-import / re-run `reconcile` must not destroy **user-confirmed** links (existing `eligibleForSettlementAutoMatch` behavior remains; extend tests if remap introduces new edge cases).
- **Dependencies:** TKT-011, TKT-014, TKT-009, TKT-016
- **Follow-up:** **TKT-027** — entry point to correct wrong **auto** matches that never appear in Review.

### TKT-027 - Reopen or remap AutoMatched settlements (Ledger entry)
- **Status:** DONE
- **Priority:** P2
- **Type:** Frontend / Application services
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); Vitest for any new `appServices` helpers before UI; extend `ledgerView` tests if logic lives there.
- **Description:** **TKT-026** covers manual pairing for **`NeedsReview`** bank settlements. **`AutoMatched`** (and optionally **`UserConfirmed`**) linked pairs do **not** appear in the Review queue, so a user cannot fix a mistaken auto-link without editing raw state. Add a **Ledger**-based path (and/or a dedicated “linked settlements” surface) to **reopen** a settlement for review or **jump into remap** using the same candidate list and `confirmSettlementPair` as TKT-026.
- **Acceptance criteria:**
  - From Ledger detail (or equivalent), user can act on a `BANK_SETTLEMENT` that is `AutoMatched` or `UserConfirmed` and has `linkedTransactionId`: e.g. **“Change pairing”** / **“Send to review”** with clear copy aligned to [DESIGN_REQUIREMENTS.md](DESIGN_REQUIREMENTS.md) Review actions.
  - Action puts bank (and previously linked card, if applicable) into a state where the user can pick another candidate or override — **without** breaking idempotent re-import or `eligibleForSettlementAutoMatch` invariants (document behavior if `reconcile` runs after reopen).
  - Persisted state round-trips through SQLite (TKT-004); no orphaned `linked_transaction_id` (TKT-025 links invariant).
- **Dependencies:** TKT-026, TKT-015, TKT-011

### TKT-028 - Full statement line extraction and FR-6 ledger depth
- **Status:** TODO
- **Priority:** P0
- **Type:** Backend / Foundation
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); Vitest fixtures and parser/reconcile tests before expanding extraction; schema changes paired with Rust/IPC alignment (**TKT-025**) when types change.
- **Description:** Extend parsers and domain model so the ledger can include **general** bank and card statement line items (purchases, fees, other credits/debits), not only settlement/payment/FAST patterns. Enables PRD **FR-3** (full normalization: direction, currency, identifiers where feasible), **FR-6** (spend totals using underlying card lines + linked settlement exclusion), and **Scenario A** steps 2–5 as written. Optional follow-up: split into UOB vs DBS delivery milestones if scope is too large.
- **Acceptance criteria:**
  - Card and/or bank PDF text extracts additional normalized rows beyond current `BANK_SETTLEMENT` / `CARD_CREDIT` / `TRANSFER` settlement scope, with Vitest fixture coverage per institution.
  - `Transaction` / `TransactionKind` (or equivalent) extended as needed; migration + SQLite persistence remain consistent (**TKT-004** / **TKT-025**).
  - Reconciliation and `spendImpact` rules updated so double-count semantics match **FR-6** for imported line items (document behavior in tests).
  - **TKT-020** spend-total goldens can credibly reference this work (may remain incremental until a defined MVP subset is extracted).
- **Dependencies:** TKT-002, TKT-006, TKT-007, TKT-008, TKT-009

### TKT-029 - UC-2 transfer chain (UOB→DBS) detection and classification
- **Status:** TODO
- **Priority:** P1
- **Type:** Backend / Application services
- **TDD:** Required; integration or service tests for UC-2 scenarios before UI promises.
- **Description:** Implement PRD **UC-2**: treat inter-bank transfer (e.g. salary in UOB, transfer UOB→DBS, DBS card payment from DBS) as **account movement / transfer**, not spend, in line with **FR-6**. Coordinate with **TKT-028** (needs parser evidence for transfer lines) and **TKT-023** (full pattern/salary configuration post–v1); MVP may ship a **minimal** deterministic slice (e.g. specific narration + amount window) before advanced rule UI.
- **Acceptance criteria:**
  - Documented test scenario(s) matching UC-2 narrative produce expected `spendImpact` / reconciliation labels (no double-count vs settlement).
  - Rule profile or engine hooks allow future expansion without breaking existing settlement matching (**TKT-009**).
- **Dependencies:** TKT-016, TKT-009; **TKT-028** (or narrower parser hooks agreed in ticket scope)

### TKT-030 - Design parity: Home month context and health strip
- **Status:** TODO
- **Priority:** P1
- **Type:** Frontend / Application services
- **TDD:** Required; extend `monthlyClose` tests for selected-month semantics before UI.
- **Description:** Close gaps vs [DESIGN_REQUIREMENTS.md](DESIGN_REQUIREMENTS.md) **§5.1** and **§3.1**: user-visible **month selection** (or explicitly documented alternative if product defers), **last successful import** / **parser warning** aggregates on Home, and **review count** tied to the same month context as the CTA.
- **Acceptance criteria:**
  - Home reflects Design **§5.1** checklist and CTA contract **§3.1** for the chosen month scope.
  - `getMonthlyStatus` / `getMonthlyCloseSummary` (or successors) behave deterministically with tests.
- **Dependencies:** TKT-012, TKT-013

### TKT-031 - Design parity: Import drag-and-drop and duplicate reprocess
- **Status:** TODO
- **Priority:** P2
- **Type:** Frontend
- **TDD:** Required where behavior changes (e.g. view-model for duplicate choice); smoke acceptable for pure DnD wiring if covered manually in **TKT-022**.
- **Description:** [DESIGN_REQUIREMENTS.md](DESIGN_REQUIREMENTS.md) **§5.2** and **§4.2**: **drag-and-drop** upload zone; when a duplicate file is detected, offer **reprocess** vs **dismiss** (per PRD **FR-2** idempotent story), not only silent skip — align copy with product.
- **Acceptance criteria:**
  - User can add files via drag-and-drop and file picker.
  - Duplicate-file path documents user choice and outcome; no silent ambiguity.
- **Dependencies:** TKT-005, TKT-013

### TKT-032 - Design parity: Ledger sort, month range, reconciliation badges
- **Status:** TODO
- **Priority:** P2
- **Type:** Frontend
- **TDD:** Prefer Vitest for sort/filter helpers extracted from `App.tsx`.
- **Description:** [DESIGN_REQUIREMENTS.md](DESIGN_REQUIREMENTS.md) **§5.3** and **§6**: **sortable** ledger columns; **month range** (or month) filter; reconciliation **badges/labels** aligned with suggested mapping (Matched / Needs review / Confirmed / Edited by you).
- **Acceptance criteria:**
  - Table supports at least date and amount sort (or documented MVP subset).
  - Filter restricts rows by month or range as specified in AC.
  - Labels match Design **§6** table or documented waiver in **TKT-022**.
- **Dependencies:** TKT-015

### TKT-033 - Settings: data location, trust copy, optional open folder
- **Status:** TODO
- **Priority:** P1
- **Type:** Frontend / Backend
- **TDD:** Required for any new IPC/command; UI copy may be manual sign-off in **TKT-022**.
- **Description:** [DESIGN_REQUIREMENTS.md](DESIGN_REQUIREMENTS.md) **§9**; PRD **NFR-1**: show **application data directory** path in Settings; short **local-only** trust copy; **open folder** affordance when Tauri exposes a safe API. Complements **TKT-025** (persistence/recovery) without duplicating Rust migration work — this ticket is **user-visible path + UX**.
- **Acceptance criteria:**
  - User can read where data lives; optional open-in-explorer when supported.
  - First-run / unreadable path errors remain consistent with **DR §2.1** (coordinate **TKT-025** if recovery flow changes).
- **Dependencies:** TKT-004

### TKT-034 - Accessibility baseline (keyboard + non-color status)
- **Status:** TODO
- **Priority:** P2
- **Type:** Frontend / Quality
- **TDD:** Manual checklist in **TKT-022** or lightweight automation if introduced; no exemption from documenting verification steps.
- **Description:** [DESIGN_REQUIREMENTS.md](DESIGN_REQUIREMENTS.md) **§10**: keyboard operability for **upload**, **navigation**, **review actions**; reconciliation status not conveyed by **color alone** (text/icon pairing).
- **Acceptance criteria:**
  - Primary flows operable without mouse (documented key paths).
  - Status badges include text (or aria) consistent with Design **§10**.
- **Dependencies:** TKT-013, TKT-015

### TKT-015 - Ledger + detail explainability view
- **Status:** DONE
- **Priority:** P1
- **Type:** Frontend
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); same stack expectations as TKT-013 (extracted logic in Vitest where possible).
- **Description:** Add ledger filters and detail drawer/page with source trace and reconciliation explanation contract.
- **Unit tests:** `appServices/ledgerView.test.ts`; UI in `App.tsx` (ledger tab: filters, table + sticky detail panel); reuses `reviewItemDetailLines` for `NeedsReview` rows.
- **Acceptance criteria:**
  - Filter by account/source, needs review, settlement-related.
  - Transaction detail shows source import + reasoning payload.
  - Reusable UI primitives are used where feasible (for example panel/table/button patterns), implemented in Tailwind-friendly components.
- **Gap / follow-up:** [DESIGN_REQUIREMENTS.md](DESIGN_REQUIREMENTS.md) **§5.3** sortable columns, month range filter, and **§6** user-facing reconciliation labels — **TKT-032**.
- **Dependencies:** TKT-011

### TKT-016 - Rule profile settings (MVP-minimum)
- **Status:** DONE
- **Priority:** P1
- **Type:** Frontend/Backend
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); failing tests for persistence + reconciliation effect (Vitest and/or Rust integration) before implementation.
- **Description:** Finalize MVP settings for match window, confidence threshold, and card payment source mappings.
- **Unit tests:** `reconcile/settlementCandidates.test.ts`, `reconcile/reconcile.test.ts`, `reconcile/reviewExplain.test.ts`, `appServices/finnyApp.test.ts`.
- **Acceptance criteria:**
  - Settings persist via storage layer.
  - Changes influence reconciliation behavior.
- **Dependencies:** TKT-009, TKT-010, TKT-004

### TKT-023 - Advanced rule profile options (Post-v1)
- **Priority:** P2
- **Type:** Frontend/Backend
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); same as TKT-016 — tests first for rule evaluation and persistence.
- **Description:** Add advanced configurable rules such as transfer patterns, salary source account, and richer description pattern controls.
- **Acceptance criteria:**
  - Advanced fields are configurable and validated.
  - Changes are traceable and do not regress deterministic rule precedence.
- **Dependencies:** TKT-016, TKT-014

### TKT-024 - Introduce application service boundary
- **Status:** DONE
- **Priority:** P0
- **Type:** Foundation
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); new service entry points ship with Vitest coverage in the same change.
- **Description:** Add an `appServices` layer so UI calls use-case functions only (for example `importStatements`, `resolveReviewItem`, `getMonthlyStatus`) and does not orchestrate parser/reconcile/storage directly.
- **Unit tests:** `finnyApp.test.ts`, `monthlyClose.test.ts`.
- **Acceptance criteria:**
  - `App.tsx` (and future UI components) consume service methods instead of directly calling parser/reconcile/storage modules.
  - Service layer owns orchestration order and error mapping for import and review workflows.
  - Module dependencies become one-directional: `ui -> appServices -> domain/infrastructure`.
- **Dependencies:** TKT-001, TKT-002, TKT-003

### TKT-017 - Security baseline for Tauri app
- **Status:** DONE
- **Priority:** P1
- **Type:** Quality
- **TDD:** Required per [Test-driven development](#test-driven-development-policy); config changes must keep **CI build / dev smoke** green (failing pipeline = red); document any manual security verification in acceptance criteria.
- **Description:** Replace `csp: null` with least-privilege CSP and verify no unnecessary capabilities.
- **Acceptance criteria:**
  - Tauri config has explicit CSP policy.
  - App still runs and builds successfully.
- **Dependencies:** TKT-001

### TKT-018 - Unit tests for parser and reconciliation core
- **Priority:** P0
- **Type:** Quality
- **TDD:** Required — primary deliverable is tests; add failing cases first, then fix code until green ([Test-driven development](#test-driven-development-policy)).
- **Status:** IN PROGRESS — Vitest suite in `finance-tracker` covers detection, pipeline, fixture-based UOB/DBS lines, reconcile scoring (including TKT-010 match window), fingerprints, file hash, monthly close, and `importPdfStatements` / `resolveReviewItem` (see [Automated unit tests](#automated-unit-tests-vitest)). Reconcile hardening: re-`reconcile` leaves linked `AutoMatched` / `UserConfirmed` pairs unchanged; one-to-one consumption when two banks compete for one card. Remaining: broader parser edge cases; **full statement line extraction** (**TKT-028**) is the main driver for tests beyond settlement-shaped lines; optional golden outputs (**TKT-020**).
- **Description:** Add unit tests for source detection, parser extraction, date normalization, matching precedence, and review fallback.
- **Acceptance criteria:**
  - Test suite covers UOB and DBS sample-driven cases.
  - Failing tests reproduce known edge cases.
- **Dependencies:** TKT-007, TKT-008, TKT-009, TKT-010

### TKT-019 - Integration tests for import->reconcile->review
- **Status:** DONE (service-layer integration in Vitest; persisted DB round-trip: **TKT-025**)
- **Priority:** P0
- **Type:** Quality
- **TDD:** Required — integration scenarios written as failing tests first, then wiring until green ([Test-driven development](#test-driven-development-policy)).
- **Description:** Build integration tests validating end-to-end pipeline and state persistence.
- **Unit / integration tests:** `finnyApp.test.ts` plus `finnyApp.integration.test.ts` (import → reconcile → `getMonthlyStatus` → `resolveReviewItem`, DBS matched-pair happy path, partial import set). **No** automated SQLite/Tauri round-trip yet (see TKT-025).
- **Acceptance criteria:**
  - Re-import idempotency verified.
  - Review actions and monthly status flow verified.
- **Dependencies:** TKT-005, TKT-011, TKT-012

### TKT-020 - Acceptance test fixtures and golden outputs
- **Status:** DONE (settlement-focused goldens; FR-6 / spend-total goldens remain coordinated with **TKT-028**)
- **Priority:** P0
- **Type:** Quality
- **TDD:** Required — check in expected golden output (or snapshot) first or alongside parser/reconcile changes so CI fails on drift ([Test-driven development](#test-driven-development-policy)).
- **Unit tests:** `src/test/goldens/goldens.test.ts` + `src/test/goldens/*.expected.json` (see [Automated unit tests](#automated-unit-tests-vitest)).
- **Description:** Add anonymized fixtures and expected outputs for UOB/DBS settlement + transfer scenarios. Tie goldens to PRD **§2.2** success metrics (e.g. no double-count in dataset) and **§16 MVP exit** / **Scenario A** acceptance — especially **§16** items 3–4 (settlement detection, spend totals). **Spend-level** goldens may depend on **TKT-028** progress; settlement-only goldens can proceed earlier.
- **Acceptance criteria:**
  - Golden files maintained for expected links/totals.
  - CI check compares outputs deterministically.
  - Checklist in **TKT-022** can reference these artifacts as evidence for PRD **§16** sign-off.
- **Dependencies:** TKT-018, TKT-019; coordinate **TKT-028** for FR-6-level totals when applicable

### TKT-021 - Windows packaging and installer smoke tests
- **Priority:** P0
- **Type:** Release
- **TDD:** Per [Test-driven development](#test-driven-development-policy) — automate build/installer verification in CI where feasible; document repeatable manual smoke for gaps.
- **Description:** Build Tauri Windows package and validate install/launch/update (manual reinstall) workflow.
- **Acceptance criteria:**
  - Installer builds successfully.
  - App launches and runs core monthly flow offline.
- **Dependencies:** TKT-004, TKT-017, TKT-020

### TKT-022 - v1 release readiness checklist
- **Priority:** P0
- **Type:** Release
- **TDD:** Per [Test-driven development](#test-driven-development-policy) — checklist must require **all automated tests pass** before sign-off; no new product code in this ticket.
- **Description:** Consolidate go/no-go checks: docs alignment, test pass, known issues, migration notes, rollback instructions.
- **Acceptance criteria:**
  - Checklist approved and signed off.
  - Release candidate tagged and archived.
  - Locked v1 constraints verified in checklist: `Tauri`, `PDF-first`, `one-to-one + review fallback`, `manual reinstall updates`.
  - Checklist explicitly gates on **all automated tests passing** (`npm run test` in `finance-tracker`, `cargo test` in `src-tauri` when Rust changed).
  - **PRD §16 (MVP exit)** — each item ticked **Pass**, **Waived**, or **Deferred** with pointer (ticket or doc): (1) four-statement import workflow, (2) coherent ledger + traceability, (3) settlement detection + billing cycle linking, (4) spend totals without double count, (5) UC-2 flow modeled, (6) manual review path, (7) re-import no dupes, (8) installable EXE monthly flow offline.
  - **Design §5–7 (critical screens)** — Home/Import/Ledger/Review/Settings behaviors ticked or waived with pointer: **§5.1** month/coverage/health (**TKT-030** if waived), **§5.2** import UX (**TKT-031**), **§5.3** ledger sort/range/badges (**TKT-032**), **§5.4–5.5** review/settings (**TKT-033** for data path), **§6–7** spend mental model (link **TKT-028**/**TKT-032** if partial), **§10** a11y (**TKT-034** if waived).
  - Post–v1 items explicitly waived (e.g. **TKT-023** advanced rules) must say **Waived post-v1** on the checklist, not silent gap.
- **Dependencies:** TKT-021

## Follow-up engineering (review notes, tracked as TKT-025)

Items intentionally left for TKT-025 rather than patched ad hoc:

| Topic | Notes |
|-------|--------|
| TS / Rust model drift | Two hand-written `AppState` shapes; runtime serde errors possible if only one side changes. |
| Stringly-typed fields in Rust | `source_type`, `kind`, etc. accept any string from IPC until validation exists. |
| Full-replace save | Simple and correct for small data; may need incremental strategy for large ledgers. |
| Automated tests | Vitest unit + service integration in `finance-tracker` (see [Automated unit tests](#automated-unit-tests-vitest)); no DB / IPC round-trip test yet — **TKT-025**. |

## Dependency Graph (Simplified)

```mermaid
flowchart TD
  t1[TKT001Refactor] --> t2[TKT002DomainTypes]
  t1 --> t3[TKT003StorageAbstraction]
  t3 --> t4[TKT004SQLite]
  t4 --> t25[TKT025PersistenceHardening]
  t4 --> t5[TKT005Idempotency]
  t1 --> t6[TKT006ParserFramework]
  t6 --> t7[TKT007UOBParsers]
  t6 --> t8[TKT008DBSParsers]
  t7 --> t9[TKT009ReconcileEngine]
  t8 --> t9
  t9 --> t10[TKT010DateAndWindow]
  t9 --> t11[TKT011ReviewIntegrity]
  t5 --> t12[TKT012MonthlyStatus]
  t11 --> t12
  t7 --> t13[TKT013ImportUI]
  t8 --> t13
  t5 --> t13
  t11 --> t14[TKT014ReviewUX]
  t14 --> t26[TKT026ManualSettlementPairing]
  t11 --> t26
  t9 --> t26
  t16 --> t26
  t26 --> t27[TKT027ReopenAutoMatched]
  t15 --> t27
  t11 --> t15[TKT015LedgerDetail]
  t9 --> t16[TKT016RuleSettings]
  t10 --> t16
  t4 --> t16
  t16 --> t23[TKT023AdvancedRuleSettings]
  t14 --> t23
  t1 --> t24[TKT024AppServicesBoundary]
  t2 --> t24
  t3 --> t24
  t1 --> t17[TKT017SecurityBaseline]
  t7 --> t18[TKT018UnitTests]
  t8 --> t18
  t9 --> t18
  t10 --> t18
  t5 --> t19[TKT019IntegrationTests]
  t11 --> t19
  t12 --> t19
  t18 --> t20[TKT020GoldenFixtures]
  t19 --> t20
  t7 --> t28[TKT028FullStatementLines]
  t8 --> t28
  t9 --> t29[TKT029UC2TransferChain]
  t16 --> t29
  t28 --> t29
  t28 --> t20
  t12 --> t30[TKT030HomeMonthHealth]
  t13 --> t30
  t5 --> t31[TKT031ImportDnDReprocess]
  t13 --> t31
  t15 --> t32[TKT032LedgerSortBadges]
  t4 --> t33[TKT033DataLocationUX]
  t13 --> t34[TKT034A11yBaseline]
  t15 --> t34
  t4 --> t21[TKT021WindowsPackaging]
  t17 --> t21
  t20 --> t21
  t21 --> t22[TKT022ReleaseReadiness]
```

## Execution Strategy

All phases follow [Test-driven development](#test-driven-development-policy): do not merge behavior changes without the corresponding automated tests in the same delivery.

### Phase 1 - Stabilize core architecture (Week 1)
- Execute: TKT-001, TKT-002, TKT-003, TKT-004, TKT-017
- Goal: remove prototype risks (localStorage, monolith, weak security defaults).

### Phase 2 - Parsing and correctness engine (Week 1-2)
- Execute: TKT-006, TKT-007, TKT-008, TKT-009, TKT-010, TKT-011
- Goal: deterministic, explainable reconciliation with review fallback.

### Phase 3 - Workflow completion (Week 2)
- Execute: TKT-005, TKT-012, TKT-013, TKT-014, TKT-015, TKT-016; **TKT-026** (manual settlement pairing / remap) when closing the FR-7 gap before or alongside release hardening.
- Goal: complete monthly close flow with robust UI feedback.

### Phase 4 - Quality and release (Week 3)
- Execute: TKT-018, TKT-019, TKT-020, TKT-021, TKT-022
- Goal: confidence for shipping Windows installer.

### Phase 5 - Spec closure and PRD/Design depth (after core release path)
- Execute: **TKT-028**, **TKT-029** (ledger depth, UC-2, FR-6 alignment), **TKT-030**–**TKT-034** (Design §5–§10 parity: Home month/health, Import DnD/reprocess, Ledger sort/badges, data path, a11y), **TKT-025** (persistence / IPC / round-trip hardening in parallel as needed).
- Goal: reduce “partial” rows in [Traceability (PRD / Design)](#traceability-prd--design); **TKT-022** checklist records Pass/Waived/Deferred per PRD **§16** and Design **§5–7**.

## Fast-Track (If shipping pressure is high)

If turnaround must be extremely fast, cut to a minimum critical path:
- TKT-001, TKT-003, TKT-004, TKT-006, TKT-007, TKT-008, TKT-009, TKT-010, TKT-005, TKT-011, TKT-012, TKT-018, TKT-021

**TDD is not optional on the fast-track** — scope is reduced, not test discipline. Same merge rules as [Test-driven development](#test-driven-development-policy).

Minimum fixture baseline still required in fast-track:
- At least one UOB bank/card sample pair and one DBS bank/card sample pair in test fixtures.

Defer to post-v1 (or **Phase 5** above):
- TKT-015 polish depth (superseded in part by **TKT-032**)
- TKT-023 advanced profile options
- TKT-020 golden fixture breadth (coordinate **TKT-028** for spend-total goldens)
- TKT-028–034, TKT-025 hardening (see Phase 5)

