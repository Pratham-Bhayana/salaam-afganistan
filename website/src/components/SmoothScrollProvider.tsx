"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Butter-smooth inertia scrolling (Lenis) + delayed smooth-scroll for in-page
 * hash links. The `lerp`/`duration` give the "little hard / heavy" feel the
 * page glides toward the target instead of snapping.
 */
export function SmoothScrollProvider() {
  useEffect(() => {
    // Respect users who prefer reduced motion — skip the inertia entirely.
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.15,
      // Heavy, weighted easing — quick pickup then a long, soft settle.
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      lerp: 0.085,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5,
    });

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

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
      lenis.scrollTo(el, { offset: -110, duration: 1.2 });
      history.pushState(null, "", hash);
    }

    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}
