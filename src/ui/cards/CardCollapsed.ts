import type { Item } from "../../store";
import { fmtHM } from "../../components/dom";
import { renderPill } from "../pills/Pill";

function headline(it: Item): string {
  if (it.type === "job") {
    const ward = (it.ward ?? "Ward").trim() || "Ward";
    const bed = (it.bed ?? "?").trim() || "?";
    return `${ward} · Bed ${bed}`;
  }
  const from = it.from.trim() || "Bleep";
  return it.location ? `${from} · ${it.location}` : from;
}

function secondary(it: Item): string {
  if (it.type === "job") {
    const main = it.summary.trim();
    if (it.secondarySummary) return `${main} · ${it.secondarySummary.trim()}`;
    return main;
  }
  const summary = (it.summary ?? "").trim();
  if (summary) return summary;
  return it.calledBack ? "Called back" : "Awaiting callback";
}

export function renderPillRow(it: Item): string {
  const reviewTone = it.reviewBy && it.reviewBy <= Date.now() ? "danger" : "info";
  const reviewText = it.reviewBy ? `Review by ${fmtHM(it.reviewBy)}` : "No review time";

  const openTasks = it.tasks.filter((x) => !x.done).map((x) => x.text);
  const openActions = it.actions.filter((x) => !x.done).map((x) => x.text);
  const chips = [...openTasks, ...openActions].slice(0, 3);
  const taskPills = chips.length
    ? chips.map((label, idx) => renderPill(label, "neutral", `pill-task-${it.id}-${idx}`)).join("")
    : renderPill("No outstanding tasks", "neutral", `pill-task-${it.id}-none`);

  return `
    ${renderPill(it.urgency.toUpperCase(), it.urgency === "red" ? "danger" : it.urgency === "green" ? "success" : "amber", `pill-urgency-${it.id}`)}
    ${taskPills}
    ${renderPill(reviewText, reviewTone, `pill-review-${it.id}`)}
  `;
}

export function renderCardCollapsed(it: Item): string {
  return `
    <header class="tm-card-header" data-testid="card-header-${it.id}">
      <h3 class="tm-card-headline">${headline(it)}</h3>
      <p class="tm-card-summary">${secondary(it)}</p>
      <div class="tm-pill-row">
        ${renderPillRow(it)}
      </div>
    </header>
  `;
}
