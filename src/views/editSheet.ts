import type { Item, ChecklistItem, ProgressNote } from "../store";
import { esc, fmtTime } from "../components/dom";

function checklistRow(kind: "tasks"|"actions", itId: string, x: ChecklistItem): string {
  return `
    <div class="miniItem">
      <input type="checkbox" data-action="toggleCheck" data-kind="${kind}" data-id="${esc(itId)}" data-xid="${esc(x.id)}" data-t="${x.t}" ${x.done?"checked":""}/>
      <input value="${esc(x.text)}" data-action="editCheckText" data-kind="${kind}" data-id="${esc(itId)}" data-xid="${esc(x.id)}" data-t="${x.t}"/>
      <button class="btn small ghost" type="button" data-action="rmCheck" data-kind="${kind}" data-id="${esc(itId)}" data-xid="${esc(x.id)}">Remove</button>
    </div>
  `;
}

function progressRow(itId: string, p: ProgressNote): string {
  return `
    <div class="miniItem">
      <div class="miniTime">${esc(fmtTime(p.t))}</div>
      <input value="${esc(p.text)}" data-action="editProgressText" data-id="${esc(itId)}" data-pid="${esc(p.id)}" data-t="${p.t}"/>
      <button class="btn small ghost" type="button" data-action="rmProgress" data-id="${esc(itId)}" data-pid="${esc(p.id)}">Remove</button>
    </div>
  `;
}

export function renderEditSheet(it: Item): string {
  return `
  <dialog id="editSheet">
    <div class="sheetHead">
      <h3>Edit</h3>
      <div class="row">
        <button class="btn small ghost" type="button" data-action="closeEdit">Close</button>
      </div>
    </div>

    <div class="sheetBody">
      <div class="notice">
        <strong>${it.type === "job" ? "Job" : "Bleep"}</strong>
        <div class="help">Edits apply when you tap Done.</div>
      </div>

      ${it.type === "job" ? `
        <div class="grid2">
          <label>Ward <input value="${esc(it.ward ?? "")}" data-action="editField" data-id="${esc(it.id)}" data-field="ward"/></label>
          <label>Bed <input value="${esc(it.bed ?? "")}" data-action="editField" data-id="${esc(it.id)}" data-field="bed"/></label>
        </div>
        <label>Summary <input value="${esc(it.summary)}" data-action="editField" data-id="${esc(it.id)}" data-field="summary"/></label>
      ` : `
        <label>From <input value="${esc(it.from)}" data-action="editField" data-id="${esc(it.id)}" data-field="from"/></label>
        <label>Location <input value="${esc(it.location ?? "")}" data-action="editField" data-id="${esc(it.id)}" data-field="location"/></label>
        <label>Summary <input value="${esc(it.summary ?? "")}" data-action="editField" data-id="${esc(it.id)}" data-field="summary"/></label>
        <label class="row" style="gap:8px">
          <input type="checkbox" ${it.calledBack?"checked":""} data-action="toggleCalledBack" data-id="${esc(it.id)}"/>
          <span class="help" style="color:var(--text)">Called back</span>
        </label>
      `}

      <label>Secondary summary (optional)
        <input value="${esc(it.secondarySummary ?? "")}" data-action="editField" data-id="${esc(it.id)}" data-field="secondarySummary"/>
      </label>

      <div class="grid2">
        <label>Urgency
          <select data-action="editUrgency" data-id="${esc(it.id)}">
            <option value="red" ${it.urgency==="red"?"selected":""}>Red</option>
            <option value="amber" ${it.urgency==="amber"?"selected":""}>Amber</option>
            <option value="green" ${it.urgency==="green"?"selected":""}>Green</option>
          </select>
        </label>
        <label>Review by (optional)
          <input type="datetime-local" value="${it.reviewBy ? (() => { const d=new Date(it.reviewBy); const p=(n:number)=>String(n).padStart(2,"0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; })() : ""}" data-action="editReviewBy" data-id="${esc(it.id)}"/>
        </label>
      </div>

      <div class="notice">
        <strong>Tasks</strong>
        <div class="row" style="margin-top:8px">
          <input placeholder="Add task…" data-action="newTaskInput" data-id="${esc(it.id)}" data-kind="tasks"/>
          <button class="btn small primary" type="button" data-action="addCheck" data-id="${esc(it.id)}" data-kind="tasks">Add</button>
        </div>
        <div class="miniList">
          ${it.tasks.map(x => checklistRow("tasks", it.id, x)).join("") || `<div class="help">No tasks yet.</div>`}
        </div>
      </div>

      <div class="notice">
        <strong>Actions</strong>
        <div class="row" style="margin-top:8px">
          <input placeholder="Add action…" data-action="newTaskInput" data-id="${esc(it.id)}" data-kind="actions"/>
          <button class="btn small primary" type="button" data-action="addCheck" data-id="${esc(it.id)}" data-kind="actions">Add</button>
        </div>
        <div class="miniList">
          ${it.actions.map(x => checklistRow("actions", it.id, x)).join("") || `<div class="help">No actions yet.</div>`}
        </div>
      </div>

      <div class="notice">
        <strong>Progress</strong>
        <div class="row" style="margin-top:8px">
          <input placeholder="Add progress note…" data-action="newProgressInput" data-id="${esc(it.id)}"/>
          <button class="btn small primary" type="button" data-action="addProgress" data-id="${esc(it.id)}">Add</button>
        </div>
        <div class="miniList">
          ${it.progress.map(p => progressRow(it.id, p)).join("") || `<div class="help">No progress yet.</div>`}
        </div>
      </div>

      <div class="row" style="justify-content:space-between;margin-top:12px">
        <button class="btn danger" type="button" data-action="deleteItem" data-id="${esc(it.id)}">Delete</button>
        <button class="btn ghost" type="button" data-action="closeEdit">Done</button>
      </div>
    </div>
  </dialog>
  `;
}
