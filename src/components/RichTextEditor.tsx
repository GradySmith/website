"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Megaphone,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { uploadBlogImage } from "@/lib/image-upload";
import { escapeHtml, isBodyEmpty } from "@/lib/post-body";
import { sanitizePostHtml } from "@/lib/sanitize-post-html";

// A dependency-free rich-text editor built on the browser's contenteditable
// support. It reports its content as sanitized HTML through `onChange`.

type ToolbarButton = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
};

function Divider() {
  return <span className="mx-1 h-5 w-px bg-brand-teal-200" aria-hidden="true" />;
}

export function RichTextEditor({
  initialHtml,
  onChange,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const initialRef = useRef(initialHtml);
  const [empty, setEmpty] = useState(() => isBodyEmpty(initialHtml));
  const [active, setActive] = useState<{ block: string; bold: boolean; italic: boolean; underline: boolean; ul: boolean; ol: boolean }>({
    block: "p",
    bold: false,
    italic: false,
    underline: false,
    ul: false,
    ol: false,
  });
  const [uploading, setUploading] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  // Make Enter create <p> (not <div>) paragraphs.
  useEffect(() => {
    document.execCommand("defaultParagraphSeparator", false, "p");
  }, []);

  const report = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    setEmpty(isBodyEmpty(html));
    onChange(html);
  }, [onChange]);

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

  function toggleBlock(tag: "h2" | "h3" | "blockquote") {
    run("formatBlock", active.block === tag ? "p" : tag);
  }

  function addLink() {
    restoreSelection();
    const selection = window.getSelection();
    const hasSelection = !!selection && !selection.isCollapsed;
    const url = window.prompt("Link address (e.g. https://example.com)", "https://");
    if (!url || url === "https://") return;
    const href = /^(https?:|mailto:|\/|#)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    if (hasSelection) {
      run("createLink", href);
    } else {
      run("insertHTML", `<a href="${escapeHtml(href)}">${escapeHtml(href)}</a>&nbsp;`);
    }
  }

  async function insertImages(files: File[]) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;
    setMessage(null);
    setUploading((count) => count + images.length);
    for (const file of images) {
      try {
        const url = await uploadBlogImage(file);
        restoreSelection();
        document.execCommand(
          "insertHTML",
          false,
          `<img src="${escapeHtml(url)}" alt="">`
        );
        // Keep the caret on its own line after the picture.
        report();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Image upload failed.");
      } finally {
        setUploading((count) => count - 1);
      }
    }
  }

  function insertAdSpot() {
    run("insertHTML", '<div data-ad-slot contenteditable="false"></div><p><br></p>');
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const files = Array.from(event.clipboardData.files);
    if (files.some((file) => file.type.startsWith("image/"))) {
      event.preventDefault();
      void insertImages(files);
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
      void insertImages(files);
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

  const buttons: (ToolbarButton | "divider")[] = [
    { label: "Heading", icon: Heading2, onClick: () => toggleBlock("h2"), active: active.block === "h2" },
    { label: "Subheading", icon: Heading3, onClick: () => toggleBlock("h3"), active: active.block === "h3" },
    { label: "Normal text", icon: Pilcrow, onClick: () => run("formatBlock", "p") },
    "divider",
    { label: "Bold (Ctrl+B)", icon: Bold, onClick: () => run("bold"), active: active.bold },
    { label: "Italic (Ctrl+I)", icon: Italic, onClick: () => run("italic"), active: active.italic },
    { label: "Underline (Ctrl+U)", icon: Underline, onClick: () => run("underline"), active: active.underline },
    "divider",
    { label: "Bulleted list", icon: List, onClick: () => run("insertUnorderedList"), active: active.ul },
    { label: "Numbered list", icon: ListOrdered, onClick: () => run("insertOrderedList"), active: active.ol },
    { label: "Quote", icon: Quote, onClick: () => toggleBlock("blockquote"), active: active.block === "blockquote" },
    "divider",
    { label: "Add link", icon: Link2, onClick: addLink },
    { label: "Add photos", icon: ImagePlus, onClick: () => fileInputRef.current?.click(), disabled: uploading > 0 },
    { label: "Divider line", icon: Minus, onClick: () => run("insertHorizontalRule") },
    { label: "Ad spot (ads coming later)", icon: Megaphone, onClick: insertAdSpot },
    "divider",
    { label: "Undo", icon: Undo2, onClick: () => run("undo") },
    { label: "Redo", icon: Redo2, onClick: () => run("redo") },
    { label: "Clear formatting", icon: RemoveFormatting, onClick: () => run("removeFormat") },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-teal-100 bg-white">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-brand-teal-100 bg-brand-teal-50 p-1.5">
        {buttons.map((button, index) =>
          button === "divider" ? (
            <Divider key={`d${index}`} />
          ) : (
            <button
              key={button.label}
              type="button"
              title={button.label}
              aria-label={button.label}
              aria-pressed={button.active ?? false}
              disabled={button.disabled}
              // Keep the text selection while clicking toolbar buttons.
              onMouseDown={(event) => event.preventDefault()}
              onClick={button.onClick}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
                button.active
                  ? "bg-brand-teal-600 text-white"
                  : "text-brand-teal-700 hover:bg-brand-teal-100"
              }`}
            >
              <button.icon className="h-4 w-4" />
            </button>
          )
        )}
        {uploading > 0 && (
          <span className="ml-2 text-xs text-brand-muted">Uploading {uploading} photo{uploading > 1 ? "s" : ""}…</span>
        )}
      </div>

      <div className="relative">
        {empty && (
          <p className="pointer-events-none absolute left-5 top-4 text-brand-teal-500">
            Start writing your post… Use the toolbar above to add headings, photos and links.
          </p>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Post body"
          className="post-body post-editor min-h-96 px-5 py-4 outline-none"
          dangerouslySetInnerHTML={{ __html: initialRef.current }}
          onInput={report}
          onBlur={report}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDoubleClick={handleDoubleClick}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          void insertImages(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      <p className="border-t border-brand-teal-100 bg-brand-teal-50 px-4 py-2 text-xs text-brand-muted">
        Tip: drag photos into the post or paste them. Double-click a photo to describe it.
      </p>
      {message && <p className="px-4 py-2 text-sm text-red-600">{message}</p>}
    </div>
  );
}
