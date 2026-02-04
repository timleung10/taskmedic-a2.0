import { get, set } from "idb-keyval";

export type Urgency = "red" | "amber" | "green";
export type ItemType = "job" | "bleep";

export type ChecklistItem = { id: string; text: string; done: boolean; t: number };
export type ProgressNote = { id: string; text: string; t: number };

export type BaseItem = {
  id: string;
  type: ItemType;
  createdAt: number;
  updatedAt: number;
  urgency: Urgency;
  done: boolean;
  reviewBy?: number;
  secondarySummary?: string;
  tasks: ChecklistItem[];
  actions: ChecklistItem[];
  progress: ProgressNote[];
};

export type JobItem = BaseItem & {
  type: "job";
  ward?: string;
  bed?: string;
  summary: string;
};

export type BleepItem = BaseItem & {
  type: "bleep";
  from: string;
  location?: string;
  summary?: string;
  calledBack: boolean;
};

export type Item = JobItem | BleepItem;

export type Prefs = {
  filter: "all" | "open" | "done";
  kind: "all" | "job" | "bleep";
  sort: "triage" | "newest";
  search: string;
};

export type DB = {
  version: number;
  items: Item[];
  prefs: Prefs;
};

const KEY = "taskmedic:v2";
const DEFAULT: DB = {
  version: 2,
  items: [],
  prefs: { filter: "open", kind: "all", sort: "triage", search: "" }
};

function uid(): string {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export async function loadDB(): Promise<DB> {
  const v = await get(KEY);
  if (!v) return structuredClone(DEFAULT);
  const db: DB = v as DB;
  if (!db.version) db.version = 2;
  if (!db.prefs) db.prefs = structuredClone(DEFAULT.prefs);
  if (!db.items) db.items = [];
  return db;
}

export async function saveDB(db: DB): Promise<void> {
  await set(KEY, db);
}

export function makeBase(type: ItemType): BaseItem {
  const now = Date.now();
  return {
    id: uid(),
    type,
    createdAt: now,
    updatedAt: now,
    urgency: "amber",
    done: false,
    tasks: [],
    actions: [],
    progress: []
  };
}

export function addChecklist(arr: ChecklistItem[], text: string): ChecklistItem[] {
  const t = text.trim();
  if (!t) return arr;
  const now = Date.now();
  return [...arr, { id: uid(), text: t, done: false, t: now }];
}

export function addProgress(arr: ProgressNote[], text: string): ProgressNote[] {
  const t = text.trim();
  if (!t) return arr;
  const now = Date.now();
  return [{ id: uid(), text: t, t: now }, ...arr];
}

export function toggleChecklist(arr: ChecklistItem[], id: string): ChecklistItem[] {
  return arr.map(x => x.id === id ? { ...x, done: !x.done } : x);
}

export function removeById<T extends { id: string }>(arr: T[], id: string): T[] {
  return arr.filter(x => x.id !== id);
}

export function updateText<T extends { id: string; text: string }>(arr: T[], id: string, text: string): T[] {
  return arr.map(x => x.id === id ? { ...x, text } : x);
}

export function urgencyRank(u: Urgency): number {
  return u === "red" ? 0 : u === "amber" ? 1 : 2;
}

export function selectVisible(items: Item[], prefs: Prefs): Item[] {
  const q = prefs.search.trim().toLowerCase();
  return items.filter(it => {
    if (prefs.kind !== "all" && it.type !== prefs.kind) return false;
    if (prefs.filter === "open" && it.done) return false;
    if (prefs.filter === "done" && !it.done) return false;
    if (!q) return true;
    const blob = JSON.stringify(it).toLowerCase();
    return blob.includes(q);
  });
}

export function sortItems(items: Item[], sort: Prefs["sort"]): Item[] {
  const list = [...items];
  if (sort === "newest") {
    list.sort((a,b) => b.createdAt - a.createdAt);
    return list;
  }
  list.sort((a,b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const ra = urgencyRank(a.urgency), rb = urgencyRank(b.urgency);
    if (ra !== rb) return ra - rb;
    const rba = a.reviewBy ?? Number.POSITIVE_INFINITY;
    const rbb = b.reviewBy ?? Number.POSITIVE_INFINITY;
    if (rba !== rbb) return rba - rbb;
    return a.createdAt - b.createdAt;
  });
  return list;
}
