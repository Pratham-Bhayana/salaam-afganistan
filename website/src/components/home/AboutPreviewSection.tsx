import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./AboutPreviewSection.module.css";

export function AboutPreviewSection() {
  return (
    <section className={styles.section}>
      <div className="divider" />
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.visualCol}>
            <div className={styles.logoWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Salaam Afghanistan logo" className={styles.logo} />
              <div className={styles.logoText}>
                <strong>Salaam Afghanistan</strong>
                <span>Rise to Excellence</span>
              </div>
            </div>

            <div className={styles.imageWrap}>
              <span className={`${styles.sparkle} ${styles.sparkleDark}`} aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1000&q=80"
                alt="Modern corporate office building placeholder for Raizing Global"
                className={styles.building}
              />
              <span className={`${styles.sparkle} ${styles.sparkleLight}`} aria-hidden />
            </div>
          </div>

          <div className={styles.contentCol}>
            <div className="section-heading">
              <span className="sub-title">Get To Know About Us</span>
              <h2>Why You Should Choose Salaam Afghanistan?</h2>
              <p>
                At Raizing Global, our expertise lies in visa facilitation and global
                mobility solutions. With years of experience simplifying immigration and
                visa processes, we guide every traveller with clarity, compliance, and
                confidence. Salaam Afghanistan is our dedicated platform for Afghanistan —
                a one-stop path for applicants who need an efficient process and a clearer
                view of their journey ahead.
              </p>
            </div>
            <Link href="/about" className="btn btn-primary" style={{ marginTop: "1.75rem" }}>
              More About Us
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
      <div className="divider" />
    </section>
  );
}
