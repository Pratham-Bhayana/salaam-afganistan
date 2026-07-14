"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { smoothScrollTo } from "@/lib/smoothScroll";
import styles from "./BackToTop.module.css";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 480);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      className={styles.btn}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        visibility: visible ? "visible" : "hidden",
      }}
      onClick={() => smoothScrollTo(0, { duration: 12000 })}
    >
      <ArrowUp size={18} />
    </button>
  );
}
