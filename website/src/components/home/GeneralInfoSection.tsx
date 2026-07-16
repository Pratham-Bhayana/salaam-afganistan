import Link from "next/link";
import { Check, ExternalLink, FileText } from "lucide-react";
import { GENERAL_INFO } from "@/data/home";
import styles from "./GeneralInfoSection.module.css";

export function GeneralInfoSection() {
  return (
    <section className={styles.section} id="general-info">
      <div className="divider-sm" />
      <div className="container">
        <div className="section-heading" style={{ marginBottom: "2rem", textAlign: "center", alignItems: "center" }}>
          <span className="sub-title">Visa Overview</span>
          <h2>General Information</h2>
        </div>

        <div className={styles.entryBar}>
          <FileText size={20} aria-hidden />
          <div>
            <strong>Entry Types</strong>
            <span>{GENERAL_INFO.entryTypes}</span>
          </div>
        </div>

        <div className={styles.grid}>
          <article className={styles.panel}>
            <h3>Visa Types</h3>
            <ul className={styles.visaList}>
              {GENERAL_INFO.visaTypes.map((type) => (
                <li key={type}>
                  <Check size={16} aria-hidden />
                  <span>{type}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className={styles.panel}>
            <h3>Documents Required</h3>
            <div className={styles.docGroups}>
              {GENERAL_INFO.documents.map((doc) => (
                <div key={doc.title} className={styles.docGroup}>
                  <h4>{doc.title}</h4>
                  <ul>
                    {doc.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className={styles.links}>
          {GENERAL_INFO.externalLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn btn-outline ${styles.linkBtn}`}
            >
              {link.label}
              <ExternalLink size={16} aria-hidden />
            </a>
          ))}
          <Link href="/apply" className={`btn btn-primary ${styles.linkBtn}`}>
            Apply Now
          </Link>
        </div>
      </div>
      <div className="divider" />
    </section>
  );
}
