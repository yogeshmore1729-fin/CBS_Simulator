# CBS Simulator Console

A static web console for the BOM CBS simulator: watch it, stop / restart it, read its log, and change its
responses **while it runs, without interrupting transactions that are already in progress**.

The page has no backend of its own. It calls the REST API built into the simulator (`ConfigAdminServer` in
`bom_cbs_simulator`), so it can be hosted anywhere static – Netlify, GitHub Pages, any web server – and pointed at
any simulator by URL.

```
 browser ── Netlify (static page) ──► https://<simulator-host>:7099/api/…  (token + CORS)
                                         └─ ConfigAdminServer inside the simulator (Q2)
```

## What it does

| View | |
|---|---|
| **Dashboard** | Status (PID, uptime, Java), Start / Stop / Restart, the live configuration of every hot-reload transaction manager (config version, transactions still running on a previous version), runtime overrides, operation output and recent activity. |
| **Responses & behaviour** | The `setenv.sh` settings used by the CDCI participant (`ProcessCbsRequestV2`): default responses, random-response flags, hold flags and account lists, reversal failure, list-account defaults. Each field shows the value the simulator is *running with* when it differs from the file. Other variables (JVM, HSM, Redis, …) are under *Startup settings* and need a restart. |
| **RC distribution** | The 100 random buckets of `cdci_rc.cfg` as a grid; select ranges (Shift+click) and set RC / delay / hold in bulk. |
| **Account mappings** | `financial_rc.cfg`: transaction + account last 4 → RC, delay, hold, and the list-account (010042) mappings. |
| **Logs** | Live tail of `log/simulator.log` with filter, follow, wrap and copy. |
| **Settings** | Simulator API URL and token (stored only in this browser), Test connection, theme. |

Edits are collected as a draft. **Review & apply** shows every change as old → new, then:

* **Apply live** – the simulator saves the files and hot-reloads the affected transaction managers. Transactions
  already in progress finish on the configuration they started with; new ones use the new configuration.
* **Save to disk only** – the files are written; the simulator uses them after its next restart.

Files are edited in place (comments, ordering and unrelated variables are kept), backed up to
`cfg/.console-backup/` first, and a save is refused if the file changed on disk after the page loaded it.

**Start / Stop / Restart.** Stop is a graceful Q2 shutdown. Restart runs `bin/console-restart.sh` on the simulator
machine (graceful stop, then start). Start cannot work from the page: when the simulator is stopped nothing answers.
The page then says the simulator is not reachable, and reconnects automatically once it is started on its machine
(`bin/start` or `build.sh`).

## Simulator setup

Requires a `bom_cbs_simulator` build with `ConfigAdminServer` (`./gradlew -PCBS installApp` or `build.sh`).
By default the API listens on `127.0.0.1:7099` without a token. To use the console from other machines, add to the
simulator's `bin/setenv.sh` and restart it once:

```bash
export CBS_ADMIN_HOST=${CBS_ADMIN_HOST:-"0.0.0.0"}
export CBS_ADMIN_PORT=${CBS_ADMIN_PORT:-"7099"}
export CBS_ADMIN_TOKEN=${CBS_ADMIN_TOKEN:-"<long random secret>"}           # openssl rand -hex 24
export CBS_ADMIN_CORS_ORIGINS=${CBS_ADMIN_CORS_ORIGINS:-"https://<your-site>.netlify.app"}
export CBS_ADMIN_KEYSTORE=${CBS_ADMIN_KEYSTORE:-"cfg/cbs-admin.p12"}
export CBS_ADMIN_KEYSTORE_PASSWORD=${CBS_ADMIN_KEYSTORE_PASSWORD:-"<password>"}
```

* The API refuses to listen on a non-loopback address without `CBS_ADMIN_TOKEN`.
* `CBS_ADMIN_CORS_ORIGINS` lists the page origins allowed to call it (comma separated, `*` for any). Add
  `http://localhost:5173` for local development.
* **HTTPS is required** when the page is served over https (Netlify) and the simulator is not `localhost`: browsers
  block https pages from calling plain http on another host. Create a keystore on the simulator machine:

  ```bash
  keytool -genkeypair -alias cbs-admin -keyalg RSA -keysize 2048 -validity 825 \
    -storetype PKCS12 -keystore cfg/cbs-admin.p12 -storepass <password> -keypass <password> \
    -dname "CN=<simulator-host>" -ext "SAN=DNS:<simulator-host>,IP:<simulator-ip>"
  ```

  With a self-signed certificate, open `https://<simulator-host>:7099/api/health` once in each browser and accept it;
  a certificate from your internal CA avoids that step.

Then open the console, go to **Settings**, enter `https://<simulator-host>:7099` and the token, and press
**Test connection**.

### API

All under `/api`, JSON, `Authorization: Bearer <token>` (except `health`):

| | |
|---|---|
| `GET health` | reachability + whether a token is required |
| `GET status` | PID, uptime, install dir, hot-reload TMs (versions, in-flight), live env values, runtime overrides |
| `GET config` | `setenv.sh`, `cdci_rc.cfg`, `financial_rc.cfg` parsed, with a hash per file |
| `POST config/apply` | `{base, setenv:{K:v}, cdci:{set,remove,labels}, financial:{…}, live}` → `{ok, log}` |
| `GET logs?lines=N` | tail of `log/simulator.log` |
| `GET activity` | recent applies / operations |
| `POST sim/stop`, `POST sim/restart` | 202, then graceful stop / restart |
| `POST sim/start` | 409 "already running" (a stopped simulator cannot answer) |

## Deploy the page

Netlify picks up `netlify.toml` (build `npm run build`, publish `dist`). Any static host works: run
`npm run build` and serve `dist/`.

### Development

```bash
npm install
npm run dev          # http://localhost:5173 – set the simulator URL in Settings
npm run lint
```

## Security

* The token is required for everything except `/api/health`, and is compared in constant time.
* Requests from browser origins not in `CBS_ADMIN_CORS_ORIGINS` are rejected (403) before anything runs.
* There is no generic file or command endpoint: the API can only read / edit the three config files, tail the
  log, and stop / restart its own simulator process.
* The token is stored in the browser's localStorage – use the console from trusted machines, and rotate the token
  by changing `CBS_ADMIN_TOKEN` and restarting the simulator.
* `setenv.sh` contains secrets (Redis password, keys); anyone with the token can read them.

## Known simulator behaviour

From `ProcessCbsRequestV2` / the shipped deploy XML (shown in the UI as well):

* For debit, credit and reversals the `*_RESP` default RCs have no effect: field 39 is overwritten with the
  configured RC after the default response is applied.
* The `cdci_rc.cfg` random buckets are only used when the CDCI participant has `use-random-rc-mapping=true`,
  which `10_cdci_txnmgr.xml` does not set.
* Default (field 55 / 56) responses only apply when *Use account RC mappings* is off.
