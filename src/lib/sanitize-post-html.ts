// Small allow-list HTML sanitizer for blog post bodies. It rebuilds the HTML
// from scratch: only the tags and attributes below survive, everything else
// is dropped (its text is kept). Pure TypeScript with no dependencies, so it
// runs both on the server (before saving / rendering) and in the editor
// (when pasting).

import { isAllowedMapUrl, isAllowedVideoUrl } from "@/lib/embeds";

const VOID_TAGS = new Set(["br", "hr", "img"]);
const TAG_ALIASES: Record<string, string> = { b: "strong", i: "em", strike: "s", del: "s" };
const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "h2", "h3", "h4", "strong", "em", "u", "s",
  "a", "ul", "ol", "li", "blockquote", "img", "figure", "figcaption", "aside",
]);
// h1 is the post title, so headings inside the body start at h2.
const HEADING_ALIASES: Record<string, string> = { h1: "h2", h5: "h4", h6: "h4" };
// Tags whose contents must never be kept as text.
const DROP_WITH_CONTENT = new Set([
  "script", "style", "iframe", "object", "embed", "textarea", "title", "noscript", "template", "svg", "math",
]);

const ENTITY_MAP: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    return ENTITY_MAP[entity.toLowerCase()] ?? match;
  });
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw)) !== null) {
    attrs[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attrs;
}

// Only http(s), mailto and same-site links/images are allowed — never
// javascript:, data:, etc.
function safeUrl(value: string | undefined, allowMailto: boolean): string | null {
  if (!value) return null;
  // eslint-disable-next-line no-control-regex
  const compact = value.replace(/[\u0000- ]/g, "");
  if (/^https?:\/\//i.test(compact)) return value.trim();
  if (allowMailto && /^mailto:/i.test(compact)) return value.trim();
  if (/^\/(?!\/)/.test(compact)) return value.trim();
  if (allowMailto && compact.startsWith("#")) return value.trim();
  return null;
}

export function sanitizePostHtml(input: string): string {
  const out: string[] = [];
  const open: string[] = []; // currently open allowed tags
  // Every <div> seen, so each </div> knows what it closes:
  // "keep" (photo gallery), "skip" (placeholder blocks whose contents are
  // dropped) or "plain" (an ordinary div — removed, contents kept).
  const divs: ("keep" | "skip" | "plain")[] = [];
  let skipDivDepth = 0;
  const tokenRe =
    /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>|([^<]+)|</g;
  let skipUntil: string | null = null;
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(input)) !== null) {
    const [whole, slash, rawName, rawAttrs, text] = match;

    if (whole.startsWith("<!--")) continue;

    if (text !== undefined) {
      if (!skipUntil && skipDivDepth === 0) out.push(text);
      continue;
    }
    if (rawName === undefined) {
      // A lone "<" that isn't a tag.
      if (!skipUntil && skipDivDepth === 0) out.push("&lt;");
      continue;
    }

    let name = rawName.toLowerCase();
    const closing = slash === "/";

    if (skipUntil) {
      if (closing && name === skipUntil) skipUntil = null;
      continue;
    }

    // Inside a placeholder block (e.g. the editor's map preview): ignore
    // everything until its closing </div>.
    if (skipDivDepth > 0) {
      if (name === "div") {
        skipDivDepth += closing ? -1 : 1;
        if (closing) divs.pop();
        else divs.push("skip");
      }
      continue;
    }
    if (DROP_WITH_CONTENT.has(name)) {
      if (!closing && !whole.endsWith("/>")) skipUntil = name;
      continue;
    }

    name = HEADING_ALIASES[name] ?? TAG_ALIASES[name] ?? name;

    if (name === "div") {
      if (closing) {
        const kind = divs.pop();
        if (kind === "keep") {
          const index = open.lastIndexOf("div");
          if (index !== -1) {
            while (open.length > index) out.push(`</${open.pop()}>`);
          }
        }
        continue;
      }
      const attrs = parseAttributes(rawAttrs);
      const selfClosed = whole.endsWith("/>");
      const block = (html: string) => {
        out.push(html);
        if (selfClosed) return;
        divs.push("skip");
        skipDivDepth = 1;
      };
      if ("data-ad-slot" in attrs) block("<div data-ad-slot></div>");
      else if ("data-toc" in attrs) block("<div data-toc></div>");
      else if ("data-map" in attrs) {
        if (isAllowedMapUrl(attrs["data-map"])) {
          const caption = (attrs["data-caption"] ?? "").slice(0, 200);
          block(
            `<div data-map="${escapeAttr(attrs["data-map"])}"${
              caption ? ` data-caption="${escapeAttr(caption)}"` : ""
            }></div>`
          );
        } else divs.push("plain");
      } else if ("data-video" in attrs) {
        if (isAllowedVideoUrl(attrs["data-video"])) {
          block(`<div data-video="${escapeAttr(attrs["data-video"])}"></div>`);
        } else divs.push("plain");
      } else if ("data-gallery" in attrs) {
        out.push(`<div data-gallery="${attrs["data-gallery"] === "3" ? "3" : "2"}">`);
        open.push("div");
        divs.push("keep");
      } else {
        divs.push("plain");
      }
      continue;
    }

    if (!ALLOWED_TAGS.has(name)) continue;

    if (closing) {
      if (VOID_TAGS.has(name)) continue;
      const index = open.lastIndexOf(name);
      if (index === -1) continue;
      while (open.length > index) out.push(`</${open.pop()}>`);
      continue;
    }

    if (name === "a") {
      const attrs = parseAttributes(rawAttrs);
      const href = safeUrl(attrs.href, true);
      if (!href) continue; // drop the tag, keep the text
      const external = /^https?:\/\//i.test(href);
      out.push(
        `<a href="${escapeAttr(href)}"${external ? ' target="_blank"' : ""} rel="noopener noreferrer">`
      );
      open.push("a");
      continue;
    }

    if (name === "img") {
      const attrs = parseAttributes(rawAttrs);
      const src = safeUrl(attrs.src, false);
      if (!src) continue;
      out.push(`<img src="${escapeAttr(src)}" alt="${escapeAttr(attrs.alt ?? "")}" loading="lazy">`);
      continue;
    }

    if (VOID_TAGS.has(name)) {
      out.push(`<${name}>`);
      continue;
    }

    out.push(`<${name}>`);
    open.push(name);
  }

  while (open.length > 0) out.push(`</${open.pop()}>`);
  // Drop captions nobody filled in.
  return out.join("").replace(/<figcaption>(?:\s|<br>|&nbsp;)*<\/figcaption>/g, "");
}
