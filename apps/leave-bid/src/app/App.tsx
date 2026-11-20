import { Suspense, useState } from "react";
import { setActiveAirport } from "../store/actions/airports";
import { cancelReset, importBackup, requestReset, resetToFactoryDefaults, setActiveTab } from "../store/actions/session";
import { selectKnownAirports } from "../store/selectors";
import { useAppStore } from "../store/store";
import { Modal } from "../shared/ui/Modal";
import { TABS } from "./tabs";
import "./shell.css";

export function App() {
  const activeTab = useAppStore((state) => state.ui.activeTab);
  const airport = useAppStore((state) => state.allocConfig.airport);
  const confirmReset = useAppStore((state) => state.ui.confirmReset);
  const airports = useAppStore(selectKnownAirports);
  const [draft, setDraft] = useState("");
  const Active = TABS.find((tab) => tab.id === activeTab)?.Component ?? TABS[0].Component;

  return (
    <>
      <header className="app-header">
        <div className="app-title">
          <h1>2027 CBA Leave Liability & Leave Bid Suite</h1>
          <span className="badge">Standalone App • BUE (TSO, LTSO, ESTI, MSTI) & STSO Compliant</span>
          <div className="airport-box">
            <strong>Active Airport:</strong>
            <select value={airport} onChange={(event) => setActiveAirport(event.target.value)}>
              {airports.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <input
              value={draft}
              placeholder="e.g. DFW"
              maxLength={6}
              onChange={(event) => setDraft(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter" && draft.trim()) {
                  setActiveAirport(draft);
                  setDraft("");
                }
              }}
            />
            <button
              className="btn btn-primary btn-sm"
              type="button"
              onClick={() => {
                if (!draft.trim()) return;
                setActiveAirport(draft);
                setDraft("");
              }}
            >
              Set / Add
            </button>
          </div>
        </div>
        <div className="header-actions">
          <label className="btn btn-ghost btn-sm file-btn">
            Import backup JSON
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                file.text().then((text) => importBackup(JSON.parse(text))).catch(() => undefined);
                event.target.value = "";
              }}
            />
          </label>
          <button className="btn btn-danger btn-sm" type="button" onClick={requestReset}>
            Reset Defaults
          </button>
        </div>
      </header>
      <nav className="nav-tabs">
        {TABS.map((tab) => (
          <button key={tab.id} className={tab.id === activeTab ? "nav-tab active" : "nav-tab"} type="button" onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>
      <main className="main">
        <Suspense fallback={<p className="placeholder">Loading tab…</p>}>
          <Active />
        </Suspense>
      </main>
      <Modal
        open={confirmReset}
        title="Reset all data to default state?"
        onClose={cancelReset}
        footer={
          <>
            <button className="btn btn-outline btn-sm" type="button" onClick={cancelReset}>
              Cancel
            </button>
            <button className="btn btn-danger btn-sm" type="button" onClick={resetToFactoryDefaults}>
              Reset
            </button>
          </>
        }
      >
        This clears the shared leave-bid save and reloads the synthetic roster.
      </Modal>
    </>
  );
}
