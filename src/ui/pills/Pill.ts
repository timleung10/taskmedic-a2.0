export type PillTone = "neutral" | "info" | "danger" | "success" | "amber";

export function renderPill(label: string, tone: PillTone = "neutral", testId?: string): string {
  const tid = testId ? ` data-testid="${testId}"` : "";
  return `<span class="tm-pill tm-pill-${tone}"${tid}>${label}</span>`;
}
