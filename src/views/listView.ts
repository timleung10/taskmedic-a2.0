import type { DB, Item } from "../store";
import { selectVisible, sortItems, urgencyRank } from "../store";
import { esc } from "../components/dom";
import { renderItemCard } from "../components/itemCard";

const APP_VERSION = "0.3.6";

function whatNowTop3(items: Item[]): Item[] {
  const open = items.filter(x => !x.done);
  return [...open].sort((a,b) => {
    const ra = urgencyRank(a.urgency), rb = urgencyRank(b.urgency);
    if (ra !== rb) return ra - rb;
    const rba = a.reviewBy ?? Number.POSITIVE_INFINITY;
    const rbb = b.reviewBy ?? Number.POSITIVE_INFINITY;
    if (rba !== rbb) return rba - rbb;
    return a.createdAt - b.createdAt;
  }).slice(0, 3);
}

export function renderList(db: DB, expandedIds: Set<string>): string {
  const visible = sortItems(selectVisible(db.items, db.prefs), db.prefs.sort);
  const top = whatNowTop3(db.items);

  return `
    <div class="wrap">
      <header class="topbar">
        <div class="brand">
          <div class="logo">TM</div>
          <div>
            <h1>TaskMedic</h1>
            <div class="tag">Alpha v2 • Fix16 (v0.3.6)</div>
          </div>
        </div>

        <div class="pills">
          <span class="pill"><strong>Local-only</strong></span>
          <button class="btn small danger" data-action="wipeShift">End shift</button>
        </div>
      </header>

      <div class="notice card">
        <strong>Privacy:</strong> Do <strong>NOT</strong> enter patient names, NHS numbers, DOB, addresses, or identifiable details.
        <div class="help">Use ward/bed + anonymised summaries only.</div>
      </div>

      <section class="section">
        <div class="sectionTitle">
          <h2>What now</h2>
          <div class="small">Top 3 by urgency → review → time</div>
        </div>

        <ul class="list">
          ${top.length ? top.map(it => renderItemCard(it, expandedIds.has(it.id))).join("") : `<li class="card item"><div class="meta">No pending items.</div></li>`}
        </ul>
      </section>

      <section class="section">
        <div class="sectionTitle">
          <h2>List</h2>
          <div class="controls">
            <input class="search" id="search" type="search" placeholder="Search…" value="${esc(db.prefs.search)}" />
            <select class="select" id="kind">
              <option value="all" ${db.prefs.kind==="all"?"selected":""}>All</option>
              <option value="job" ${db.prefs.kind==="job"?"selected":""}>Jobs</option>
              <option value="bleep" ${db.prefs.kind==="bleep"?"selected":""}>Bleeps</option>
            </select>
            <select class="select" id="filter">
              <option value="open" ${db.prefs.filter==="open"?"selected":""}>Open</option>
              <option value="done" ${db.prefs.filter==="done"?"selected":""}>Done</option>
              <option value="all" ${db.prefs.filter==="all"?"selected":""}>All</option>
            </select>
            <select class="select" id="sort">
              <option value="triage" ${db.prefs.sort==="triage"?"selected":""}>Triage</option>
              <option value="newest" ${db.prefs.sort==="newest"?"selected":""}>Newest</option>
            </select>
          </div>
        </div>

        <ul class="list" id="list">
          ${visible.length ? visible.map(it => renderItemCard(it, expandedIds.has(it.id))).join("") : `<li class="card item"><div class="meta">No items match your filters.</div></li>`}
        </ul>
      </section>
    </div>
  `;
}
