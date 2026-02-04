export function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c] as string));
}

export function fmtTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString([], { hour: "2-digit", minute: "2-digit", year: "numeric", month: "short", day: "2-digit" });
}

export function fmtHM(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function minutesUntil(ms?: number): string {
  if (!ms) return "";
  const diff = ms - Date.now();
  const mins = Math.round(diff / 60000);
  if (mins <= 0) return "due";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins/60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}
