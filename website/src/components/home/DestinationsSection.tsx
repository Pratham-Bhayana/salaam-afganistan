"use client";

import { Plane } from "lucide-react";
import { DESTINATIONS } from "@/data/home";
import styles from "./DestinationsSection.module.css";

export function DestinationsSection() {
  return (
    <section className={styles.section}>
      <div className="divider" />
      <div className="container">
        <div className={styles.headerRow}>
          <div className="section-heading">
            <span className="sub-title">Popular Destination</span>
            <h2>Premier Destinations</h2>
          </div>
        </div>

        <div className="divider-sm" />

        <div className={styles.track}>
          {DESTINATIONS.map((item) => (
            <article
              key={item.id}
              className={styles.card}
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.85) 100%), url(${item.imageSrc})`,
              }}
            >
              <span className={styles.hoverHint}>Hover to explore</span>
              <div className={styles.content}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <span className={styles.planeBtn} aria-hidden>
                <Plane size={18} />
              </span>
            </article>
          ))}
        </div>
      </div>
      <div className="divider" />
    </section>
  );
}
