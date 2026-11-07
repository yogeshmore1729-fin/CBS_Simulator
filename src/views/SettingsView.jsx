import { useState } from "react";
import { api } from "../api.js";
import { Button, Card, Input, Select } from "../ui.jsx";

export default function SettingsView({ settings, onSaved, theme, setTheme, notify }) {
  const [simHome, setSimHome] = useState(settings?.simHome || "");
  const [adminUrl, setAdminUrl] = useState(settings?.adminUrl || "http://127.0.0.1:7099");
  const [javaHome, setJavaHome] = useState(settings?.javaHome || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const s = await api.saveSettings({ simHome, adminUrl, javaHome });
      onSaved(s);
      notify("Settings saved", "ok");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="view view-narrow">
      <Card title="Simulator" desc="Where the console finds the CBS simulator. Saved on the console server (cbs-console.settings.json).">
        <form onSubmit={save} className="form">
          <label className="form-field">
            <span>Install directory</span>
            <Input value={simHome} onChange={setSimHome} placeholder="/path/to/modules/simulator-service/build/install/simulator-service" />
            <small className="muted">The simulator-service install dir: it contains bin/start, bin/setenv.sh and cfg/. Config files and the log are read from here.</small>
          </label>
          <label className="form-field">
            <span>Live config API</span>
            <Input value={adminUrl} onChange={setAdminUrl} />
            <small className="muted">The simulator's admin endpoint (ConfigAdminServer, port 7099 or CBS_ADMIN_PORT). Used to apply changes without a restart.</small>
          </label>
          <label className="form-field">
            <span>Java home <span className="muted">(optional)</span></span>
            <Input value={javaHome} onChange={setJavaHome} placeholder={settings?.detectedJavaHome ? `auto: ${settings.detectedJavaHome}` : "java on PATH"} />
            <small className="muted">JDK used to start the simulator. Leave empty to use the newest JDK in /usr/lib/jvm.</small>
          </label>
          {error && <p className="note note-bad">{error}</p>}
          {settings?.error && !error && <p className="note note-warn">{settings.error}</p>}
          <div className="btn-row">
            <Button variant="primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>
          </div>
        </form>
      </Card>
      <Card title="Appearance">
        <label className="form-field">
          <span>Theme</span>
          <Select value={theme} onChange={setTheme} options={[{ value: "system", label: "Match system" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
        </label>
      </Card>
    </div>
  );
}
