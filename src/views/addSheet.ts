import type { DB, Item, JobItem, BleepItem, Urgency } from "../store";
import { addChecklist, makeBase } from "../store";
import { esc } from "../components/dom";

export type DraftAdd = {
  tab: "job" | "bleep";
  ward: string;
  bed: string;
  summary: string;
  secondarySummary: string;
  urgency: Urgency;
  reviewBy: string;
  from: string;
  location: string;
  bleepSummary: string;
  calledBack: boolean;
  draftTaskText: string;
  draftTasks: { text: string }[];
};

export function defaultDraft(): DraftAdd {
  return {
    tab: "job",
    ward: "",
    bed: "",
    summary: "",
    secondarySummary: "",
    urgency: "amber",
    reviewBy: "",
    from: "",
    location: "",
    bleepSummary: "",
    calledBack: false,
    draftTaskText: "",
    draftTasks: []
  };
}

function draftTasksList(d: DraftAdd): string {
  if (!d.draftTasks.length) return `<div class="help">No tasks added yet.</div>`;
  return `
    <div class="miniList">
      ${d.draftTasks.map((t, i) => `
        <div class="miniItem">
          <div>❌</div>
          <div class="miniText">${esc(t.text)}</div>
          <button class="btn small ghost" type="button" data-action="rmDraftTask" data-idx="${i}">Remove</button>
        </div>
      `).join("")}
    </div>
  `;
}

export function renderAddSheet(_db: DB, d: DraftAdd): string {
  return `
  <dialog id="addSheet">
    <div class="sheetHead">
      <h3>Add</h3>
      <div class="row">
        <button class="btn small ghost" data-action="closeAdd" type="button">Close</button>
      </div>
    </div>

    <div class="sheetBody">
      <div class="row" style="flex-wrap:wrap">
        <button class="btn small ${d.tab==="job"?"primary":""}" type="button" data-action="tabJob">Job</button>
        <button class="btn small ${d.tab==="bleep"?"primary":""}" type="button" data-action="tabBleep">Bleep</button>
      </div>

      <div style="height:10px"></div>

      ${d.tab==="job" ? `
        <form id="addJobForm">
          <div class="grid2">
            <label>Ward
              <input name="ward" value="${esc(d.ward)}" placeholder="e.g. AMU"/>
            </label>
            <label>Bed (optional)
              <input name="bed" value="${esc(d.bed)}" placeholder="e.g. 12"/>
            </label>
          </div>

          <label>Summary (anonymised)
            <input name="summary" value="${esc(d.summary)}" placeholder="e.g. ?Sepsis – improving"/>
          </label>

          <label>Secondary summary (optional)
            <input name="secondarySummary" value="${esc(d.secondarySummary)}" placeholder="e.g. Background / PMH / context"/>
          </label>

          <div class="grid2">
            <label>Urgency
              <select name="urgency">
                <option value="red" ${d.urgency==="red"?"selected":""}>Red (Immediate)</option>
                <option value="amber" ${d.urgency==="amber"?"selected":""}>Amber (Soon)</option>
                <option value="green" ${d.urgency==="green"?"selected":""}>Green (Routine)</option>
              </select>
            </label>
            <label>Review by (optional)
              <input name="reviewBy" type="datetime-local" value="${esc(d.reviewBy)}"/>
            </label>
          </div>

          <div class="notice">
            <strong>Tasks</strong>
            <div class="help">Add as many as you want. Press Enter to add.</div>
            <div class="row" style="margin-top:8px">
              <input name="draftTaskText" value="${esc(d.draftTaskText)}" placeholder="Add a task…" />
              <button class="btn small primary" type="button" data-action="addDraftTask">Add</button>
            </div>
            ${draftTasksList(d)}
          </div>

          <div class="row" style="justify-content:flex-end;margin-top:12px">
            <button class="btn primary" type="submit">Add job</button>
          </div>
        </form>
      ` : `
        <form id="addBleepForm">
          <label>From (ext/bleep)
            <input name="from" value="${esc(d.from)}" placeholder="e.g. x5678 / Bleep 1234"/>
          </label>

          <label>Location (optional)
            <input name="location" value="${esc(d.location)}" placeholder="e.g. Ward 5"/>
          </label>

          <label>Task summary (optional — add after calling back)
            <input name="bleepSummary" value="${esc(d.bleepSummary)}" placeholder="Job / task"/>
          </label>

          <div class="grid2">
            <label>Urgency
              <select name="urgency">
                <option value="red" ${d.urgency==="red"?"selected":""}>Red (Immediate)</option>
                <option value="amber" ${d.urgency==="amber"?"selected":""}>Amber (Soon)</option>
                <option value="green" ${d.urgency==="green"?"selected":""}>Green (Routine)</option>
              </select>
            </label>
            <label>Review by (optional)
              <input name="reviewBy" type="datetime-local" value="${esc(d.reviewBy)}"/>
            </label>
          </div>

          <label class="row" style="gap:8px">
            <input name="calledBack" type="checkbox" ${d.calledBack?"checked":""}/>
            <span class="help" style="color:var(--text)">Called back?</span>
          </label>

          <div class="notice">
            <strong>Tasks</strong>
            <div class="help">Add as many as you want. Press Enter to add.</div>
            <div class="row" style="margin-top:8px">
              <input name="draftTaskText" value="${esc(d.draftTaskText)}" placeholder="Add a task…" />
              <button class="btn small primary" type="button" data-action="addDraftTask">Add</button>
            </div>
            ${draftTasksList(d)}
          </div>

          <div class="row" style="justify-content:flex-end;margin-top:12px">
            <button class="btn primary" type="submit">Add bleep</button>
          </div>
        </form>
      `}
    </div>
  </dialog>
  `;
}

export function buildItemFromDraft(d: DraftAdd): Item | null {
  const tasks = d.draftTasks.reduce((arr, t) => addChecklist(arr, t.text), []);
  const base = makeBase(d.tab);

  base.urgency = d.urgency;
  base.secondarySummary = d.secondarySummary.trim() || undefined;
  if (d.reviewBy) base.reviewBy = new Date(d.reviewBy).getTime();

  if (d.tab === "job") {
    const summary = d.summary.trim();
    if (!summary) return null;
    const job: JobItem = {
      ...base,
      type: "job",
      ward: d.ward.trim() || undefined,
      bed: d.bed.trim() || undefined,
      summary,
      tasks
    };
    return job;
  } else {
    const from = d.from.trim();
    if (!from) return null;
    const bleep: BleepItem = {
      ...base,
      type: "bleep",
      from,
      location: d.location.trim() || undefined,
      summary: d.bleepSummary.trim() || undefined,
      calledBack: d.calledBack,
      tasks
    };
    return bleep;
  }
}
