# Finny (finance-tracker)

Local-only personal finance tracker: React + TypeScript + Vite, **Tauri 2** desktop shell, **SQLite** persistence, PDF statement import.

## Prerequisites

- **Node.js** (current LTS is fine) and npm
- **Rust** toolchain with **Cargo** — required (`rustup` from [rustup.rs](https://rustup.rs/))

The UI expects Tauri IPC for persistence. Do not rely on opening the Vite dev URL in a standalone browser; SQLite and `invoke` will not work there.

## Install

From this directory (`finance-tracker/`):

```bash
npm install
```

## Run locally

Starts the Vite dev server and opens the **Tauri** window (`beforeDevCommand` in `src-tauri/tauri.conf.json` runs `npm run dev` for you).

```bash
npx tauri dev
```

## Build

**Frontend assets (CI / typecheck):**

```bash
npm run build
```

**Desktop bundle:**

```bash
npx tauri build
```

Outputs depend on platform (e.g. Windows under `src-tauri/target/release/bundle/`).

**`npm run preview`** serves the production build **without** Tauri. Load/save will fail at runtime; use only for static checks, not real use.

## Other scripts

```bash
npm run lint
```

## Data location

SQLite file: OS app data directory → `finny/finny.db` (exact path follows the app identifier in `src-tauri/tauri.conf.json`).

## Project layout (high level)

- `src/` — React UI, domain types, parsers, reconcile, `appServices/`, `storage/` (Tauri SQLite adapter)
- `src-tauri/` — Rust: SQLite schema, `finny_load_state` / `finny_save_state` commands

For planned work and ticket order, see `../IMPLEMENTATION_TICKETS.md` in the repo root.
