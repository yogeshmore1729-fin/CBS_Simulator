# CBS Simulator Console

A web console for the BOM CBS simulator: start / stop it, watch its log, and change its responses
**while it runs, without interrupting transactions that are already in progress**.

## What it does

| View | |
|---|---|
| **Dashboard** | Simulator status (PID, uptime), Start / Stop / Restart / Force kill, the live configuration of every hot-reload transaction manager (config version, transactions still running on a previous version), runtime overrides, operation output and recent activity. |
| **Responses & behaviour** | The `setenv.sh` settings used by the CDCI participant (`ProcessCbsRequestV2`): default responses, random-response flags, hold flags and account lists, reversal failure, list-account defaults. Each field shows the value the simulator is *running with* when it differs from the file. Other `setenv.sh` variables (JVM, HSM, Redis, …) are under *Startup settings* and need a restart. |
| **RC distribution** | The 100 random buckets of `cdci_rc.cfg` as a grid with a distribution bar; select ranges (Shift+click) and set RC / delay / hold in bulk. |
| **Account mappings** | `financial_rc.cfg`: transaction + account last 4 → RC, delay, hold (filter, search, add, delete) and the list-account (010042) mappings with a table editor for the accounts string. |
| **Logs** | Live tail of `log/simulator.log` with filter (text or regex), follow, wrap and copy. |
| **Settings** | Simulator install directory, live-config API URL, Java home, theme (light / dark / system). |

Edits are collected as a draft (changed fields are highlighted, the sidebar shows a count per file).
**Review & apply** shows every change as old → new, then:

* **Apply live** – saves the files and hot-reloads the affected transaction managers in the running
  simulator. Transactions already in progress finish on the configuration they started with; new ones use
  the new configuration. Nothing is restarted.
* **Save to disk only** – writes the files; the simulator picks them up on its next restart.

Files are edited in place (comments, ordering and unrelated variables are kept), a backup is written to
`cfg/.console-backup/` before every save, and a save is refused if the file was changed on disk after the
console loaded it.

## How live changes work

The simulator side lives in the `bom_cbs_simulator` repository:

* `HotReloadTransactionManager` – every CBS transaction manager uses it. Its participants are kept in
  versioned snapshots; each transaction is bound to the snapshot that was current when it started, a reload
  builds a new snapshot (re-creating only the changed participants) and old snapshots are released when
  their last transaction finishes.
* `ConfigAdminServer` (`45_cbs_config_admin.xml`) – a localhost-only API on port **7099**
  (`CBS_ADMIN_PORT` to change it). `POST /admin/reload` applies `setenv.sh` values as runtime overrides of
  the `env:` references in the deploy XMLs and reloads every transaction manager that uses a changed
  variable or cfg file; `GET /admin/status` reports versions, in-flight counts and live values.

The simulator must be built from a version that contains both. If it is not, the console still works but
changes are saved to disk and need a restart (the dashboard says so).

## Run it

Requirements: Node.js 20+, and the CBS simulator installed with the hot-reload support
(`./gradlew -PCBS installApp` in `bom_cbs_simulator`, or its `build.sh`).

```bash
npm install
npm start            # builds the UI and serves console + API on http://127.0.0.1:3001
```

Open http://127.0.0.1:3001, go to **Settings** and set the simulator install directory, e.g.
`…/bom_cbs_simulator/modules/simulator-service/build/install/simulator-service`
(it must contain `bin/start`, `bin/setenv.sh` and `cfg/`). Settings are stored in
`cbs-console.settings.json` (git-ignored).

The same settings can be given as environment variables: `CBS_SIM_HOME`, `CBS_ADMIN_URL`
(default `http://127.0.0.1:7099`), `CBS_JAVA_HOME`, and `CONSOLE_PORT` (default 3001).

### Development

```bash
npm run server       # API on :3001
npm run dev          # Vite on :5173 with hot module reload, proxies /api to :3001
npm test             # unit tests for the file editors
npm run lint
```

## Security

The console server listens on `127.0.0.1` only and has no generic command or file endpoint: it can only
read / edit the three simulator config files, run the simulator's own `bin/start` / `bin/stop`, and signal
the simulator process. Cross-origin browser requests and requests with a foreign `Host` header
(DNS rebinding) are rejected. The simulator process is identified by its jar **and** its working directory,
so the console never touches another simulator running the same jar (e.g. the NPCI simulator).

## Known simulator behaviour

These come from `ProcessCbsRequestV2` / the shipped deploy XML, not from the console, and are shown in the UI:

* For debit, credit and reversals the `*_RESP` default RCs have no effect: field 39 is overwritten with the
  configured RC after the default response is applied.
* The `cdci_rc.cfg` random buckets are only used when the CDCI participant has
  `use-random-rc-mapping=true`, which `10_cdci_txnmgr.xml` does not set.
