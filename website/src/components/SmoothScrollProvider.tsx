"use client";

import { useEffect } from "react";
import { smoothScrollTo } from "@/lib/smoothScroll";

/** In-page hash links — delayed smooth scroll */
export function SmoothScrollProvider() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href^='#']");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const hash = anchor.getAttribute("href");
      if (!hash || hash === "#") return;

      const id = decodeURIComponent(hash.slice(1));
      const el = document.getElementById(id);
      if (!el) return;

      event.preventDefault();
      smoothScrollTo(el, { duration: 11000 });
      history.pushState(null, "", hash);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
