import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  FileCheck2,
  FileText,
  Files,
  Upload,
} from "lucide-react";
import { PROCESS_STEPS } from "@/data/home";
import type { ProcessStep } from "@/types/home";
import styles from "./ProcessSection.module.css";

function StepIcon({ icon }: { icon: ProcessStep["icon"] }) {
  const props = { size: 26, "aria-hidden": true as const };
  if (icon === "details") return <FileText {...props} />;
  if (icon === "passport") return <Upload {...props} />;
  if (icon === "submit") return <FileCheck2 {...props} />;
  if (icon === "documents") return <Files {...props} />;
  return <CreditCard {...props} />;
}

export function ProcessSection() {
  return (
    <section className={styles.section}>
      <div className="divider" />
      <div className="container">
        <div className={styles.heading}>
          <h2>How does Salaam Afghanistan work?</h2>
          <p className={styles.sub}>Visa Application Steps</p>
        </div>

        <div className={styles.steps}>
          {PROCESS_STEPS.map((step, index) => (
            <div key={step.id} className={styles.step}>
              <div className={styles.iconWrap}>
                <StepIcon icon={step.icon} />
              </div>
              <h3>{step.title}</h3>
              {index < PROCESS_STEPS.length - 1 ? (
                <span className={styles.arrow} aria-hidden>
                  →
                </span>
              ) : null}
            </div>
          ))}
        </div>

        <div className={styles.ctaWrap}>
          <Link href="/apply" className={`btn btn-primary ${styles.cta}`}>
            Start Your Application
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
      <div className="divider" />
    </section>
  );
}
