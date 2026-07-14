import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./AboutCta.module.css";

export function AboutCta() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.card}>
          <div>
            <h2>Ready to begin your visa application?</h2>
            <p>
              Start online in minutes. Upload documents, track progress, and move forward
              with guided support.
            </p>
          </div>
          <div className={styles.actions}>
            <Link href="/apply" className="btn btn-primary">
              Start Application
              <ArrowRight size={16} aria-hidden />
            </Link>
            <Link href="/contact" className="btn btn-outline" style={{ background: "transparent", color: "#fff", borderColor: "#fff" }}>
              Contact Us
            </Link>
          </div>
        </div>
      </div>
      <div className="divider-sm" />
    </section>
  );
}
