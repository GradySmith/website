// Turns sanitized post HTML into the final markup for the public page (and
// the editor's live preview): adds ids to headings, builds the table of
// contents, and swaps the map/video placeholder blocks for real embeds.
// Pure — safe to run on server and in the browser.

export type Heading = { level: 2 | 3; text: string; id: string };

function headingSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/&[a-z#0-9]+;/g, " ")
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

function plainText(innerHtml: string): string {
  return innerHtml.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// Section titles (h2) and smaller titles (h3), in order, with unique ids.
export function addHeadingIds(html: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  const used = new Map<string, number>();
  const withIds = html.replace(/<(h[23])>([\s\S]*?)<\/\1>/g, (_whole, tag: string, inner: string) => {
    const text = plainText(inner);
    if (!text) return `<${tag}>${inner}</${tag}>`;
    const base = headingSlug(text);
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;
    headings.push({ level: tag === "h2" ? 2 : 3, text, id });
    return `<${tag} id="${id}">${inner}</${tag}>`;
  });
  return { html: withIds, headings };
}

export function tocMarkup(headings: Heading[], links: boolean): string {
  const items = headings
    .map((heading) => {
      const label = links ? `<a href="#${heading.id}">${heading.text}</a>` : `<span>${heading.text}</span>`;
      return `<li class="${heading.level === 3 ? "toc-sub" : "toc-main"}">${label}</li>`;
    })
    .join("");
  const body = items
    ? `<ul>${items}</ul>`
    : `<p class="post-toc-empty">Add section headings to your post and they'll be listed here.</p>`;
  return `<nav class="post-toc" aria-label="Table of contents"><p class="post-toc-title">Table of contents</p>${body}</nav>`;
}

export function renderPostHtml(sanitized: string): string {
  const { html, headings } = addHeadingIds(sanitized);

  return html
    .replace(/<div data-toc><\/div>/g, headings.length > 0 ? tocMarkup(headings, true) : "")
    .replace(
      /<div data-map="([^"]*)"(?: data-caption="([^"]*)")?><\/div>/g,
      (_whole, url: string, caption?: string) =>
        `<figure class="post-embed post-map"><iframe src="${url}" title="${caption || "Map"}" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>${
          caption ? `<figcaption>${caption}</figcaption>` : ""
        }</figure>`
    )
    .replace(
      /<div data-video="([^"]*)"><\/div>/g,
      (_whole, url: string) =>
        `<figure class="post-embed post-video"><iframe src="${url}" title="Video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></figure>`
    );
}
