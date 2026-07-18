"use client";

import {
  Building2,
  ChartLine,
  Check,
  Globe2,
} from "lucide-react";
import { COUNTRY_INFO_CARDS, COUNTRY_STATS } from "@/data/home";
import type { InfoCardItem } from "@/types/home";
import { Reveal, RevealItem } from "@/components/ui/Reveal";
import styles from "./OpportunitiesSection.module.css";

function CardIcon({ icon }: { icon: InfoCardItem["icon"] }) {
  const props = { size: 28, "aria-hidden": true as const };
  if (icon === "industry") return <Building2 {...props} />;
  if (icon === "economy") return <ChartLine {...props} />;
  return <Globe2 {...props} />;
}

export function OpportunitiesSection() {
  return (
    <section className={styles.section}>
      <div className="divider-sm" />
      <div className="container">
        <div className={styles.headingWrap}>
          <Reveal preset="up" className="section-heading" style={{ alignItems: "center", textAlign: "center" }}>
            <span className="sub-title">Discover Afghanistan</span>
            <h2>Industries, Economy & Culture</h2>
            <p style={{ margin: "0.75rem auto 0", maxWidth: "38rem", color: "var(--color-gray-600)" }}>
              Key industries, economic highlights, and culture that define Afghanistan today.
            </p>
          </Reveal>
        </div>

        <Reveal preset="fade" stagger={0.15} className={styles.cards}>
          {COUNTRY_INFO_CARDS.map((card) => (
            <RevealItem as="div" preset="blur" key={card.id}>
              <article className={styles.card}>
                <div className={styles.iconCircle}>
                  <CardIcon icon={card.icon} />
                </div>
                <h3>{card.title}</h3>
                <ul>
                  {card.items.map((item) => (
                    <li key={item}>
                      <Check size={16} aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </RevealItem>
          ))}
        </Reveal>

        <Reveal preset="skew" stagger={0.12} className={styles.statsBar}>
          {COUNTRY_STATS.map((stat) => (
            <RevealItem as="div" preset="up" key={stat.label} className={styles.statItem}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </RevealItem>
          ))}
        </Reveal>
      </div>
      <div className="divider-sm" />
    </section>
  );
}
