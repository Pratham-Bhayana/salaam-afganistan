import styles from "./AboutHero.module.css";

export function AboutHero() {
  return (
    <section className={styles.hero}>
      <div className="container">
        <div className={styles.inner}>
          <span className={styles.eyebrow}>About Us</span>
          <h1>Building Trusted Paths to Afghanistan</h1>
          <p>
            Salaam Afghanistan is Raizing Global’s dedicated visa and mobility platform —
            designed for clarity, compliance, and confidence at every step.
          </p>
        </div>
      </div>
    </section>
  );
}
