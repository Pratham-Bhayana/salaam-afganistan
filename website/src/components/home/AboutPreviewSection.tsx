import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OUR_STORY } from "@/data/ourStory";
import styles from "./AboutPreviewSection.module.css";

export function AboutPreviewSection() {
  const { heading, subHeading, paragraphs } = OUR_STORY;

  return (
    <section className={styles.section} id="our-story">
      <div className="divider" />
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.visualCol}>
            <div className={styles.logoWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/raizing-logo.png" alt="Raizing Global logo" className={styles.logo} />
            </div>

            <div className={styles.imageWrap}>
              <span className={`${styles.sparkle} ${styles.sparkleDark}`} aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/office.jpg"
                alt="Salaam Afghanistan office"
                className={styles.building}
              />
              <span className={`${styles.sparkle} ${styles.sparkleLight}`} aria-hidden />
            </div>
          </div>

          <div className={styles.contentCol}>
            <div className="section-heading">
              <span className="sub-title">{subHeading}</span>
              <h2>{heading}</h2>
              {paragraphs.map((para) => (
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
