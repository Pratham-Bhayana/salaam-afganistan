import { LEADER } from "@/data/home";
import styles from "./LeadershipSection.module.css";

export function LeadershipSection() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.visual}>
            <div className={styles.imageFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LEADER.imageSrc}
                alt={LEADER.imageAlt}
                style={{ background: "var(--color-gray-200)" }}
              />
            </div>

            {LEADER.messageTitle && LEADER.messageBody ? (
              <aside className={styles.message} aria-label={LEADER.messageTitle}>
                <h3 className={styles.messageTitle}>{LEADER.messageTitle}</h3>
                <p className={styles.messageBody}>{LEADER.messageBody}</p>
              </aside>
            ) : null}
          </div>

          <div className={styles.content}>
            <span className={styles.badge}>Leadership</span>
            <h2 className={styles.title}>{LEADER.name}</h2>
            <p className={styles.role}>{LEADER.title}</p>

            {LEADER.bio.map((para) => (
              <p key={para.slice(0, 40)} className={styles.bio}>
                {para}
              </p>
            ))}

            <dl className={styles.infoTable}>
              {LEADER.infoRows.map((row) => (
                <div key={row.label} className={styles.infoRow}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
