import type { Item, ChecklistItem, ProgressNote } from "../store";
import { esc, fmtHM, fmtTime, minutesUntil } from "./dom";

function urgClass(u: string): string {
  return u === "red" ? "urg-red" : u === "amber" ? "urg-amber" : "urg-green";
}

function listLines(arr: ChecklistItem[], limit: number): string {
  if (!arr.length) return `<div class="miniItem"><div class="miniText" style="color:var(--muted)">None</div></div>`;
  const shown = arr.slice(0, limit).map(x => `
    <div class="miniItem">
      <div>${x.done ? "✅" : "❌"}</div>
      <div class="miniText">${esc(x.text)}</div>
    </div>
  `).join("");
  const more = arr.length > limit ? `<div class="miniText" style="color:var(--muted)">… +${arr.length - limit} more</div>` : "";
  return shown + more;
}

function progressLines(arr: ProgressNote[], limit: number): string {
  if (!arr.length) return `<div class="miniItem"><div class="miniText" style="color:var(--muted)">None</div></div>`;
  const shown = arr.slice(0, limit).map(p => `
    <div class="miniItem">
      <div class="miniTime">${esc(fmtTime(p.t))}</div>
      <div class="miniText">${esc(p.text)}</div>
    </div>
  `).join("");
  const more = arr.length > limit ? `<div class="miniText" style="color:var(--muted)">… +${arr.length - limit} more</div>` : "";
  return shown + more;
}

export function renderItemCard(it: Item, expanded = false): string {
  const headTitle =
    it.type === "job"
      ? `${esc(it.summary)}`
      : `${esc(it.from)}${it.summary ? ` • ${esc(it.summary)}` : ""}`;

  const meta =
    it.type === "job"
      ? `${esc(it.ward ?? "")}${it.bed ? ` • Bed ${esc(it.bed)}` : ""}`.trim()
      : `${esc(it.location ?? "")}`.trim();

  const reviewChip = it.reviewBy ? `<span class="chip review">Review ${minutesUntil(it.reviewBy)} • ${esc(fmtHM(it.reviewBy))}</span>` : "";
  const sec = it.secondarySummary ? `<div class="meta">${esc(it.secondarySummary)}</div>` : "";

  const openTasks = it.tasks.filter(x => !x.done).length;
  const openActs = it.actions.filter(x => !x.done).length;

  const taskLimit = expanded ? 999 : 6;
  const actLimit = expanded ? 999 : 6;
  const progLimit = expanded ? 6 : 1;

  return `
  <li class="card item" data-item="${esc(it.id)}">
    <div class="row between" style="align-items:flex-start">
      <div class="stack" style="min-width:0;flex:1">
        <p class="title">${headTitle}</p>
        ${meta ? `<div class="meta">${meta}</div>` : `<div class="meta">${it.type === "job" ? "Job" : "Bleep"}</div>`}
        ${sec}
        <div class="chips">
          <span class="chip ${urgClass(it.urgency)}">${it.urgency.toUpperCase()}</span>
          ${reviewChip}
          ${it.done ? `<span class="chip">Done</span>` : ""}
          <span class="chip">${openTasks} open tasks</span>
          <span class="chip">${openActs} open actions</span>
        </div>
      </div>
      <div class="row" style="flex-wrap:wrap;justify-content:flex-end;gap:8px">
        <button class="btn small" data-action="toggleExpand" data-id="${esc(it.id)}">${expanded ? "Hide" : "Details"}</button>
        <button class="btn small ghost" data-action="toggleDone" data-id="${esc(it.id)}">${it.done ? "Mark open" : "Mark done"}</button>
        <button class="btn small primary" data-action="openEdit" data-id="${esc(it.id)}">Edit</button>
      </div>
    </div>

    ${expanded ? `
      <hr class="sep"/>

      <div class="kv">
        <div class="k">Tasks</div>
        <div class="v"><div class="miniList">${listLines(it.tasks, taskLimit)}</div></div>
      </div>

      <div class="kv">
        <div class="k">Actions</div>
        <div class="v"><div class="miniList">${listLines(it.actions, actLimit)}</div></div>
      </div>

      <div class="kv">
        <div class="k">Progress</div>
        <div class="v"><div class="miniList">${progressLines(it.progress, progLimit)}</div></div>
      </div>
    ` : ""}
  </li>
  `;
}
