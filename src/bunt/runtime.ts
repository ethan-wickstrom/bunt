export function escapeHtml(str: unknown): string {
  const s = String(str);
  if (!s) return "";
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "\"")
    .replace(/'/g, "&#39;");
}
