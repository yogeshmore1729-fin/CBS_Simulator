# CBS Simulator Console

A static web console for the BOM CBS simulator: watch it, stop / restart it, read its log, and change its
responses **while it runs, without interrupting transactions that are already in progress**.

Live at **https://cbs-simulator.netlify.app**.

The page has no backend of its own. It calls the REST API built into the simulator, so it can be hosted anywhere
static and pointed at any simulator by URL. The API is served by **jPOS qrest** inside the simulator's Q2 and stays
up while the simulator itself is stopped / started from the page.

```
 your browser ──► https://cbs-simulator.netlify.app            (static page, no server)
       │
       └────────► https://<simulator-host>:7099/api/…          (token + CORS + https)
                    simulator JVM (Q2)
                    ├─ console API – always on:  05_cbs_admin_qrest.xml   qrest RestServer (port, TLS, CORS preflight)
                    │                            05_cbs_admin_txnmgr.xml  guard → Router → AdminApi → SendResponse
                    │                            05_cbs_admin.xml         ConfigAdminServer (logic, state)
                    └─ simulator – stopped / started from the page:
                                                 30_cdci_server, 50_qrest*, 10_* / 40_* transaction managers
```

---

## Contents

1. [What the console does](#what-the-console-does)
2. [Setup guide – connect the console to a simulator](#setup-guide--connect-the-console-to-a-simulator)
3. [setenv.sh reference – `CBS_ADMIN_*` properties](#setenvsh-reference--cbs_admin_-properties)
4. [Day-to-day operations](#day-to-day-operations) (rotate token, renew certificate, change origins, localhost only)
5. [Troubleshooting](#troubleshooting)
6. [REST API](#rest-api)
7. [Deploying / developing the page](#deploying--developing-the-page)
8. [Security](#security)
9. [Known simulator behaviour](#known-simulator-behaviour)

---

## What the console does

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

**Start / Stop / Restart** act on the simulator only – the console API keeps running, so the page stays connected:

* **Stop** – waits for transactions in flight to finish (up to `CBS_ADMIN_STOP_DRAIN_SECONDS`, default 30), closes
  the CBS entry points (CDCI server on 7080, qrest 8079 / 20001), then undeploys the transaction managers. The
  simulator QBean descriptors are parked in `<install-dir>/deploy-stopped/`. The dashboard shows **STOPPED** and
  **Start** becomes available.
* **Start** – redeploys the transaction managers, re-applies the runtime overrides made with *Apply live*, then
  opens the entry points.
* **Restart** – Stop + Start in the same process (same PID).
* **Full restart** – restarts the whole Java process (`bin/console-restart.sh`). Needed only after rebuilding the
  simulator or changing *startup* settings (JVM options, Redis, `CBS_ADMIN_*`, …). The page disconnects for a few
  seconds and reconnects.

The console API itself stops only with the JVM, from the simulator machine: `bin/stop` (or `kill`). Then the page
shows *not reachable* until the simulator is started there again (`bin/start` / `build.sh`).

---

## Setup guide – connect the console to a simulator

Do this once per simulator machine. Commands run **on the simulator machine**, as the user that runs the simulator.

### Step 1 – Build the simulator with the console API

The simulator must include `ConfigAdminServer` (branch / build of `bom_cbs_simulator` with
the `05_cbs_admin*.xml` descriptors, `bin/console-setup.sh` and `bin/console-restart.sh`).

```bash
cd ~/Desktop/Gitlab/bom_cbs_simulator
./build.sh                       # = ./gradlew -P CBS clean installApp, then starts the simulator
```

The install directory is `modules/simulator-service/build/install/simulator-service` – called
`<install-dir>` below. Check the scripts are there:

```bash
cd modules/simulator-service/build/install/simulator-service
ls bin/                          # console-restart.sh  console-setup.sh  q2  restart.sh  setenv.sh  start  stop
ls deploy/ | grep cbs_admin      # 05_cbs_admin.xml  05_cbs_admin_qrest.xml  05_cbs_admin_txnmgr.xml (after the first start)
```

### Step 2 – Generate the token and the https certificate

```bash
cd <install-dir>
bin/console-setup.sh
```

It creates, in `~/.cbs-simulator/` (permissions `700` / `600`):

| File | What |
|---|---|
| `cbs-admin.token` | the **API token** – a random 48-character hex secret the page must send |
| `cbs-admin.p12` | PKCS12 keystore with a self-signed certificate for this machine's host names and IPs (valid 825 days) |
| `cbs-admin.p12.pass` | the keystore password |

The secrets live **outside the install directory on purpose**: `build.sh` runs `clean installApp`, which deletes
`build/` – files there would be lost on every rebuild. Running `console-setup.sh` again keeps the existing files
(see [Day-to-day operations](#day-to-day-operations) to rotate / renew).

At the end it prints what to enter in the page, for example:

```
 In the console web page -> Settings:
   Simulator API URL : https://10.0.0.25:7099      (or https://cbs-sim-host:7099)
   API token         : 9f2c4e1ab07d3c58e6f1a2b4c9d0e7f3a5b8c1d2e4f60718

 With the self-signed certificate, open this once in each browser and accept it:
   https://10.0.0.25:7099/api/health
```

Show it again later with `bin/console-setup.sh --show`.

> If people reach the machine by a name or IP that is not on this machine's interfaces (DNS alias, NAT, VPN
> address), add it to the certificate: `bin/console-setup.sh --renew-cert --hosts "cbs-sim.mycorp.local,10.20.30.40"`.

### Step 3 – Check `bin/setenv.sh`

`bin/setenv.sh` already contains the console block (see the [reference](#setenvsh-reference--cbs_admin_-properties)).
With the files from step 2 present it resolves to:

| Property | Value |
|---|---|
| `CBS_ADMIN_TOKEN` | contents of `~/.cbs-simulator/cbs-admin.token` |
| `CBS_ADMIN_KEYSTORE` / `_PASSWORD` | `~/.cbs-simulator/cbs-admin.p12` / its password |
| `CBS_ADMIN_TLS` | `true` (a keystore exists) → API served over **https** |
| `CBS_ADMIN_PORT` | `7099` |
| `CBS_ADMIN_CORS_ORIGINS` | `https://cbs-simulator.netlify.app,http://localhost:5173` |

Nothing to edit unless you want another port or another page origin.

### Step 4 – Restart the simulator once

```bash
cd <install-dir>
bin/restart.sh                   # or ./build.sh from the repository root
```

Check that the API is up:

```bash
grep -E "CBS config admin ready|cbs-admin-qrest ready" log/simulator.log | tail -2
# CBS config admin ready (token required, CORS origins [https://cbs-simulator.netlify.app, http://localhost:5173])
# cbs-admin-qrest ready - port 7099

curl -k https://127.0.0.1:7099/api/health
# {"authRequired":true,"name":"cbs-simulator","ok":true,"version":"2"}

curl -k -H "Authorization: Bearer $(cat ~/.cbs-simulator/cbs-admin.token)" https://127.0.0.1:7099/api/status | head -c 200
```

### Step 5 – Open the port

Browsers of the people using the console must reach `<simulator-host>:7099`. If the machine runs a firewall,
ask your admin to allow inbound TCP 7099 from the office / VPN network (for example `sudo ufw allow 7099/tcp`).
Do **not** expose 7099 to the internet.

### Step 6 – Trust the certificate in each browser (self-signed only)

Open the health URL printed in step 2, e.g. `https://10.0.0.25:7099/api/health`:

* Chrome / Edge: *Your connection is not private* → **Advanced** → **Proceed to 10.0.0.25 (unsafe)**.
* Firefox: **Advanced…** → **Accept the Risk and Continue**.

You should see `{"ok":true,…}`. Without this step the page reports the simulator as *not reachable*.
(With a certificate from your company CA, put it in the keystore instead and skip this step.)

### Step 7 – Connect the page

1. Open **https://cbs-simulator.netlify.app** → **Settings**.
2. **Simulator API URL**: `https://<simulator-host>:7099` (the URL from step 2).
3. **API token**: the token from step 2.
4. **Test connection** – expect:
   `Reached https://…:7099 (API v2, token required)` and `Authorized - simulator PID …`.
5. **Save**, then open the **Dashboard** – it shows **RUNNING** and the live transaction managers.

Chrome may ask once whether `cbs-simulator.netlify.app` may *access devices on your local network* – choose
**Allow** (the simulator is on a private address).

---

## setenv.sh reference – `CBS_ADMIN_*` properties

The block at the end of `bin/setenv.sh` (source: `modules/simulator-service/src/dist/bin/setenv.sh`):

```bash
export CBS_ADMIN_SECRETS_DIR=${CBS_ADMIN_SECRETS_DIR:-"$HOME/.cbs-simulator"}
if [ -z "${CBS_ADMIN_TOKEN:-}" ] && [ -r "$CBS_ADMIN_SECRETS_DIR/cbs-admin.token" ]; then
  export CBS_ADMIN_TOKEN=$(cat "$CBS_ADMIN_SECRETS_DIR/cbs-admin.token")
fi
if [ -z "${CBS_ADMIN_KEYSTORE:-}" ] && [ -r "$CBS_ADMIN_SECRETS_DIR/cbs-admin.p12" ] && [ -r "$CBS_ADMIN_SECRETS_DIR/cbs-admin.p12.pass" ]; then
  export CBS_ADMIN_KEYSTORE="$CBS_ADMIN_SECRETS_DIR/cbs-admin.p12"
  export CBS_ADMIN_KEYSTORE_PASSWORD=$(cat "$CBS_ADMIN_SECRETS_DIR/cbs-admin.p12.pass")
  export CBS_ADMIN_TLS=true
fi
export CBS_ADMIN_PORT=${CBS_ADMIN_PORT:-"7099"}
export CBS_ADMIN_CORS_ORIGINS=${CBS_ADMIN_CORS_ORIGINS:-"https://cbs-simulator.netlify.app,http://localhost:5173"}
```

| Property | Default | Meaning |
|---|---|---|
| `CBS_ADMIN_SECRETS_DIR` | `~/.cbs-simulator` | Where `console-setup.sh` writes, and `setenv.sh` reads, the token and keystore. |
| `CBS_ADMIN_TOKEN` | from `cbs-admin.token` | Bearer token required on every API call except `/api/health`. If empty, the API **only serves clients on the simulator machine** (other callers get `403`). |
| `CBS_ADMIN_PORT` | `7099` | API port (qrest listens on all interfaces). |
| `CBS_ADMIN_TLS` | `true` when the keystore exists | Serve the API over https. |
| `CBS_ADMIN_CORS_ORIGINS` | `https://cbs-simulator.netlify.app,http://localhost:5173` | Comma separated page origins (scheme + host [+ port], no path) allowed to call the API from a browser. `*` allows any. Other origins get `403`. |
| `CBS_ADMIN_KEYSTORE` | `cbs-admin.p12` if present | PKCS12 / JKS keystore → the API is served over **https**. Needed because an https page (Netlify) may not call plain http on another host. |
| `CBS_ADMIN_KEYSTORE_PASSWORD` | from `cbs-admin.p12.pass` | Keystore and key password. |
| `CBS_ADMIN_STOP_DRAIN_SECONDS` | `30` | How long **Stop** waits for transactions in flight before closing the simulator. |

Notes:

* `${KEY:-default}` means a value already in the environment wins. To override one property for a run:
  `CBS_ADMIN_PORT=7199 bin/start`.
* `CBS_ADMIN_PORT` and `CBS_ADMIN_CORS_ORIGINS` can also be edited from the console (*Responses & behaviour → Startup
  settings*); like every startup setting they take effect after a restart. The token / keystore lines are shown
  read-only and their values never leave the machine through the API.
* Where they are used: `05_cbs_admin_qrest.xml` (port, TLS, keystore – `${CBS_ADMIN_PORT:7099}` style) and
  `05_cbs_admin.xml` (`token`, `cors-origins` properties; the environment variables take precedence).

---

## Day-to-day operations

| Task | How |
|---|---|
| Show URL + token again | `bin/console-setup.sh --show` |
| **Rotate the token** | `bin/console-setup.sh --rotate-token`, then **Restart** (from the page or `bin/restart.sh`). The old token stops working; enter the new one in every browser's Settings. |
| **Renew / extend the certificate** | `bin/console-setup.sh --renew-cert [--hosts "extra-name,10.1.2.3"]`, restart, then accept the new certificate once per browser (step 6). |
| **Allow another page origin** | Edit `CBS_ADMIN_CORS_ORIGINS` in `bin/setenv.sh` (or in the console's Startup settings), e.g. `"https://cbs-simulator.netlify.app,https://my-fork.netlify.app"`, then restart. |
| **Another port** | Change `CBS_ADMIN_PORT`, restart, update the URL in the page's Settings. |
| **Localhost only** (disable remote access) | `rm ~/.cbs-simulator/cbs-admin.token` and do a full restart – without a token the API answers only clients on the simulator machine. Use the page there with `https://127.0.0.1:7099`. |
| **Stop the console API** | Only from the simulator machine: `bin/stop` stops the whole simulator JVM, API included. Nothing on the page can stop the API. |
| **Several simulators on one machine** | Give each its own `CBS_ADMIN_PORT` (and, if wanted, its own `CBS_ADMIN_SECRETS_DIR`). |
| **After a rebuild** (`build.sh`) | Nothing to do – the secrets in `~/.cbs-simulator` and the setenv block survive. |

---

## Troubleshooting

| The page says | Cause → fix |
|---|---|
| *Connect to a simulator* | No URL saved in this browser → Settings. |
| *…is not reachable – it may be stopped…* | The simulator **JVM** is down (Stop on the page never causes this) → start it on its machine (`bin/start` / `build.sh`). Otherwise: wrong URL or port; firewall (step 5); certificate not accepted in this browser (step 6); the API did not start – check `grep -iE "config admin|cbs-admin-qrest" log/simulator.log`. |
| Dashboard shows **STOPPED** | Someone pressed Stop → press **Start**. |
| *This page is served over https, so the browser blocks calls to http://…* | The URL is `http://` on another host → configure the keystore (step 2) and use `https://`. |
| *Missing or wrong API token* | Token differs from `~/.cbs-simulator/cbs-admin.token` (rotated?) → `bin/console-setup.sh --show`, update Settings. |
| *This page's origin (…) is not allowed* | Add the origin shown to `CBS_ADMIN_CORS_ORIGINS`, restart. |
| *No CBS_ADMIN_TOKEN is configured on the simulator…* | No token file → run `bin/console-setup.sh`, then a full restart. |
| Log: `cbs-admin-qrest … port (7099) --- retrying` | Another process (e.g. a second simulator) uses 7099 → change `CBS_ADMIN_PORT`. |
| Start / Stop reports QBeans that did not start / stop | See `log/simulator.log` around the `config admin :` lines; a **Full restart** always brings back the complete simulator (Q2 re-extracts every descriptor at boot). |
| Restart from the page never comes back | Look at `log/console-restart.log` on the simulator machine (it is written by `bin/console-restart.sh`). |
| Apply live: *No transaction manager uses these settings* | The changed variable is a startup setting (not referenced by a hot-reload TM) → restart to apply it. |

Quick checks on the simulator machine:

```bash
ss -ltnp | grep 7099                                   # is the API listening?
curl -k https://127.0.0.1:7099/api/health              # does it answer?
grep -i "config admin" log/simulator.log | tail        # start-up / reload messages
```

---

## REST API

All under `/api`, JSON, `Authorization: Bearer <token>` (except `health`):

| | |
|---|---|
| `GET health` | reachability + whether a token is required |
| `GET status` | PID, uptime, install dir, hot-reload TMs (versions, in-flight), live env values, runtime overrides |
| `GET config` | `setenv.sh`, `cdci_rc.cfg`, `financial_rc.cfg` parsed, with a hash per file |
| `POST config/apply` | `{base, setenv:{K:v}, cdci:{set,remove,labels}, financial:{…}, live}` → `{ok, log}` |
| `GET logs?lines=N` | tail of `log/simulator.log` (max 5000 lines) |
| `GET activity` | recent applies / operations |
| `POST sim/stop` | `202`; drains, closes the entry points, undeploys the simulator (`409` if already stopped) |
| `POST sim/start` | `202`; redeploys the simulator, re-applies runtime overrides (`409` if already running) |
| `POST sim/restart` | `202`; stop + start in the same process |
| `POST sim/full-restart` | `202`; JVM restart through `bin/console-restart.sh` (API down for a few seconds) |

`GET status` includes `simulator` (`running` / `stopping` / `stopped` / `starting`), `busy` and `opLog` (progress of
the last stop / start / restart).

Example:

```bash
TOKEN=$(cat ~/.cbs-simulator/cbs-admin.token)
curl -k -H "Authorization: Bearer $TOKEN" https://127.0.0.1:7099/api/status
```

---

## Deploying / developing the page

Netlify builds from `netlify.toml` (`npm run build`, publish `dist`, SPA redirect). Any static host works:
`npm run build` and serve `dist/`.

```bash
npm install
npm run dev          # http://localhost:5173 (already in the default CBS_ADMIN_CORS_ORIGINS)
npm run lint
```

---

## Security

* The token is required for everything except `/api/health` and is compared in constant time.
* Browser requests from origins not in `CBS_ADMIN_CORS_ORIGINS` are rejected (`403`) before anything runs.
* qrest listens on all interfaces; without a token the API rejects every caller that is not on the simulator machine.
* There is no generic file or command endpoint: the API can only read / edit the three config files, tail the log,
  stop / start its own simulator and restart its own process. The token and keystore password are not readable
  through it, the `Authorization` header is masked in qrest logs, and the API's transaction manager does not log
  request / response bodies.
* The page stores the token in the browser's localStorage – use it from trusted machines; rotate the token when
  someone should lose access.
* Anyone with the token can change the simulator's responses and read `setenv.sh` (Redis password and other
  secrets). Keep port 7099 on the internal network.

---

## Known simulator behaviour

From `ProcessCbsRequestV2` / the shipped deploy XML (shown in the UI as well):

* For debit, credit and reversals the `*_RESP` default RCs have no effect: field 39 is overwritten with the
  configured RC after the default response is applied.
* The `cdci_rc.cfg` random buckets are only used when the CDCI participant has `use-random-rc-mapping=true`,
  which `10_cdci_txnmgr.xml` does not set.
* Default (field 55 / 56) responses only apply when *Use account RC mappings* is off.
