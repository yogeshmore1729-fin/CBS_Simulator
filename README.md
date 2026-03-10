## How to run CBS Simulator Config Manager

### First-time setup (no extra packages needed — uses Node.js built-ins only)

---

### Step 1 — Copy files into your project

```
simulator/
├── index.html          ← replace root index.html
├── server.js           ← new file in project root
└── src/
    ├── App.jsx         ← replace
    ├── main.jsx        ← replace
    └── index.css       ← replace
```

---

### Step 2 — Add npm scripts to package.json

Open `package.json` and add these two scripts:

```json
{
  "scripts": {
    "dev":    "vite",
    "server": "node server.js",
    "start":  "node server.js & vite"
  }
}
```

---

### Step 3 — Run both servers (open 2 terminals)

**Terminal 1 — Command execution server:**
```bash
node server.js
```
You should see:
```
─────────────────────────────────────────────
  CBS Simulator Command Server
  Listening on http://127.0.0.1:3001
─────────────────────────────────────────────
```

**Terminal 2 — Vite dev server:**
```bash
npm run dev
```

---

### How the buttons work

| Button     | What happens |
|------------|-------------|
| ▶ START    | Runs the `startScript` path (set in File Path Configuration on setenv.sh tab) |
| ■ STOP     | Runs the `stopScript` path, then polls `ps -ef \| grep simulator-service-1.0.1.jar` every 3s until process exits |
| ↺ RESTART  | Stop + Start in sequence |
| ? CHECK    | Runs `ps -ef \| grep simulator-service-1.0.1.jar \| grep -v grep` and sets RUNNING or STOPPED |

All output (stdout, stderr, exit code) is shown in the **Operation Log** panel.

---

### Configure script paths

Go to the **setenv.sh tab** → expand **FILE PATH CONFIGURATION** → set:

- **Start script path** — e.g. `./modules/simulator-service/build/install/simulator-service/bin/start`  
- **Stop script path**  — e.g. `./modules/simulator-service/build/install/simulator-service/bin/stop`

The **Configured Paths in Use** panel on the Control tab always shows the exact command that will run.

---

### Security note

`server.js` only listens on `127.0.0.1` (localhost) — it is **not accessible from the network**.
It also blocks obviously destructive commands (`rm -rf /`, `mkfs`, etc.).
