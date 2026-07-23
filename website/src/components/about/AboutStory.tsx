import {
  CheckCircle2,
  Compass,
  ShieldCheck,
  Users,
} from "lucide-react";
import styles from "./AboutStory.module.css";

const VALUES = [
  {
    title: "Clarity First",
    text: "Plain-language requirements and structured forms so applicants always know what comes next.",
    icon: Compass,
  },
  {
    title: "Compliance Ready",
    text: "Document checklists and category rules aligned to consular processes and platform configuration.",
    icon: ShieldCheck,
  },
  {
    title: "Human Support",
    text: "Guidance from a team experienced in global mobility — not a faceless form dump.",
    icon: Users,
  },
] as const;

export function AboutStory() {
  return (
    <section className={styles.section}>
      <div className="divider" />
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.visual}>
            <div className={styles.logoCard}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/moic.png" alt="Salaam Afghanistan logo" />
              <div>
                <strong>RAIZING GLOBAL</strong>
                <span>Rise to Excellence</span>
              </div>
            </div>
            <div className={styles.imageWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1100&q=80"
                alt="Professional workspace representing Raizing Global services"
              />
            </div>
          </div>

          <div>
            <div className="section-heading">
              <span className="sub-title">Get To Know About Us</span>
              <h2>Why You Should Choose Raizing Global?</h2>
              <p>
                At Raizing Global, our expertise lies in visa facilitation and global
                mobility solutions. With years of experience simplifying immigration and
                visa processes, we ensure every traveller is guided with clarity,
                compliance, and confidence. Salaam Afghanistan is our dedicated platform
                for Afghanistan — built as a one-stop solution for applicants who want an
                efficient process and a confident start to their journey.
              </p>
            </div>

            <ul className={styles.checklist}>
              <li>
                <CheckCircle2 size={18} aria-hidden />
                End-to-end digital application workflow
              </li>
              <li>
                <CheckCircle2 size={18} aria-hidden />
                Secure document upload and tracking
              </li>
              <li>
                <CheckCircle2 size={18} aria-hidden />
                Category-aware requirements and fees
              </li>
              <li>
                <CheckCircle2 size={18} aria-hidden />
                Backed by Raizing Global’s mobility experience
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.values}>
          {VALUES.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className={styles.valueCard}>
                <div className={styles.valueIcon}>
                  <Icon size={22} aria-hidden />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </div>
      <div className="divider" />
    </section>
  );
}
