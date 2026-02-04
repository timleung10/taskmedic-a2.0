import "./styles.css";
import { registerSW } from "virtual:pwa-register";
import { loadDB, saveDB, type DB, type Item, addChecklist, addProgress, toggleChecklist, removeById, updateText } from "./store";
import { renderList } from "./views/listView";
import { renderAddSheet, defaultDraft, buildItemFromDraft, type DraftAdd } from "./views/addSheet";
import { renderEditSheet } from "./views/editSheet";
import { renderTools } from "./views/toolsView";
import { byId } from "./components/dom";

registerSW({ immediate: true });

type Route = "list" | "tools";
const app = document.getElementById("app")!;

let db: DB;
let route: Route = "list";
let draft: DraftAdd = defaultDraft();
let editId: string | null = null;

const expandedIds = new Set<string>();
let listScrollY = 0;

let addWasOpen = false;
let editWasOpen = false;

let scribe = {
  running: false,
  startAt: undefined as number | undefined,
  elapsed: 0,
  log: [] as { t: number; text: string }[]
};

function setRoute(r: Route) {
  route = r;
  render();
}

function openAdd() {
  addWasOpen = true;
  const d = byId<HTMLDialogElement>("addSheet");
  if (!d.open) d.showModal();
}

function closeAdd() {
  addWasOpen = false;
  const d = byId<HTMLDialogElement>("addSheet");
  if (d.open) d.close();
}

function openEdit(id: string) {
  editId = id;
  editWasOpen = true;
  render();
  const d = byId<HTMLDialogElement>("editSheet");
  if (!d.open) d.showModal();
}

function closeEdit() {
  editWasOpen = false;
  const d = byId<HTMLDialogElement>("editSheet");
  if (d.open) d.close();
  editId = null;
  render();
}

async function commit() {
  db = { ...db, items: db.items.map(x => x), prefs: { ...db.prefs } };
  await saveDB(db);
}

function getItem(id: string): Item | null {
  return db.items.find(x => x.id === id) ?? null;
}

async function updateItem(id: string, fn: (it: Item) => Item) {
  const idx = db.items.findIndex(x => x.id === id);
  if (idx < 0) return;
  const it = db.items[idx];
  const next = fn({ ...it, updatedAt: Date.now() } as Item);
  db.items = [...db.items.slice(0, idx), next, ...db.items.slice(idx+1)];
  await commit();
  render();
}

// Some interactions inside the edit sheet (especially checkbox toggles) should persist
// without forcing a full re-render, otherwise mobile browsers can jump scroll position.
async function updateItemSilent(id: string, fn: (it: Item) => Item) {
  const idx = db.items.findIndex(x => x.id === id);
  if (idx < 0) return;
  const it = db.items[idx];
  const next = fn({ ...it, updatedAt: Date.now() } as Item);
  db.items = [...db.items.slice(0, idx), next, ...db.items.slice(idx+1)];
  await commit();
}

async function deleteItem(id: string) {
  db.items = db.items.filter(x => x.id !== id);
  await commit();
  if (editId === id) editId = null;
  render();
}

function startScribe() {
  if (scribe.running) return;
  scribe.running = true;
  scribe.startAt = Date.now() - scribe.elapsed;
}

function pauseScribe() {
  if (!scribe.running) return;
  scribe.running = false;
  if (scribe.startAt) scribe.elapsed = Date.now() - scribe.startAt;
}

function resetScribe() {
  scribe.running = false;
  scribe.startAt = undefined;
  scribe.elapsed = 0;
}

function tickScribe() {
  if (scribe.running && scribe.startAt) {
    scribe.elapsed = Date.now() - scribe.startAt;
    if (route === "tools") render();
  }
}
setInterval(tickScribe, 500);

function addScribeEntry(text: string) {
  const mm = Math.floor(scribe.elapsed / 60000);
  const ss = Math.floor((scribe.elapsed % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${pad(mm)}:${pad(ss)}`;
  scribe.log.unshift({ t: Date.now(), text: `${stamp} ${text}`.trim() });
}

async function wipeShift() {
  db.items = [];
  await commit();
  render();
}

function renderNav(): string {
  const mk = (r: Route, icon: string, label: string) => `
    <button class="navBtn ${route===r?"active":""}" data-action="nav" data-route="${r}">
      <div class="navIcon">${icon}</div>
      <div class="navLabel">${label}</div>
    </button>
  `;
  return `
    <div class="bottomNav">
      <div class="navInner">
        ${mk("list","☰","List")}
        <button class="navBtn active" data-action="openAdd">
          <div class="navIcon">＋</div>
          <div class="navLabel">Add</div>
        </button>
        ${mk("tools","🩺","Tools")}
      </div>
    </div>
  `;
}

function render() {
  const body = route === "list" ? renderList(db, expandedIds) : renderTools(scribe);
  const addDialog = renderAddSheet(db, draft);
  const editDialog = editId ? (() => {
    const it = getItem(editId!);
    return it ? renderEditSheet(it) : "";
  })() : "";

  app.innerHTML = `${body}${addDialog}${editDialog}${renderNav()}`;

  // Re-open dialogs after render if they were open (prevents closing during edits)
  const addD = document.getElementById("addSheet") as HTMLDialogElement | null;
  if (addWasOpen && addD && !addD.open) addD.showModal();

  const editD = document.getElementById("editSheet") as HTMLDialogElement | null;
  if (editWasOpen && editId && editD && !editD.open) editD.showModal();

  // Restore scroll position to prevent jump-to-top on re-render
  if (route === "list" && !addWasOpen && !editWasOpen) {
    requestAnimationFrame(() => {
      window.scrollTo(0, listScrollY);
    });
  }
}

document.addEventListener("click", async (e) => {
  const t = e.target as HTMLElement | null;
  if (!t) return;

  const btn = t.closest("[data-action]") as HTMLElement | null;
  if (!btn) return;

  const action = btn.getAttribute("data-action") ?? "";
  const tag = (btn as HTMLElement).tagName;
  const isField = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";

  // Fix16: Clicking/focusing fields inside sheets should NOT trigger action handlers (prevents re-render bounce).
  if (isField) {
    const inEdit = editWasOpen && (btn.closest && btn.closest("#editSheet"));
    const inAdd = addWasOpen && (btn.closest && btn.closest("#addSheet"));
    if (inEdit || inAdd) return;
  }

  if (!isField) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (action === "nav") {
    const r = (btn.getAttribute("data-route") ?? "list") as Route;
    setRoute(r);
    return;
  }

  if (action === "openAdd") { openAdd(); return; }
  if (action === "closeAdd") { closeAdd(); return; }

  if (action === "tabJob") { draft = { ...draft, tab: "job" }; render(); openAdd(); return; }
  if (action === "tabBleep") { draft = { ...draft, tab: "bleep" }; render(); openAdd(); return; }

  if (action === "addDraftTask") {
    const text = draft.draftTaskText.trim();
    if (!text) return;
    draft = { ...draft, draftTasks: [...draft.draftTasks, { text }], draftTaskText: "" };
    render(); openAdd();
    return;
  }

  if (action === "rmDraftTask") {
    const idx = Number(btn.getAttribute("data-idx") ?? "-1");
    if (idx < 0) return;
    draft = { ...draft, draftTasks: draft.draftTasks.filter((_,i)=>i!==idx) };
    render(); openAdd();
    return;
  }

  if (action === "wipeShift") { await wipeShift(); return; }

  if (action === "openEdit") {
    const id = btn.getAttribute("data-id") ?? "";
    if (id) openEdit(id);
    return;
  }
  if (action === "closeEdit") { closeEdit(); return; }


  if (action === "toggleExpand") {
    const id = btn.getAttribute("data-id") ?? "";
    if (!id) return;
    if (expandedIds.has(id)) expandedIds.delete(id); else expandedIds.add(id);
    render();
    return;
  }

  if (action === "toggleDone") {
    const id = btn.getAttribute("data-id") ?? "";
    if (!id) return;
    await updateItem(id, (it) => ({ ...it, done: !it.done }));
    return;
  }

  if (action === "deleteItem") {
    const id = btn.getAttribute("data-id") ?? "";
    if (!id) return;
    await deleteItem(id);
    return;
  }

  // Editor mutations




  if (action === "addCheck") {
    const id = btn.getAttribute("data-id") ?? "";
    const kind = (btn.getAttribute("data-kind") ?? "tasks") as "tasks"|"actions";
    if (!id) return;
    const sheet = btn.closest("#editSheet") as HTMLElement | null;
    const input = sheet?.querySelector(`input[data-action="newTaskInput"][data-id="${id}"][data-kind="${kind}"]`) as HTMLInputElement | null;
    const text = input?.value.trim() ?? "";
    if (!text) return;
    await updateItem(id, (it) => {
      const arr = kind === "tasks" ? it.tasks : it.actions;
      const next = addChecklist(arr, text);
      return kind === "tasks" ? ({ ...it, tasks: next }) : ({ ...it, actions: next });
    });
    if (input) input.value = "";
    return;
  }

  if (action === "toggleCheck") {
    const id = btn.getAttribute("data-id") ?? "";
    const kind = (btn.getAttribute("data-kind") ?? "tasks") as "tasks"|"actions";
    const xid = btn.getAttribute("data-xid") ?? "";
    if (!id || !xid) return;
    await updateItem(id, (it) => {
      const arr = kind === "tasks" ? it.tasks : it.actions;
      const next = toggleChecklist(arr, xid);
      return kind === "tasks" ? ({ ...it, tasks: next }) : ({ ...it, actions: next });
    });
    return;
  }

  if (action === "rmCheck") {
    const id = btn.getAttribute("data-id") ?? "";
    const kind = (btn.getAttribute("data-kind") ?? "tasks") as "tasks"|"actions";
    const xid = btn.getAttribute("data-xid") ?? "";
    if (!id || !xid) return;
    await updateItem(id, (it) => {
      const arr = kind === "tasks" ? it.tasks : it.actions;
      const next = removeById(arr, xid);
      return kind === "tasks" ? ({ ...it, tasks: next }) : ({ ...it, actions: next });
    });
    return;
  }


  if (action === "addProgress") {
    const id = btn.getAttribute("data-id") ?? "";
    if (!id) return;
    const sheet = btn.closest("#editSheet") as HTMLElement | null;
    const input = sheet?.querySelector(`input[data-action="newProgressInput"][data-id="${id}"]`) as HTMLInputElement | null;
    const text = input?.value.trim() ?? "";
    if (!text) return;
    await updateItem(id, (it) => ({ ...it, progress: addProgress(it.progress, text) }));
    if (input) input.value = "";
    return;
  }

  if (action === "rmProgress") {
    const id = btn.getAttribute("data-id") ?? "";
    const pid = btn.getAttribute("data-pid") ?? "";
    if (!id || !pid) return;
    await updateItem(id, (it) => ({ ...it, progress: removeById(it.progress, pid) }));
    return;
  }


  // Scribe actions
  if (action === "scribeStart") { startScribe(); render(); return; }
  if (action === "scribePause") { pauseScribe(); render(); return; }
  if (action === "scribeReset") { resetScribe(); render(); return; }

  if (action === "scribeQuick") {
    const txt = btn.getAttribute("data-text") ?? "";
    addScribeEntry(txt);
    render();
    return;
  }

  if (action === "scribeAdd") {
    const input = document.getElementById("scribeText") as HTMLInputElement | null;
    const txt = input?.value.trim() ?? "";
    if (!txt) return;
    addScribeEntry(txt);
    if (input) input.value = "";
    render();
    return;
  }

  if (action === "scribeClear") { scribe.log = []; render(); return; }
  if (action === "scribeCopy") {
    const text = scribe.log.slice().reverse().map(x => x.text).join("\n");
    try { await navigator.clipboard.writeText(text); } catch {}
    return;
  }
});

document.addEventListener("input", async (e) => {
  const t = e.target as HTMLElement | null;
  if (!t) return;

  if (t.id === "search") {
    db.prefs.search = (t as HTMLInputElement).value;
    await commit();
    render();
    return;
  }
  if (t.id === "kind") {
    db.prefs.kind = (t as HTMLSelectElement).value as any;
    await commit();
    render();
    return;
  }
  if (t.id === "filter") {
    db.prefs.filter = (t as HTMLSelectElement).value as any;
    await commit();
    render();
    return;
  }
  if (t.id === "sort") {
    db.prefs.sort = (t as HTMLSelectElement).value as any;
    await commit();
    render();
    return;
  }

  const form = t.closest("form");
  if (!form) return;
  if (form.id === "addJobForm" || form.id === "addBleepForm") {
    const input = t as HTMLInputElement;
    const name = input.name;
    if (!name) return;
    if (input.type === "checkbox") {
      draft = { ...draft, [name]: input.checked } as any;
    } else {
      draft = { ...draft, [name]: input.value } as any;
    }
  }
  // Edit sheet live edits (text fields)
  const act = (t as HTMLElement).getAttribute?.("data-action") ?? "";
  if (act === "editField") {
    const el = t as HTMLInputElement;
    const id = el.getAttribute("data-id") ?? "";
    const field = el.getAttribute("data-field") ?? "";
    if (id && field) await updateItem(id, (it) => ({ ...it, [field]: el.value || undefined } as any));
    return;
  }
  if (act === "editCheckText") {
    const el = t as HTMLInputElement;
    const id = el.getAttribute("data-id") ?? "";
    const kind = (el.getAttribute("data-kind") ?? "tasks") as "tasks"|"actions";
    const xid = el.getAttribute("data-xid") ?? "";
    if (!id || !xid) return;
    await updateItem(id, (it) => {
      const arr = kind === "tasks" ? it.tasks : it.actions;
      const next = updateText(arr, xid, el.value);
      return kind === "tasks" ? ({ ...it, tasks: next }) : ({ ...it, actions: next });
    });
    return;
  }
  if (act === "editProgressText") {
    const el = t as HTMLInputElement;
    const id = el.getAttribute("data-id") ?? "";
    const pid = el.getAttribute("data-pid") ?? "";
    if (!id || !pid) return;
    await updateItem(id, (it) => ({ ...it, progress: updateText(it.progress, pid, el.value) }));
    return;
  }

});

document.addEventListener("keydown", (e) => {
  const t = e.target as HTMLElement | null;
  if (!t) return;
  if (e.key !== "Enter") return;

  const form = t.closest("form") as HTMLFormElement | null;
  if (!form) return;

  const input = t as HTMLInputElement;
  if ((form.id === "addJobForm" || form.id === "addBleepForm") && input.name === "draftTaskText") {
    e.preventDefault();
    draft = { ...draft, draftTaskText: input.value };
    const text = draft.draftTaskText.trim();
    if (!text) return;
    draft = { ...draft, draftTasks: [...draft.draftTasks, { text }], draftTaskText: "" };
    render(); openAdd();
  }
});

document.addEventListener("submit", async (e) => {
  const form = e.target as HTMLFormElement | null;
  if (!form) return;

  if (form.id === "addJobForm" || form.id === "addBleepForm") {
    e.preventDefault();
    const item = buildItemFromDraft(draft);
    if (!item) return;

    db.items = [...db.items, item];
    await commit();
    draft = defaultDraft();
    render();
    closeAdd();
    return;
  }
});


document.addEventListener("change", async (e) => {
  const t = e.target as HTMLElement | null;
  if (!t) return;
  const act = (t as HTMLElement).getAttribute?.("data-action") ?? "";

  // Persist checkbox toggles from inside the edit sheet without re-rendering.
  // We intentionally ignore click handlers for inputs inside dialogs to prevent
  // scroll-position jumps. This handler ensures the data still saves.
  if (act === "toggleCheck") {
    const el = t as HTMLInputElement;
    const id = el.getAttribute("data-id") ?? "";
    const kind = (el.getAttribute("data-kind") ?? "tasks") as "tasks" | "actions";
    const xid = el.getAttribute("data-xid") ?? "";
    if (!id || !xid) return;
    await updateItemSilent(id, (it) => {
      const arr = kind === "tasks" ? it.tasks : it.actions;
      const next = toggleChecklist(arr, xid);
      return kind === "tasks" ? ({ ...it, tasks: next }) : ({ ...it, actions: next });
    });
    return;
  }

  if (act === "editUrgency") {
    const el = t as HTMLSelectElement;
    const id = el.getAttribute("data-id") ?? "";
    const val = el.value as any;
    if (id) await updateItem(id, (it) => ({ ...it, urgency: val }));
    return;
  }

  if (act === "editReviewBy") {
    const el = t as HTMLInputElement;
    const id = el.getAttribute("data-id") ?? "";
    const val = el.value;
    if (id) await updateItem(id, (it) => ({ ...it, reviewBy: val ? new Date(val).getTime() : undefined }));
    return;
  }

  if (act === "toggleCalledBack") {
    const el = t as HTMLInputElement;
    const id = el.getAttribute("data-id") ?? "";
    if (id) await updateItem(id, (it) => it.type==="bleep" ? ({ ...it, calledBack: el.checked } as any) : it);
    return;
  }
});


window.addEventListener("scroll", () => {
  if (route !== "list") return;
  if (addWasOpen || editWasOpen) return;
  listScrollY = window.scrollY;
}, { passive: true });

(async function init() {
  db = await loadDB();
  render();
})();
