import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OUR_STORY } from "@/data/home";
import styles from "./AboutPreviewSection.module.css";

export function AboutPreviewSection() {
  return (
    <section className={styles.section} id="our-story">
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
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80"
                alt="Salaam Afghanistan and Raizing Global"
                className={styles.building}
              />
              <span className={`${styles.sparkle} ${styles.sparkleLight}`} aria-hidden />
            </div>
          </div>

          <div className={styles.contentCol}>
            <div className="section-heading">
              <span className="sub-title">{OUR_STORY.subHeading}</span>
              <h2>{OUR_STORY.heading}</h2>
              {OUR_STORY.paragraphs.map((para) => (
                <p key={para.slice(0, 48)}>{para}</p>
              ))}
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
