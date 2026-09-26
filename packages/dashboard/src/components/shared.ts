export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

export function requirementTags(ids: string[] = []): string {
  return ids.map((id) => `<span class="tag">${escapeHtml(id)}</span>`).join("");
}

export function statusPill(success: boolean, label?: string): string {
  return `<span class="status ${success ? "success" : "failure"}"><span aria-hidden="true">${success ? "✓" : "×"}</span>${escapeHtml(label ?? (success ? "Passed" : "Failed"))}</span>`;
}

export function excerpt(value = "", limit = 360): string {
  const normalized = value.trim().replace(/\n{3,}/g, "\n\n");
  return normalized.length > limit ? `${normalized.slice(0, limit)}…` : normalized;
}

export function section(id: string, eyebrow: string, title: string, body: string): string {
  return `<section class="screen" id="${id}" aria-labelledby="${id}-title">
    <div class="section-heading"><p class="eyebrow">${eyebrow}</p><h2 id="${id}-title">${title}</h2></div>${body}
  </section>`;
}
