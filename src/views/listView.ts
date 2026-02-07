import type { DB } from "../store";
import { selectVisible, sortItems } from "../store";
import { esc } from "../components/dom";
import { renderCard } from "../ui/cards/Card";

export function renderList(db: DB, expandedIds: Set<string>, filtersOpen = false): string {
  const visible = sortItems(selectVisible(db.items, db.prefs), db.prefs.sort);

  return `
    <div class="tm-shell" data-testid="list-view">
      <header class="tm-header">
        <div class="tm-brand-block">
          <h1 class="tm-brand">TaskMedic</h1>
        </div>
        <div class="tm-header-actions">
          <button class="tm-header-chip" data-action="nav" data-route="tools" data-testid="nav-tools">Tools</button>
          <button class="tm-add-btn" data-action="openAdd" aria-label="Add" data-testid="open-add">+</button>
        </div>
      </header>

      <div class="tm-search-wrap">
        <div class="tm-search-shell">
          <svg class="tm-search-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="none"></circle>
            <path d="M20 20l-4.2-4.2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"></path>
          </svg>
          <input
            class="tm-search"
            id="search"
            data-testid="search-input"
            type="search"
            placeholder="Search tasks..."
            value="${esc(db.prefs.search)}"
          />
          <button class="tm-filter-btn" type="button" aria-label="Filter" data-action="toggleFilters" data-testid="toggle-filters">Filter</button>
        </div>
      </div>

      ${filtersOpen ? `
      <div class="tm-filter-panel">
        <select class="tm-select" id="kind" data-testid="filter-kind">
          <option value="all" ${db.prefs.kind === "all" ? "selected" : ""}>All</option>
          <option value="job" ${db.prefs.kind === "job" ? "selected" : ""}>Jobs</option>
          <option value="bleep" ${db.prefs.kind === "bleep" ? "selected" : ""}>Bleeps</option>
        </select>
        <select class="tm-select" id="filter" data-testid="filter-status">
          <option value="open" ${db.prefs.filter === "open" ? "selected" : ""}>Open</option>
          <option value="done" ${db.prefs.filter === "done" ? "selected" : ""}>Done</option>
          <option value="all" ${db.prefs.filter === "all" ? "selected" : ""}>All</option>
        </select>
        <select class="tm-select" id="sort" data-testid="filter-sort">
          <option value="triage" ${db.prefs.sort === "triage" ? "selected" : ""}>Triage</option>
          <option value="triageTime" ${db.prefs.sort === "triageTime" ? "selected" : ""}>Default</option>
          <option value="newest" ${db.prefs.sort === "newest" ? "selected" : ""}>Newest</option>
        </select>
      </div>
      ` : ""}

      <section class="tm-list-section">
        <ul class="tm-card-list" id="list" data-testid="card-list">
          ${visible.length ? visible.map((it) => renderCard(it, expandedIds.has(it.id))).join("") : `<li class="tm-empty-card">No items match your filters.</li>`}
        </ul>
      </section>
    </div>
  `;
}
