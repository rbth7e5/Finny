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

If you change **`package.json`** (dependencies or scripts), run **`npm install`** again and **commit `package-lock.json`** together with `package.json`. CI runs **`npm ci`**, which fails if the lockfile cannot satisfy `package.json` (missing or mismatched versions).

Avoid editing the lockfile by hand. If teammates use different **npm** major versions, you may see cosmetic `package-lock.json` diffs after `npm install`; pick one teammate’s regenerated lockfile, commit it, and align on a shared **Node/npm** version when possible (e.g. Node 22 LTS on CI).

**`@emnapi/core` / `@emnapi/runtime`:** These are declared as direct `devDependencies` (not only transitive peers) so **`npm ci` on Linux** always resolves them. Some **Windows** installs left them out of `package-lock.json`, which broke GitHub Actions with “Missing … from lock file”.

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

### Windows installer smoke (TKT-021)

After `npx tauri build` (or installing a CI-produced bundle), repeat this once per release candidate:

1. Run the **NSIS setup** or **MSI** from `src-tauri/target/release/bundle/` and finish install (default location is fine).
2. **Disconnect network** (airplane mode or unplug Ethernet) and launch **Finny** from the Start menu or desktop shortcut.
3. Confirm the app **opens** and the **Home** tab loads without a blank crash.
4. Use **Import** with a **local PDF** you already have (or a tiny test PDF); confirm parsing either succeeds or shows the expected failure/duplicate messaging — no dependency on cloud services.

CI on `windows-latest` runs `npm run test`, `cargo test`, `npx tauri build`, and fails if no `.exe`/`.msi` appears under the bundle directory (see `.github/workflows/ci.yml`).

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
