import { esc } from "../components/dom";

export function renderTools(state: { running: boolean; startAt?: number; elapsed: number; log: { t: number; text: string }[] }): string {
  const mm = Math.floor(state.elapsed / 60000);
  const ss = Math.floor((state.elapsed % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${pad(mm)}:${pad(ss)}`;

  const quick = [
    "CPR ongoing",
    "Shock delivered",
    "Rhythm check",
    "Adrenaline 1mg",
    "Amiodarone 300mg",
    "ROSC",
    "Airway secured",
    "IV/IO access",
    "Capnography",
    "Team brief"
  ];

  return `
    <div class="wrap">
      <header class="topbar">
        <div class="brand">
          <div class="logo">TM</div>
          <div>
            <h1>TaskMedic</h1>
            <div class="tag">Tools</div>
          </div>
        </div>
        <div class="pills">
          <span class="pill"><strong>Offline</strong></span>
        </div>
      </header>

      <section class="section">
        <div class="sectionTitle">
          <h2>Cardiac arrest scribe</h2>
          <div class="small">Fast logging • Timestamped</div>
        </div>

        <div class="card item">
          <div class="row between">
            <div class="stack">
              <div class="meta">Elapsed</div>
              <div style="font-size:28px;font-weight:800;letter-spacing:.6px">${stamp}</div>
            </div>
            <div class="row" style="flex-wrap:wrap;justify-content:flex-end">
              <button class="btn small ${state.running ? "" : "primary"}" data-action="scribeStart">${state.running ? "Running" : "Start"}</button>
              <button class="btn small" data-action="scribePause">Pause</button>
              <button class="btn small ghost" data-action="scribeReset">Reset</button>
            </div>
          </div>

          <hr class="sep"/>

          <div class="help">Quick events</div>
          <div class="row" style="flex-wrap:wrap;margin-top:8px">
            ${quick.map(q => `<button class="btn small" data-action="scribeQuick" data-text="${esc(q)}">${esc(q)}</button>`).join("")}
          </div>

          <div style="height:10px"></div>

          <div class="help">Custom note</div>
          <div class="row" style="margin-top:8px">
            <input id="scribeText" placeholder="e.g. VF → shock, CPR resumed" />
            <button class="btn small primary" data-action="scribeAdd">Add</button>
          </div>

          <div class="notice" style="margin-top:12px">
            <strong>Log</strong>
            <div class="help">Copy button creates a newline-separated log.</div>
            <div class="miniList" style="margin-top:10px">
              ${state.log.length ? state.log.map(e => `
                <div class="miniItem">
                  <div class="miniTime">${new Date(e.t).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</div>
                  <div class="miniText">${esc(e.text)}</div>
                </div>
              `).join("") : `<div class="help">No entries yet.</div>`}
            </div>

            <div class="row" style="justify-content:flex-end;margin-top:10px">
              <button class="btn small ghost" data-action="scribeClear">Clear</button>
              <button class="btn small primary" data-action="scribeCopy">Copy</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}
