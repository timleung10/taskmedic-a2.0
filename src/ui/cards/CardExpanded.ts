import type { ChecklistItem, Item, ProgressNote } from "../../store";
import { esc, fmtHM, fmtTime } from "../../components/dom";

function checklistRows(it: Item, kind: "tasks" | "actions", items: ChecklistItem[]): string {
  if (!items.length) {
    return `<div class="tm-empty-row">None</div>`;
  }

  return items
    .map((x) => {
      const doneClass = x.done ? " is-complete" : "";
      const stamp = x.done ? `Completed ${fmtHM(x.t)}` : "";
      return `
        <button
          type="button"
          class="tm-check-row${doneClass}"
          data-action="toggleInlineCheck"
          data-id="${it.id}"
          data-kind="${kind}"
          data-xid="${x.id}"
          data-testid="inline-check-${it.id}-${kind}-${x.id}"
          data-done="${x.done ? "true" : "false"}"
          aria-label="${kind} checkbox"
          aria-checked="${x.done ? "true" : "false"}"
          role="checkbox"
        >
          <div class="tm-check-copy">
            <div class="tm-check-text">${esc(x.text)}</div>
          </div>
          <div class="tm-check-meta">
            <div class="tm-check-time" data-testid="check-time-${it.id}-${kind}-${x.id}">${stamp}</div>
          </div>
        </button>
      `;
    })
    .join("");
}

function progressRows(progress: ProgressNote[]): string {
  if (!progress.length) return `<div class="tm-empty-row">None</div>`;
  return progress
    .slice(0, 8)
    .map(
      (p) => `
      <div class="tm-progress-row">
        <div class="tm-progress-marker"></div>
        <div class="tm-progress-copy">
          <div class="tm-progress-text">${esc(p.text)}</div>
          <div class="tm-progress-time">Reviewed at ${fmtTime(p.t)}</div>
        </div>
      </div>
    `
    )
    .join("");
}

export function renderCardExpanded(it: Item): string {
  return `
    <section class="tm-card-expanded" data-testid="card-expanded-${it.id}">
      <div class="tm-expanded-block">
        <h4 class="tm-expanded-title">Tasks</h4>
        <div class="tm-expanded-actions">
          <button class="tm-inline-btn" type="button" data-action="openEdit" data-id="${esc(it.id)}">Edit</button>
        </div>
        <div class="tm-expanded-list">
          ${checklistRows(it, "tasks", it.tasks)}
        </div>
      </div>
      <div class="tm-expanded-divider"></div>
      <div class="tm-expanded-block">
        <h4 class="tm-expanded-title">Actions</h4>
        <div></div>
        <div class="tm-expanded-list">
          ${checklistRows(it, "actions", it.actions)}
        </div>
      </div>
      <div class="tm-expanded-divider"></div>
      <div class="tm-expanded-block">
        <h4 class="tm-expanded-title">Progress</h4>
        <div></div>
        <div class="tm-expanded-list">
          ${progressRows(it.progress)}
        </div>
      </div>
    </section>
  `;
}
