// Helpers for blog post bodies. Posts written with the editor are stored as
// HTML; older posts (from the first plain-textarea version) are plain text
// with blank lines between paragraphs. These helpers are pure so they can run
// in both the editor (browser) and the public page (server).

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function looksLikeHtml(body: string): boolean {
  return /<\/?(p|h[1-6]|ul|ol|li|blockquote|img|hr|div|strong|em|a|br)[\s>/]/i.test(body);
}

export function legacyTextToHtml(body: string): string {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// Turns whatever is stored (HTML or legacy text) into HTML. The caller is
// responsible for sanitizing before rendering.
export function bodyToHtml(body: string | null | undefined): string {
  if (!body) return "";
  return looksLikeHtml(body) ? body : legacyTextToHtml(body);
}

// True when the HTML has no visible text and no image.
export function isBodyEmpty(html: string): boolean {
  if (/<img\s/i.test(html) || /data-ad-slot/i.test(html) || /<hr/i.test(html)) return false;
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "";
}
