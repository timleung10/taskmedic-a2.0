import "./styles.css";
import { registerSW } from "virtual:pwa-register";
import {
  addChecklist,
  addProgress,
  loadDB,
  removeById,
  saveDB,
  toggleChecklist,
  type DB,
  type Item,
  updateText
} from "./store";
import { byId, fmtHM } from "./components/dom";
import { renderAddSheet, buildItemFromDraft, defaultDraft, type DraftAdd } from "./views/addSheet";
import { renderEditSheet } from "./views/editSheet";
import { renderList } from "./views/listView";
import { renderTools } from "./views/toolsView";
import { bindCardGestures } from "./ui/cards/gestures";
import { syncMotionPreference } from "./ui/cards/animations";
import { renderPillRow } from "./ui/cards/CardCollapsed";

registerSW({ immediate: true });

type Route = "list" | "tools";
const app = byId<HTMLElement>("app");

let db: DB;
let route: Route = "list";
let draft: DraftAdd = defaultDraft();
let editId: string | null = null;
const expandedIds = new Set<string>();
let listScrollY = 0;
let addWasOpen = false;
let editWasOpen = false;
let filtersOpen = false;
let unbindGestures: (() => void) | null = null;

const scribe = {
  running: false,
  startAt: undefined as number | undefined,
  elapsed: 0,
  log: [] as { t: number; text: string }[]
};

function setRoute(next: Route): void {
  route = next;
  render();
}

function openAdd(): void {
  addWasOpen = true;
  const d = byId<HTMLDialogElement>("addSheet");
  if (!d.open) d.showModal();
}

function closeAdd(): void {
  addWasOpen = false;
  const d = byId<HTMLDialogElement>("addSheet");
  if (d.open) d.close();
}

function openEdit(id: string): void {
  editId = id;
  editWasOpen = true;
  render();
  const d = byId<HTMLDialogElement>("editSheet");
  if (!d.open) d.showModal();
}

function closeEdit(): void {
  editWasOpen = false;
  const d = byId<HTMLDialogElement>("editSheet");
  if (d.open) d.close();
  editId = null;
  render();
}

async function commit(): Promise<void> {
  db = { ...db, items: db.items.map((x) => x), prefs: { ...db.prefs } };
  await saveDB(db);
}

function getItem(id: string): Item | null {
  return db.items.find((x) => x.id === id) ?? null;
}

async function updateItem(id: string, fn: (it: Item) => Item): Promise<void> {
  const idx = db.items.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const it = db.items[idx];
  const next = fn({ ...it, updatedAt: Date.now() } as Item);
  db.items = [...db.items.slice(0, idx), next, ...db.items.slice(idx + 1)];
  await commit();
  render();
}

async function updateItemSilent(id: string, fn: (it: Item) => Item): Promise<void> {
  const idx = db.items.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const it = db.items[idx];
  const next = fn({ ...it, updatedAt: Date.now() } as Item);
  db.items = [...db.items.slice(0, idx), next, ...db.items.slice(idx + 1)];
  await commit();
}

async function deleteItem(id: string): Promise<void> {
  db.items = db.items.filter((x) => x.id !== id);
  expandedIds.delete(id);
  await commit();
  if (editId === id) editId = null;
  render();
}

function toggleExpanded(id: string): void {
  if (expandedIds.has(id)) expandedIds.delete(id);
  else expandedIds.add(id);
}

function syncOutstandingPill(_id: string): void {
  const it = getItem(_id);
  if (!it) return;
  const safeId = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(_id) : _id;
  const card = document.querySelector(`[data-card-id="${safeId}"]`);
  const row = card?.querySelector(".tm-pill-row");
  if (row) row.innerHTML = renderPillRow(it);
}

function startScribe(): void {
  if (scribe.running) return;
  scribe.running = true;
  scribe.startAt = Date.now() - scribe.elapsed;
}

function pauseScribe(): void {
  if (!scribe.running) return;
  scribe.running = false;
  if (scribe.startAt) scribe.elapsed = Date.now() - scribe.startAt;
}

function resetScribe(): void {
  scribe.running = false;
  scribe.startAt = undefined;
  scribe.elapsed = 0;
}

function tickScribe(): void {
  if (!scribe.running || !scribe.startAt) return;
  scribe.elapsed = Date.now() - scribe.startAt;
  if (route === "tools") render();
}
setInterval(tickScribe, 500);

function addScribeEntry(text: string): void {
  const mm = Math.floor(scribe.elapsed / 60000);
  const ss = Math.floor((scribe.elapsed % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${pad(mm)}:${pad(ss)}`;
  scribe.log.unshift({ t: Date.now(), text: `${stamp} ${text}`.trim() });
}

async function wipeShift(): Promise<void> {
  db.items = [];
  expandedIds.clear();
  await commit();
  render();
}

function bindListGestures(): void {
  if (unbindGestures) {
    unbindGestures();
    unbindGestures = null;
  }

  if (route !== "list") return;
  const list = document.getElementById("list");
  if (!list) return;

  unbindGestures = bindCardGestures(list, {
    onLongPressToggle: (id) => {
      if (!expandedIds.has(id)) {
        expandedIds.add(id);
        render();
      }
    }
  });
}

function render(): void {
  const body = route === "list" ? renderList(db, expandedIds, filtersOpen) : renderTools(scribe);
  const addDialog = renderAddSheet(db, draft);
  const editDialog = editId
    ? (() => {
        const it = getItem(editId!);
        return it ? renderEditSheet(it) : "";
      })()
    : "";

  if (unbindGestures) {
    unbindGestures();
    unbindGestures = null;
  }

  app.innerHTML = `${body}${addDialog}${editDialog}`;

  const addD = document.getElementById("addSheet") as HTMLDialogElement | null;
  if (addWasOpen && addD && !addD.open) addD.showModal();

  const editD = document.getElementById("editSheet") as HTMLDialogElement | null;
  if (editWasOpen && editId && editD && !editD.open) editD.showModal();

  if (route === "list" && !addWasOpen && !editWasOpen) {
    requestAnimationFrame(() => {
      window.scrollTo(0, listScrollY);
    });
  }

  syncMotionPreference();
  bindListGestures();
}

function shouldIgnoreTap(btn: HTMLElement): boolean {
  const until = Number(btn.dataset.ignoreTapUntil ?? "0");
  return Number.isFinite(until) && Date.now() < until;
}

document.addEventListener("click", async (e) => {
  const target = e.target as HTMLElement | null;
  if (!target) return;

  const btn = target.closest("[data-action]") as HTMLElement | null;
  if (!btn) return;

  const action = btn.getAttribute("data-action") ?? "";
  const tag = btn.tagName;
  const isField = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";

  if (isField) {
    const inEdit = editWasOpen && btn.closest("#editSheet");
    const inAdd = addWasOpen && btn.closest("#addSheet");
    if (inEdit || inAdd) return;
  }

  if (!isField) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (action === "nav") {
    const next = (btn.getAttribute("data-route") ?? "list") as Route;
    setRoute(next);
    return;
  }

  if (action === "openAdd") {
    openAdd();
    return;
  }
  if (action === "closeAdd") {
    closeAdd();
    return;
  }

  if (action === "toggleFilters") {
    filtersOpen = !filtersOpen;
    render();
    return;
  }

  if (action === "tabJob") {
    draft = { ...draft, tab: "job" };
    render();
    openAdd();
    return;
  }
  if (action === "tabBleep") {
    draft = { ...draft, tab: "bleep" };
    render();
    openAdd();
    return;
  }

  if (action === "addDraftTask") {
    const text = draft.draftTaskText.trim();
    if (!text) return;
    draft = { ...draft, draftTasks: [...draft.draftTasks, { text }], draftTaskText: "" };
    render();
    openAdd();
    return;
  }

  if (action === "rmDraftTask") {
    const idx = Number(btn.getAttribute("data-idx") ?? "-1");
    if (idx < 0) return;
    draft = { ...draft, draftTasks: draft.draftTasks.filter((_, i) => i !== idx) };
    render();
    openAdd();
    return;
  }

  if (action === "wipeShift") {
    await wipeShift();
    return;
  }

  if (action === "toggleDraftCalledBack") {
    draft = { ...draft, calledBack: !draft.calledBack };
    render();
    openAdd();
    return;
  }

  if (action === "openEdit") {
    const id = btn.getAttribute("data-id") ?? "";
    if (id) openEdit(id);
    return;
  }

  if (action === "closeEdit") {
    closeEdit();
    return;
  }

  if (action === "cardTap") {
    const id = btn.getAttribute("data-id") ?? "";
    if (!id || shouldIgnoreTap(btn)) return;

    const isExpanded = expandedIds.has(id);
    const inExpandedPanel = Boolean(target.closest(".tm-card-expanded"));
    const inHeader = Boolean(target.closest(".tm-card-header"));

    if (!isExpanded) {
      expandedIds.add(id);
      render();
      return;
    }

    if (inHeader || !inExpandedPanel) {
      expandedIds.delete(id);
      render();
    }
    return;
  }

  if (action === "toggleExpand") {
    const id = btn.getAttribute("data-id") ?? "";
    if (!id) return;
    toggleExpanded(id);
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

  if (action === "toggleInlineCheck") {
    const id = btn.getAttribute("data-id") ?? "";
    const kind = (btn.getAttribute("data-kind") ?? "tasks") as "tasks" | "actions";
    const xid = btn.getAttribute("data-xid") ?? "";
    if (!id || !xid) return;

    const cardSurface = btn.closest(".tm-card-surface") as HTMLElement | null;
    if (cardSurface) {
      cardSurface.classList.add("suppress-press");
      window.setTimeout(() => cardSurface.classList.remove("suppress-press"), 160);
    }

    await updateItemSilent(id, (it) => {
      const arr = kind === "tasks" ? it.tasks : it.actions;
      const next = toggleChecklist(arr, xid);
      return kind === "tasks" ? ({ ...it, tasks: next }) : ({ ...it, actions: next });
    });

    const row = btn.closest(".tm-check-row");
    const nextChecked = btn.getAttribute("aria-checked") !== "true";
    btn.setAttribute("aria-checked", nextChecked ? "true" : "false");
    if (row) {
      row.classList.toggle("is-complete", nextChecked);
      row.setAttribute("data-done", nextChecked ? "true" : "false");
    }
    const timeNode = row?.querySelector<HTMLElement>(".tm-check-time");
    if (timeNode) timeNode.textContent = nextChecked ? `Completed ${fmtHM(Date.now())}` : "";
    syncOutstandingPill(id);
    return;
  }

  if (action === "addCheck") {
    const id = btn.getAttribute("data-id") ?? "";
    const kind = (btn.getAttribute("data-kind") ?? "tasks") as "tasks" | "actions";
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
    const kind = (btn.getAttribute("data-kind") ?? "tasks") as "tasks" | "actions";
    const xid = btn.getAttribute("data-xid") ?? "";
    if (!id || !xid) return;
    await updateItemSilent(id, (it) => {
      const arr = kind === "tasks" ? it.tasks : it.actions;
      const next = toggleChecklist(arr, xid);
      return kind === "tasks" ? ({ ...it, tasks: next }) : ({ ...it, actions: next });
    });
    const nextChecked = btn.getAttribute("aria-checked") !== "true";
    btn.setAttribute("aria-checked", nextChecked ? "true" : "false");
    return;
  }

  if (action === "toggleCalledBack") {
    const id = btn.getAttribute("data-id") ?? "";
    if (!id) return;
    await updateItem(id, (it) =>
      it.type === "bleep" ? ({ ...it, calledBack: !it.calledBack } as Item) : it
    );
    return;
  }

  if (action === "rmCheck") {
    const id = btn.getAttribute("data-id") ?? "";
    const kind = (btn.getAttribute("data-kind") ?? "tasks") as "tasks" | "actions";
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

  if (action === "scribeStart") {
    startScribe();
    render();
    return;
  }
  if (action === "scribePause") {
    pauseScribe();
    render();
    return;
  }
  if (action === "scribeReset") {
    resetScribe();
    render();
    return;
  }

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

  if (action === "scribeClear") {
    scribe.log = [];
    render();
    return;
  }

  if (action === "scribeCopy") {
    const text = scribe.log
      .slice()
      .reverse()
      .map((x) => x.text)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }
});

document.addEventListener("pointerdown", (e) => {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  const check = target.closest('[data-action="toggleInlineCheck"]') as HTMLElement | null;
  if (!check) return;
  const cardSurface = check.closest(".tm-card-surface") as HTMLElement | null;
  if (!cardSurface) return;
  cardSurface.classList.add("suppress-press");
  check.dataset.suppressCard = "true";
});

document.addEventListener("pointerup", (e) => {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  const check = target.closest('[data-action="toggleInlineCheck"]') as HTMLElement | null;
  if (!check) return;
  if (check.dataset.suppressCard !== "true") return;
  const cardSurface = check.closest(".tm-card-surface") as HTMLElement | null;
  if (cardSurface) cardSurface.classList.remove("suppress-press");
  delete check.dataset.suppressCard;
});

document.addEventListener("pointercancel", (e) => {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  const check = target.closest('[data-action="toggleInlineCheck"]') as HTMLElement | null;
  if (!check) return;
  if (check.dataset.suppressCard !== "true") return;
  const cardSurface = check.closest(".tm-card-surface") as HTMLElement | null;
  if (cardSurface) cardSurface.classList.remove("suppress-press");
  delete check.dataset.suppressCard;
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
    db.prefs.kind = (t as HTMLSelectElement).value as DB["prefs"]["kind"];
    await commit();
    render();
    return;
  }
  if (t.id === "filter") {
    db.prefs.filter = (t as HTMLSelectElement).value as DB["prefs"]["filter"];
    await commit();
    render();
    return;
  }
  if (t.id === "sort") {
    db.prefs.sort = (t as HTMLSelectElement).value as DB["prefs"]["sort"];
    await commit();
    render();
    return;
  }

  const form = t.closest("form");
  if (form && (form.id === "addJobForm" || form.id === "addBleepForm")) {
    const input = t as HTMLInputElement;
    const name = input.name;
    if (!name) return;
    if (input.type === "checkbox") draft = { ...draft, [name]: input.checked } as DraftAdd;
    else draft = { ...draft, [name]: input.value } as DraftAdd;
  }

  const act = t.getAttribute?.("data-action") ?? "";
  if (act === "editField") {
    const el = t as HTMLInputElement;
    const id = el.getAttribute("data-id") ?? "";
    const field = el.getAttribute("data-field") ?? "";
    if (id && field) await updateItemSilent(id, (it) => ({ ...it, [field]: el.value || undefined } as Item));
    return;
  }
  if (act === "editCheckText") {
    const el = t as HTMLInputElement;
    const id = el.getAttribute("data-id") ?? "";
    const kind = (el.getAttribute("data-kind") ?? "tasks") as "tasks" | "actions";
    const xid = el.getAttribute("data-xid") ?? "";
    if (!id || !xid) return;
    await updateItemSilent(id, (it) => {
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
    await updateItemSilent(id, (it) => ({ ...it, progress: updateText(it.progress, pid, el.value) }));
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
    render();
    openAdd();
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
  }
});

document.addEventListener("change", async (e) => {
  const t = e.target as HTMLElement | null;
  if (!t) return;
  const act = t.getAttribute?.("data-action") ?? "";

  if (act === "editUrgency") {
    const el = t as HTMLSelectElement;
    const id = el.getAttribute("data-id") ?? "";
    if (id) await updateItemSilent(id, (it) => ({ ...it, urgency: el.value as Item["urgency"] }));
    return;
  }

  if (act === "editReviewBy") {
    const el = t as HTMLInputElement;
    const id = el.getAttribute("data-id") ?? "";
    const val = el.value;
    if (id) await updateItemSilent(id, (it) => ({ ...it, reviewBy: val ? new Date(val).getTime() : undefined }));
    return;
  }
});

window.addEventListener(
  "scroll",
  () => {
    if (route !== "list") return;
    if (addWasOpen || editWasOpen) return;
    listScrollY = window.scrollY;
  },
  { passive: true }
);

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const onMotionChange = () => syncMotionPreference();
if (typeof motionQuery.addEventListener === "function") motionQuery.addEventListener("change", onMotionChange);
else motionQuery.addListener(onMotionChange);

(async function init() {
  db = await loadDB();
  render();
})();
