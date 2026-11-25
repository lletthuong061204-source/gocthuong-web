"use client";

// Docs-style notes on a post: select text → "Ghi chú" → write a comment.
// Notes belong to the signed-in reader (users/{uid}/notes) and only they can see them.
// Highlights use the CSS Custom Highlight API, so the article HTML is never modified.

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useAccount } from "@/lib/account";
import { useToast } from "./Toast";

export type Note = {
  id: string;
  post: string;
  lang: string;
  quote: string;
  prefix: string;
  suffix: string;
  start: number;
  text: string;
  createdAt: number;
  updatedAt: number;
};
type Anchor = Pick<Note, "quote" | "prefix" | "suffix" | "start">;
type Spot = { top: number; left: number };

const CTX = 32;
const LANG_LABEL: Record<string, string> = { vi: "VI", en: "EN", zh: "中文" };

/* ---------- text ↔ DOM ranges ---------- */

function offsetsOf(root: HTMLElement, r: Range) {
  const pre = document.createRange();
  pre.selectNodeContents(root);
  pre.setEnd(r.startContainer, r.startOffset);
  const start = pre.toString().length;
  return { start, end: start + r.toString().length };
}

function rangeAt(root: HTMLElement, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const r = document.createRange();
  let pos = 0;
  let started = false;
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    const len = n.data.length;
    if (!started && start <= pos + len) {
      r.setStart(n, Math.max(0, start - pos));
      started = true;
    }
    if (started && end <= pos + len) {
      r.setEnd(n, Math.max(0, end - pos));
      return r;
    }
    pos += len;
  }
  return null;
}

const commonTail = (a: string, b: string) => {
  let i = 0;
  while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
};
const commonHead = (a: string, b: string) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
};

/** Finds the quoted text again, even if the post was edited a little since. */
function locate(full: string, a: Anchor): [number, number] | null {
  if (!a.quote) return null;
  if (full.slice(a.start, a.start + a.quote.length) === a.quote) return [a.start, a.start + a.quote.length];
  let best = -1;
  let bestScore = -1;
  for (let i = full.indexOf(a.quote); i >= 0; i = full.indexOf(a.quote, i + 1)) {
    const score = commonTail(full.slice(Math.max(0, i - CTX), i), a.prefix) + commonHead(full.slice(i + a.quote.length, i + a.quote.length + CTX), a.suffix);
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  return best >= 0 ? [best, best + a.quote.length] : null;
}

/* ---------- highlights ---------- */

type HighlightRegistry = { set: (n: string, h: unknown) => void; delete: (n: string) => void };
const registry = () => (typeof CSS !== "undefined" ? ((CSS as unknown as { highlights?: HighlightRegistry }).highlights ?? null) : null);
const HighlightCtor = () => (typeof window !== "undefined" ? (window as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight : undefined);

function paint(name: string, ranges: Range[]) {
  const reg = registry();
  const H = HighlightCtor();
  if (!reg || !H) return;
  if (ranges.length) reg.set(name, new H(...ranges));
  else reg.delete(name);
}

/** Page zoom on <html> (the site uses 0.9 on desktop): rects are zoomed, CSS lengths are not. */
const zoom = () => parseFloat(getComputedStyle(document.documentElement).zoom || "1") || 1;

/* ---------- data ---------- */

async function lib() {
  const [{ fb }, fs] = await Promise.all([import("@/lib/firebase"), import("firebase/firestore")]);
  return { db: fb().db, fs };
}

/* ---------- component ---------- */

export default function PostNotes({ slug, lang, title, rootRef, contentKey }: { slug: string; lang: string; title: string; rootRef: RefObject<HTMLDivElement | null>; contentKey: string }) {
  const { user, enabled, openSignIn } = useAccount();
  const { flash, node: toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [bubble, setBubble] = useState<(Spot & Anchor) | null>(null);
  const [composer, setComposer] = useState<(Spot & Anchor) | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const ranges = useRef(new Map<string, Range>());
  const layer = useRef<HTMLDivElement | null>(null);

  // Live list of this reader's notes on this post.
  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }
    let off: (() => void) | undefined;
    let alive = true;
    lib().then(({ db, fs }) => {
      if (!alive) return;
      off = fs.onSnapshot(
        fs.query(fs.collection(db, "users", user.uid, "notes"), fs.where("post", "==", slug)),
        (snap) => setNotes(snap.docs.map((d) => ({ ...(d.data() as Omit<Note, "id">), id: d.id })).sort((a, b) => a.start - b.start)),
        () => setNotes([]),
      );
    });
    return () => {
      alive = false;
      off?.();
    };
  }, [user, slug]);

  const here = useMemo(() => notes.filter((n) => n.lang === lang), [notes, lang]);
  const elsewhere = notes.length - here.length;

  // Re-anchor and paint highlights whenever the notes or the shown version change.
  useEffect(() => {
    const root = rootRef.current;
    ranges.current.clear();
    if (!root) return;
    const full = root.textContent ?? "";
    for (const n of here) {
      const at = locate(full, n);
      const r = at && rangeAt(root, at[0], at[1]);
      if (r) ranges.current.set(n.id, r);
    }
    paint("gt-notes", [...ranges.current.values()]);
    return () => paint("gt-notes", []);
  }, [here, rootRef, contentKey]);

  // Stronger highlight on the note being looked at or written.
  useEffect(() => {
    const root = rootRef.current;
    let r: Range | null | undefined = active ? ranges.current.get(active) : undefined;
    if (!r && composer && root) {
      const at = locate(root.textContent ?? "", composer);
      r = at && rangeAt(root, at[0], at[1]);
    }
    paint("gt-note-active", r ? [r] : []);
    return () => paint("gt-note-active", []);
  }, [active, composer, here, rootRef]);

  const spotFor = useCallback((r: Range): Spot | null => {
    const host = layer.current?.parentElement;
    if (!host) return null;
    const rects = r.getClientRects();
    const first = rects[0] ?? r.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    const z = zoom();
    return { top: (first.top - h.top) / z, left: Math.min(Math.max((first.left - h.left) / z, 0), Math.max(0, h.width / z - 260)) };
  }, []);

  // Show the bubble for a fresh selection inside the article.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const root = rootRef.current;
      const sel = window.getSelection();
      if (!root || !sel || sel.isCollapsed || sel.rangeCount === 0) return setBubble(null);
      const r = sel.getRangeAt(0);
      if (!root.contains(r.commonAncestorContainer)) return setBubble(null);
      const quote = r.toString();
      if (quote.trim().length < 2) return setBubble(null);
      const full = root.textContent ?? "";
      const { start, end } = offsetsOf(root, r);
      const spot = spotFor(r);
      if (!spot) return;
      setBubble({ ...spot, quote: quote.slice(0, 1000), start, prefix: full.slice(Math.max(0, start - CTX), start), suffix: full.slice(end, end + CTX) });
    };
    const later = () => {
      clearTimeout(t);
      t = setTimeout(check, 180);
    };
    document.addEventListener("selectionchange", later);
    document.addEventListener("mouseup", later);
    return () => {
      clearTimeout(t);
      document.removeEventListener("selectionchange", later);
      document.removeEventListener("mouseup", later);
    };
  }, [rootRef, spotFor]);

  // Clicking highlighted text opens its note.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      if (!window.getSelection()?.isCollapsed) return;
      const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null; caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
      let node: Node | null = null;
      let offset = 0;
      const pos = doc.caretPositionFromPoint?.(e.clientX, e.clientY);
      if (pos) {
        node = pos.offsetNode;
        offset = pos.offset;
      } else {
        const cr = doc.caretRangeFromPoint?.(e.clientX, e.clientY);
        if (cr) {
          node = cr.startContainer;
          offset = cr.startOffset;
        }
      }
      if (!node) return;
      for (const [id, r] of ranges.current) {
        try {
          if (r.comparePoint(node, offset) === 0) {
            setActive(id);
            setPanel(true);
            return;
          }
        } catch {}
      }
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [rootRef, contentKey]);

  // Escape closes what is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (composer) setComposer(null);
      else if (panel) setPanel(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [composer, panel]);

  if (!enabled) return null;

  const startNote = () => {
    if (!bubble) return;
    if (!user) {
      openSignIn("Đăng nhập để ghi chú vào bài viết. Ghi chú chỉ mình bạn xem được.");
      return;
    }
    setComposer(bubble);
    setDraft("");
    setBubble(null);
    window.getSelection()?.removeAllRanges();
  };

  const copyQuote = async () => {
    if (!bubble) return;
    const url = `${location.origin}${location.pathname}`;
    try {
      await navigator.clipboard.writeText(`“${bubble.quote.trim()}”\n— ${title}, góc Thương\n${url}`);
      flash("Đã sao chép trích dẫn");
    } catch {
      flash("Không sao chép được — hãy bôi đen và nhấn Ctrl+C");
    }
    setBubble(null);
  };

  const save = async () => {
    if (!composer || !user) return;
    setBusy(true);
    try {
      const { db, fs } = await lib();
      const now = Date.now();
      const ref = await fs.addDoc(fs.collection(db, "users", user.uid, "notes"), {
        post: slug,
        lang,
        quote: composer.quote,
        prefix: composer.prefix,
        suffix: composer.suffix,
        start: composer.start,
        text: draft.trim().slice(0, 2000),
        createdAt: now,
        updatedAt: now,
      });
      setComposer(null);
      setActive(ref.id);
      flash("Đã lưu ghi chú");
    } catch {
      flash("Không lưu được ghi chú. Thử lại sau.");
    } finally {
      setBusy(false);
    }
  };

  const update = async (id: string, text: string) => {
    if (!user) return;
    const { db, fs } = await lib();
    await fs.updateDoc(fs.doc(db, "users", user.uid, "notes", id), { text: text.trim().slice(0, 2000), updatedAt: Date.now() });
    setEditing(null);
    flash("Đã sửa ghi chú");
  };

  const remove = async (id: string) => {
    if (!user) return;
    const { db, fs } = await lib();
    await fs.deleteDoc(fs.doc(db, "users", user.uid, "notes", id));
    setConfirmDel(null);
    if (active === id) setActive(null);
    flash("Đã xoá ghi chú");
  };

  const goTo = (id: string) => {
    setActive(id);
    const r = ranges.current.get(id);
    const el = r?.startContainer.parentElement;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const copyAll = async () => {
    const lines = [`# Ghi chú — ${title}`, `${location.origin}${location.pathname}`, ""];
    for (const n of here) lines.push(`> ${n.quote.trim().replace(/\n+/g, " ")}`, "", n.text || "(chưa có ghi chú)", "");
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      flash("Đã sao chép tất cả ghi chú");
    } catch {
      flash("Không sao chép được");
    }
  };

  const fmt = (ms: number) => new Date(ms).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

  return (
    <>
      {/* Positioned against the article column. */}
      <div ref={layer} aria-hidden={!bubble && !composer} className="pointer-events-none absolute inset-0 z-20">
        {bubble && !composer && (
          <div
            role="toolbar"
            aria-label="Thao tác với đoạn đã chọn"
            onMouseDown={(e) => e.preventDefault()}
            style={{ top: bubble.top, left: bubble.left }}
            className="pointer-events-auto absolute flex -translate-y-[calc(100%+10px)] items-center gap-1 rounded-xl bg-ink p-1 text-sm text-white shadow-lg"
          >
            <button type="button" onClick={startNote} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent px-3 text-white hover:bg-white/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z" /><path d="M12 9v6M9 12h6" /></svg>
              Ghi chú
            </button>
            <span aria-hidden="true" className="h-5 w-px bg-white/25" />
            <button type="button" onClick={copyQuote} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent px-3 text-white hover:bg-white/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 0 1 1-1h9" /></svg>
              Sao chép trích dẫn
            </button>
          </div>
        )}

        {composer && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            style={{ top: composer.top }}
            className="pointer-events-auto absolute right-0 left-0 mx-auto flex w-[min(420px,100%)] -translate-y-[calc(100%+12px)] flex-col gap-3 rounded-2xl border border-line bg-white p-4 text-base leading-normal shadow-xl"
          >
            <span className="font-mono text-xs tracking-[0.08em] text-muted">GHI CHÚ CHO ĐOẠN</span>
            <q className="line-clamp-3 font-serif text-lg italic leading-snug">{composer.quote.trim()}</q>
            <label className="sr-only" htmlFor="note-draft">Ghi chú của bạn</label>
            <textarea
              id="note-draft"
              autoFocus
              rows={3}
              maxLength={2000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
              }}
              placeholder="Ý hay, cách dịch, câu hỏi…"
              className="field resize-y"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">Chỉ mình bạn xem được · Ctrl+Enter để lưu</span>
              <span className="flex gap-2">
                <button type="button" onClick={() => setComposer(null)} className="h-10 cursor-pointer rounded-full border-0 bg-transparent px-3 text-sm">Huỷ</button>
                <button type="submit" disabled={busy} className="h-10 cursor-pointer rounded-full border-0 bg-ink px-5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Đang lưu…" : "Lưu"}</button>
              </span>
            </div>
          </form>
        )}
      </div>

      {user && notes.length > 0 && !panel && (
        <button
          type="button"
          onClick={() => setPanel(true)}
          className="fixed right-5 bottom-5 z-30 inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border-0 bg-ink px-5 text-sm font-medium text-white shadow-lg"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z" /></svg>
          Ghi chú của bạn · {here.length}
        </button>
      )}

      {panel && (
        <aside aria-label="Ghi chú của bạn" className="fixed top-0 right-0 bottom-0 z-40 flex w-[min(400px,100%)] flex-col border-l border-line bg-white shadow-2xl">
          <div className="flex items-center gap-2 border-b border-line px-5 py-4">
            <div className="flex flex-1 flex-col">
              <span className="text-lg font-semibold">Ghi chú của bạn</span>
              <span className="text-xs text-muted">
                {here.length} ghi chú ở bản {LANG_LABEL[lang] ?? lang}
                {elsewhere > 0 ? ` · ${elsewhere} ở bản dịch khác` : ""} · chỉ mình bạn xem được
              </span>
            </div>
            <button type="button" aria-label="Đóng" onClick={() => setPanel(false)} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent hover:bg-soft">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {here.length === 0 ? (
              <p className="m-0 text-sm leading-relaxed text-muted">Chưa có ghi chú ở bản này. Bôi đen một đoạn trong bài rồi bấm “Ghi chú”.</p>
            ) : (
              <ol className="m-0 flex list-none flex-col gap-3 p-0">
                {here.map((n) => {
                  const lost = !ranges.current.has(n.id);
                  return (
                    <li key={n.id} className={`flex flex-col gap-2 rounded-xl border p-3.5 ${active === n.id ? "border-ink bg-[#FAFAFA]" : "border-line"}`}>
                      <button type="button" onClick={() => goTo(n.id)} className="cursor-pointer border-0 bg-transparent p-0 text-left">
                        <q className="line-clamp-3 font-serif text-base italic leading-snug text-ink">{n.quote.trim()}</q>
                      </button>
                      {lost && <span className="text-xs text-muted">Đoạn này đã được sửa trong bài nên không tô sáng được.</span>}
                      {editing?.id === n.id ? (
                        <div className="flex flex-col gap-2">
                          <label className="sr-only" htmlFor={`edit-${n.id}`}>Sửa ghi chú</label>
                          <textarea id={`edit-${n.id}`} autoFocus rows={3} maxLength={2000} className="field" value={editing.text} onChange={(e) => setEditing({ id: n.id, text: e.target.value })} />
                          <span className="flex justify-end gap-2">
                            <button type="button" onClick={() => setEditing(null)} className="h-9 cursor-pointer rounded-full border-0 bg-transparent px-3 text-sm">Huỷ</button>
                            <button type="button" onClick={() => update(n.id, editing.text)} className="h-9 cursor-pointer rounded-full border-0 bg-ink px-4 text-sm font-semibold text-white">Lưu</button>
                          </span>
                        </div>
                      ) : (
                        n.text && <p className="m-0 text-sm leading-relaxed whitespace-pre-line">{n.text}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <span>{fmt(n.updatedAt)}</span>
                        <span className="ml-auto flex gap-1">
                          {confirmDel === n.id ? (
                            <>
                              <button type="button" onClick={() => remove(n.id)} className="h-8 cursor-pointer rounded-full border-0 bg-ink px-3 text-xs text-white">Xoá</button>
                              <button type="button" onClick={() => setConfirmDel(null)} className="h-8 cursor-pointer rounded-full border-0 bg-transparent px-2 text-xs">Giữ lại</button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => setEditing({ id: n.id, text: n.text })} className="h-8 cursor-pointer rounded-full border-0 bg-transparent px-2 text-xs text-ink hover:bg-soft">Sửa</button>
                              <button type="button" onClick={() => setConfirmDel(n.id)} className="h-8 cursor-pointer rounded-full border-0 bg-transparent px-2 text-xs text-ink hover:bg-soft">Xoá</button>
                            </>
                          )}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {here.length > 0 && (
            <div className="border-t border-line px-5 py-3">
              <button type="button" onClick={copyAll} className="btn btn-sm h-11 w-full text-sm">Sao chép tất cả (Markdown)</button>
            </div>
          )}
        </aside>
      )}
      {toast}
    </>
  );
}
