import {
  Building2,
  ChartLine,
  Check,
  Globe2,
} from "lucide-react";
import { COUNTRY_INFO_CARDS, COUNTRY_STATS } from "@/data/home";
import type { InfoCardItem } from "@/types/home";
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
          <div className="section-heading" style={{ alignItems: "center", textAlign: "center" }}>
            <span className="sub-title">Discover Afghanistan</span>
            <h2>Afghanistan: A Land of Opportunities</h2>
            <p style={{ margin: "0.75rem auto 0" }}>
              Explore thriving corridors, rich culture, and pathways for travel, business,
              and connection.
            </p>
          </div>
        </div>

        <div className={styles.cards}>
          {COUNTRY_INFO_CARDS.map((card) => (
            <article key={card.id} className={styles.card}>
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
          ))}
        </div>

        <div className={styles.statsBar}>
          {COUNTRY_STATS.map((stat) => (
            <div key={stat.label} className={styles.statItem}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="divider-sm" />
    </section>
  );
}
