"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bold,
  Columns3,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Images,
  Info,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTree,
  MapPin,
  Megaphone,
  Minus,
  Pilcrow,
  PlayCircle,
  Quote,
  Redo2,
  RemoveFormatting,
  Trash2,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { normalizeMapInput, youtubeEmbedUrl } from "@/lib/embeds";
import { uploadBlogImage } from "@/lib/image-upload";
import { escapeHtml, isBodyEmpty } from "@/lib/post-body";
import { addHeadingIds, tocMarkup } from "@/lib/render-post";
import { sanitizePostHtml } from "@/lib/sanitize-post-html";

// A dependency-free rich-text editor built on contenteditable. It is styled
// exactly like the public post page, so what you see while writing is what
// visitors get. It reports its content as sanitized HTML through `onChange`.

const BLOCK_SELECTOR = "figure, [data-gallery], [data-map], [data-video], [data-toc], [data-ad-slot], aside";

type IconButton = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
};

type DialogState =
  | { kind: "link"; hadSelection: boolean }
  | { kind: "map" }
  | { kind: "video" }
  | null;

function Divider() {
  return <span className="mx-1 h-5 w-px bg-brand-teal-200" aria-hidden="true" />;
}

const INPUT_CLASS = "select-input w-full";

export function RichTextEditor({
  initialHtml,
  onChange,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const initialRef = useRef(initialHtml);
  const selectedRef = useRef<HTMLElement | null>(null);

  const [empty, setEmpty] = useState(() => isBodyEmpty(initialHtml));
  const [active, setActive] = useState({
    block: "p",
    bold: false,
    italic: false,
    underline: false,
    ul: false,
    ol: false,
  });
  const [uploading, setUploading] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [blockBar, setBlockBar] = useState<{ top: number; kind: string } | null>(null);

  // Make Enter create <p> (not <div>) paragraphs.
  useEffect(() => {
    document.execCommand("defaultParagraphSeparator", false, "p");
  }, []);

  // Fills in the live previews inside the non-editable blocks: the table of
  // contents list and the map / video frames.
  const hydrate = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const { headings } = addHeadingIds(editor.innerHTML.replace(/<div data-toc[^>]*>[\s\S]*?<\/nav><\/div>/g, ""));
    editor.querySelectorAll<HTMLElement>("[data-toc]").forEach((block) => {
      block.contentEditable = "false";
      const markup = tocMarkup(headings, false);
      if (block.innerHTML !== markup) block.innerHTML = markup;
    });

    editor.querySelectorAll<HTMLElement>("[data-map], [data-video]").forEach((block) => {
      block.contentEditable = "false";
      if (block.querySelector("iframe")) return;
      const iframe = document.createElement("iframe");
      iframe.src = block.dataset.map ?? block.dataset.video ?? "";
      iframe.loading = "lazy";
      iframe.title = block.dataset.map ? "Map preview" : "Video preview";
      block.appendChild(iframe);
    });

    editor.querySelectorAll<HTMLElement>("[data-ad-slot]").forEach((block) => {
      block.contentEditable = "false";
    });
  }, []);

  const placeBlockBar = useCallback(() => {
    const block = selectedRef.current;
    const wrapper = wrapperRef.current;
    if (!block || !wrapper || !wrapper.contains(block)) {
      setBlockBar(null);
      return;
    }
    const top = block.getBoundingClientRect().top - wrapper.getBoundingClientRect().top;
    const kind = block.hasAttribute("data-gallery")
      ? "gallery"
      : block.tagName === "FIGURE"
        ? "figure"
        : "block";
    setBlockBar({ top: Math.max(top, 0), kind });
  }, []);

  const report = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    hydrate();
    const html = sanitizePostHtml(editor.innerHTML);
    setEmpty(isBodyEmpty(html));
    onChange(html);
    placeBlockBar();
  }, [hydrate, onChange, placeBlockBar]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const refreshActive = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    if (!editor.contains(selection.anchorNode)) return;

    savedRange.current = selection.getRangeAt(0).cloneRange();
    const block = String(document.queryCommandValue("formatBlock")).toLowerCase().replace(/[<>]/g, "");
    setActive({
      block: block || "p",
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      ul: document.queryCommandState("insertUnorderedList"),
      ol: document.queryCommandState("insertOrderedList"),
    });
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshActive);
    return () => document.removeEventListener("selectionchange", refreshActive);
  }, [refreshActive]);

  function restoreSelection() {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const range = savedRange.current;
    if (range && editor.contains(range.commonAncestorContainer)) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  function run(command: string, value?: string) {
    restoreSelection();
    document.execCommand(command, false, value);
    report();
    refreshActive();
  }

  function insertHtml(html: string) {
    restoreSelection();
    document.execCommand("insertHTML", false, html);
    report();
  }

  function toggleBlock(tag: "h2" | "h3" | "blockquote") {
    run("formatBlock", active.block === tag ? "p" : tag);
  }

  // ---- Photos -----------------------------------------------------------

  async function uploadAll(files: File[]): Promise<string[]> {
    const images = files.filter((file) => file.type.startsWith("image/"));
    const urls: string[] = [];
    if (images.length === 0) return urls;
    setMessage(null);
    setUploading((count) => count + images.length);
    for (const file of images) {
      try {
        urls.push(await uploadBlogImage(file));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Image upload failed.");
      } finally {
        setUploading((count) => count - 1);
      }
    }
    return urls;
  }

  async function insertPhotos(files: File[]) {
    const urls = await uploadAll(files);
    if (urls.length === 0) return;
    insertHtml(
      urls
        .map(
          (url) =>
            `<figure><img src="${escapeHtml(url)}" alt=""><figcaption><br></figcaption></figure>`
        )
        .join("") + "<p><br></p>"
    );
  }

  async function insertGallery(files: File[]) {
    const urls = await uploadAll(files);
    if (urls.length === 0) return;
    const columns = urls.length === 3 || urls.length >= 5 ? 3 : 2;
    insertHtml(
      `<div data-gallery="${columns}">${urls
        .map((url) => `<img src="${escapeHtml(url)}" alt="">`)
        .join("")}</div><p><br></p>`
    );
  }

  // ---- Other blocks -----------------------------------------------------

  function insertToc() {
    if (editorRef.current?.querySelector("[data-toc]")) {
      setMessage("This post already has a table of contents.");
      return;
    }
    setMessage(null);
    insertHtml('<div data-toc contenteditable="false"></div><p><br></p>');
  }

  function insertAdSpot() {
    insertHtml('<div data-ad-slot contenteditable="false"></div><p><br></p>');
  }

  function insertTip() {
    const selected = window.getSelection()?.toString().trim();
    insertHtml(`<aside><p>${escapeHtml(selected || "Write your tip or note here")}</p></aside><p><br></p>`);
  }

  function openDialog(next: NonNullable<DialogState>) {
    setDialogError(null);
    setDialog(next);
  }

  function submitDialog(form: HTMLFormElement) {
    const data = new FormData(form);
    const value = String(data.get("value") ?? "").trim();
    if (!dialog) return;

    if (dialog.kind === "link") {
      if (!value) return setDialogError("Paste the link address.");
      const href = /^(https?:|mailto:|\/|#)/i.test(value) ? value : `https://${value}`;
      const label = String(data.get("label") ?? "").trim();
      if (dialog.hadSelection) {
        run("createLink", href);
      } else {
        insertHtml(`<a href="${escapeHtml(href)}">${escapeHtml(label || href)}</a>&nbsp;`);
      }
    } else if (dialog.kind === "map") {
      const url = normalizeMapInput(value);
      if (!url) {
        return setDialogError(
          "I couldn't embed that. Type a place name, or paste a Google My Maps / Google Maps embed link."
        );
      }
      const caption = String(data.get("caption") ?? "").trim();
      insertHtml(
        `<div data-map="${escapeHtml(url)}"${
          caption ? ` data-caption="${escapeHtml(caption)}"` : ""
        } contenteditable="false"></div><p><br></p>`
      );
    } else if (dialog.kind === "video") {
      const url = youtubeEmbedUrl(value);
      if (!url) return setDialogError("Paste a YouTube link (youtube.com or youtu.be).");
      insertHtml(`<div data-video="${escapeHtml(url)}" contenteditable="false"></div><p><br></p>`);
    }
    setDialog(null);
  }

  function openLinkDialog() {
    restoreSelection();
    const selection = window.getSelection();
    openDialog({ kind: "link", hadSelection: !!selection && !selection.isCollapsed });
  }

  // ---- Selected block (move / remove / gallery columns) -----------------

  function selectBlock(block: HTMLElement | null) {
    selectedRef.current?.classList.remove("is-selected");
    selectedRef.current = block;
    block?.classList.add("is-selected");
    placeBlockBar();
  }

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("a") && target.closest("[data-toc]")) event.preventDefault();
    const block = target.closest<HTMLElement>(BLOCK_SELECTOR);
    selectBlock(block && editorRef.current?.contains(block) ? block : null);
  }

  function moveSelected(direction: "up" | "down") {
    const block = selectedRef.current;
    if (!block) return;
    const sibling = direction === "up" ? block.previousElementSibling : block.nextElementSibling;
    if (!sibling) return;
    if (direction === "up") sibling.before(block);
    else sibling.after(block);
    report();
  }

  function removeSelected() {
    const block = selectedRef.current;
    if (!block) return;
    selectedRef.current = null;
    block.remove();
    setBlockBar(null);
    report();
  }

  function toggleGalleryColumns() {
    const block = selectedRef.current;
    if (!block?.hasAttribute("data-gallery")) return;
    block.setAttribute("data-gallery", block.getAttribute("data-gallery") === "3" ? "2" : "3");
    report();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const block = selectedRef.current;
    const selection = window.getSelection();
    // Delete a clicked embed (map, video, contents…) with the keyboard.
    if (
      block &&
      (event.key === "Delete" || event.key === "Backspace") &&
      block.matches("[data-map], [data-video], [data-toc], [data-ad-slot]") &&
      (!selection || selection.isCollapsed)
    ) {
      event.preventDefault();
      removeSelected();
    }
  }

  // ---- Paste / drop / image details ------------------------------------

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const files = Array.from(event.clipboardData.files);
    if (files.some((file) => file.type.startsWith("image/"))) {
      event.preventDefault();
      void insertPhotos(files);
      return;
    }
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const plain = event.clipboardData.getData("text/plain");
    if (html) {
      document.execCommand("insertHTML", false, sanitizePostHtml(html));
    } else if (plain) {
      const paragraphs = plain
        .split(/\n{2,}/)
        .map((chunk) => `<p>${escapeHtml(chunk.trim()).replace(/\n/g, "<br>")}</p>`)
        .join("");
      document.execCommand("insertHTML", false, paragraphs);
    }
    report();
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    const files = Array.from(event.dataTransfer.files);
    if (files.some((file) => file.type.startsWith("image/"))) {
      event.preventDefault();
      void insertPhotos(files);
    }
  }

  function handleDoubleClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.tagName !== "IMG") return;
    const image = target as HTMLImageElement;
    const alt = window.prompt("Describe this image (helps accessibility and search):", image.alt);
    if (alt === null) return;
    image.alt = alt;
    report();
  }

  // ---- Toolbar ----------------------------------------------------------

  const formatButtons: (IconButton | "divider")[] = [
    { label: "Section title — shows in the table of contents", icon: Heading2, onClick: () => toggleBlock("h2"), active: active.block === "h2" },
    { label: "Smaller title — a sub-section", icon: Heading3, onClick: () => toggleBlock("h3"), active: active.block === "h3" },
    { label: "Normal text", icon: Pilcrow, onClick: () => run("formatBlock", "p") },
    "divider",
    { label: "Bold (Ctrl+B)", icon: Bold, onClick: () => run("bold"), active: active.bold },
    { label: "Italic (Ctrl+I)", icon: Italic, onClick: () => run("italic"), active: active.italic },
    { label: "Underline (Ctrl+U)", icon: Underline, onClick: () => run("underline"), active: active.underline },
    "divider",
    { label: "Bulleted list", icon: List, onClick: () => run("insertUnorderedList"), active: active.ul },
    { label: "Numbered list", icon: ListOrdered, onClick: () => run("insertOrderedList"), active: active.ol },
    { label: "Quote", icon: Quote, onClick: () => toggleBlock("blockquote"), active: active.block === "blockquote" },
    { label: "Add link", icon: Link2, onClick: openLinkDialog },
    "divider",
    { label: "Divider line", icon: Minus, onClick: () => run("insertHorizontalRule") },
    { label: "Undo", icon: Undo2, onClick: () => run("undo") },
    { label: "Redo", icon: Redo2, onClick: () => run("redo") },
    { label: "Clear formatting", icon: RemoveFormatting, onClick: () => run("removeFormat") },
  ];

  const insertButtons: IconButton[] = [
    { label: "Photo", icon: ImageIcon, onClick: () => photoInputRef.current?.click(), disabled: uploading > 0 },
    { label: "Photo gallery", icon: Images, onClick: () => galleryInputRef.current?.click(), disabled: uploading > 0 },
    { label: "Map", icon: MapPin, onClick: () => openDialog({ kind: "map" }) },
    { label: "Video", icon: PlayCircle, onClick: () => openDialog({ kind: "video" }) },
    { label: "Contents", icon: ListTree, onClick: insertToc },
    { label: "Tip box", icon: Info, onClick: insertTip },
    { label: "Ad spot", icon: Megaphone, onClick: insertAdSpot },
  ];

  const keepSelection = (event: React.MouseEvent) => event.preventDefault();

  return (
    <div ref={wrapperRef} className="relative">
      <div className="sticky top-0 z-20 flex flex-col gap-1 rounded-2xl border border-brand-teal-100 bg-brand-teal-50/95 p-1.5 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-0.5">
          {formatButtons.map((button, index) =>
            button === "divider" ? (
              <Divider key={`d${index}`} />
            ) : (
              <button
                key={button.label}
                type="button"
                title={button.label}
                aria-label={button.label}
                aria-pressed={button.active ?? false}
                onMouseDown={keepSelection}
                onClick={button.onClick}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  button.active
                    ? "bg-brand-teal-600 text-white"
                    : "text-brand-teal-700 hover:bg-brand-teal-100"
                }`}
              >
                <button.icon className="h-4 w-4" />
              </button>
            )
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 border-t border-brand-teal-100 pt-1.5">
          <span className="px-1.5 text-xs font-medium uppercase tracking-wide text-brand-muted">Add</span>
          {insertButtons.map((button) => (
            <button
              key={button.label}
              type="button"
              disabled={button.disabled}
              onMouseDown={keepSelection}
              onClick={button.onClick}
              className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-medium text-brand-teal-700 shadow-sm transition-colors hover:bg-brand-teal-100 disabled:opacity-40"
            >
              <button.icon className="h-4 w-4" />
              {button.label}
            </button>
          ))}
          {uploading > 0 && (
            <span className="ml-2 text-xs text-brand-muted">
              Uploading {uploading} photo{uploading > 1 ? "s" : ""}…
            </span>
          )}
        </div>
      </div>

      {message && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
          {message}
        </p>
      )}

      <div className="relative mt-4">
        {empty && (
          <p className="pointer-events-none absolute left-0 top-0 text-lg text-brand-teal-500">
            Start writing your post… Add a section title, then photos, maps and more from the toolbar above.
          </p>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Post body"
          className="post-body post-editor min-h-96 outline-none"
          dangerouslySetInnerHTML={{ __html: initialRef.current }}
          onInput={report}
          onBlur={report}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDoubleClick={handleDoubleClick}
        />

        {blockBar && (
          <div
            className="absolute right-2 z-10 flex items-center gap-1 rounded-full border border-brand-teal-200 bg-white px-1.5 py-1 shadow-md"
            style={{ top: Math.max(blockBar.top + 8, 0) }}
          >
            <BarButton label="Move up" onClick={() => moveSelected("up")} icon={ArrowUp} />
            <BarButton label="Move down" onClick={() => moveSelected("down")} icon={ArrowDown} />
            {blockBar.kind === "gallery" && (
              <BarButton label="Switch between 2 and 3 columns" onClick={toggleGalleryColumns} icon={Columns3} />
            )}
            <BarButton label="Remove" onClick={removeSelected} icon={Trash2} danger />
          </div>
        )}
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          void insertPhotos(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          void insertGallery(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      <p className="mt-6 text-xs text-brand-muted">
        Tips: click a photo, map or video to move or remove it. Click under a photo to add a caption. Double-click a
        photo to describe it. You can also drag photos straight into the post.
      </p>

      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDialog(null);
          }}
        >
          <form
            className="flex w-full max-w-md flex-col gap-4 rounded-3xl bg-white p-6 shadow-xl"
            onSubmit={(event) => {
              event.preventDefault();
              submitDialog(event.currentTarget);
            }}
          >
            {dialog.kind === "link" && (
              <>
                <h3 className="font-display text-xl text-brand-ink">Add a link</h3>
                <label className="flex flex-col gap-1 text-sm text-brand-muted">
                  Link address
                  <input name="value" autoFocus placeholder="https://…" className={INPUT_CLASS} />
                </label>
                {!dialog.hadSelection && (
                  <label className="flex flex-col gap-1 text-sm text-brand-muted">
                    Text to show (optional)
                    <input name="label" className={INPUT_CLASS} />
                  </label>
                )}
              </>
            )}
            {dialog.kind === "map" && (
              <>
                <h3 className="font-display text-xl text-brand-ink">Add a map</h3>
                <label className="flex flex-col gap-1 text-sm text-brand-muted">
                  Place name or map link
                  <input
                    name="value"
                    autoFocus
                    placeholder="Kel Suu Lake, Kyrgyzstan"
                    className={INPUT_CLASS}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-brand-muted">
                  Caption (optional) — e.g. “Where to stay in Naryn”
                  <input name="caption" className={INPUT_CLASS} />
                </label>
                <p className="text-xs text-brand-muted">
                  For an accommodation map: build one in Google My Maps (mymaps.google.com), pin your hotels, then
                  paste its share link here. Google Maps, OpenStreetMap and Stay22 embed links work too.
                </p>
              </>
            )}
            {dialog.kind === "video" && (
              <>
                <h3 className="font-display text-xl text-brand-ink">Add a video</h3>
                <label className="flex flex-col gap-1 text-sm text-brand-muted">
                  YouTube link
                  <input
                    name="value"
                    autoFocus
                    placeholder="https://www.youtube.com/watch?v=…"
                    className={INPUT_CLASS}
                  />
                </label>
              </>
            )}
            {dialogError && <p className="text-sm text-red-600">{dialogError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="rounded-full px-4 py-2 text-sm text-brand-muted hover:text-brand-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-brand-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-teal-700"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function BarButton({
  label,
  icon: Icon,
  onClick,
  danger = false,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
        danger ? "text-red-600 hover:bg-red-50" : "text-brand-teal-700 hover:bg-brand-teal-100"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
