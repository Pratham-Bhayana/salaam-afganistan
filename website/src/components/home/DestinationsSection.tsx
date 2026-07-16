import { DESTINATIONS } from "@/data/home";
import styles from "./DestinationsSection.module.css";

export function DestinationsSection() {
  return (
    <section className={styles.section} id="destinations">
      <div className="divider" />
      <div className="container">
        <div className="section-heading" style={{ marginBottom: "2rem" }}>
          <span className="sub-title">Popular Destination</span>
          <h2>Premier Destinations</h2>
        </div>

        <div className={styles.list}>
          {DESTINATIONS.map((item, index) => {
            const imageRight = index % 2 === 1;
            return (
              <article
                key={item.id}
                id={`destination-${item.id}`}
                className={`${styles.row} ${imageRight ? styles.rowReverse : ""}`}
              >
                <div className={styles.media}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageSrc}
                    alt={item.imageAlt}
                    style={{ background: "var(--color-gray-200)" }}
                  />
                </div>
                <div className={styles.copy}>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <div className="divider" />
    </section>
  );
}
