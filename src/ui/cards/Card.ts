import type { Item } from "../../store";
import { esc } from "../../components/dom";
import { renderCardCollapsed } from "./CardCollapsed";
import { renderCardExpanded } from "./CardExpanded";

export function renderCard(it: Item, expanded: boolean): string {
  const expandedAttr = expanded ? "true" : "false";
  const doneClass = it.done ? " is-done" : "";
  const expandedClass = expanded ? " is-expanded" : "";

  return `
    <li class="tm-card-shell" data-testid="card-shell-${it.id}">
      <div class="tm-card-actions" data-testid="card-actions-${it.id}">
        <button
          type="button"
          class="tm-swipe-btn tm-swipe-edit"
          data-action="openEdit"
          data-id="${esc(it.id)}"
          data-testid="card-edit-${it.id}"
        >
          Edit
        </button>
        <button
          type="button"
          class="tm-swipe-btn tm-swipe-done"
          data-action="toggleDone"
          data-id="${esc(it.id)}"
          data-testid="card-done-${it.id}"
        >
          ${it.done ? "Open" : "Done"}
        </button>
      </div>
      <article
        class="tm-card-surface${expandedClass}${doneClass}"
        data-card-id="${esc(it.id)}"
        data-expanded="${expandedAttr}"
        data-urgency="${esc(it.urgency)}"
        data-action="cardTap"
        data-id="${esc(it.id)}"
        data-testid="item-card-${it.id}"
      >
        ${renderCardCollapsed(it)}
        <div class="tm-card-expand-wrap" aria-hidden="${expanded ? "false" : "true"}" data-testid="card-expand-wrap-${it.id}">
          ${renderCardExpanded(it)}
        </div>
      </article>
    </li>
  `;
}
