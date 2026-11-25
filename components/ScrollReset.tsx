"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Next.js keeps the scroll position when the new page is still in the viewport
 * (see next/dist/docs/…/link.md → `scroll`). On this site that left visitors in the
 * middle of the next page. This component:
 *  - goes to the top of every newly opened page (or to its #section when the link has one),
 *  - brings back the previous position on Back / Forward,
 *  - scrolls back to the top when a link to the page you are already on is clicked.
 */
const norm = (p: string) => p.replace(/\/+$/, "") || "/";

export default function ScrollReset() {
  const path = usePathname();
  const first = useRef(true);
  const fromHistory = useRef(false);
  const positions = useRef(new Map<string, number>());
  const current = useRef("");

  useEffect(() => {
    current.current = norm(location.pathname);
    // Remember where the visitor was on the page they are leaving.
    const remember = () => positions.current.set(current.current, window.scrollY);
    const onPop = () => {
      remember();
      fromHistory.current = true;
    };
    // Capture phase: runs before next/link calls preventDefault().
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      const same = norm(url.pathname) === norm(location.pathname);
      if (!same) remember();
      else if (!url.hash) window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("popstate", onPop);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    const now = norm(path || location.pathname);
    current.current = now;
    if (first.current) {
      first.current = false; // First load: the browser already handles #section and refresh.
      return;
    }
    const back = fromHistory.current;
    fromHistory.current = false;
    const id = decodeURIComponent(location.hash.slice(1));
    const saved = positions.current.get(now) ?? 0;
    let frame = 0;
    let tries = 0;
    // Wait for the new page to render; on Back keep trying until it is tall enough to restore the position.
    const go = () => {
      const target = id ? document.getElementById(id) : null;
      if (target) return target.scrollIntoView({ block: "start" });
      const y = back ? saved : 0;
      window.scrollTo({ top: y, left: 0, behavior: "instant" });
      if (back && Math.abs(window.scrollY - y) > 2 && tries++ < 40) frame = requestAnimationFrame(go);
    };
    frame = requestAnimationFrame(() => (frame = requestAnimationFrame(go)));
    return () => cancelAnimationFrame(frame);
  }, [path]);

  return null;
}
