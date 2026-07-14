"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { FAQS } from "@/data/home";
import styles from "./FaqSection.module.css";

export function FaqSection() {
  const [openId, setOpenId] = useState<string>(FAQS[0]?.id ?? "");

  return (
    <section className={styles.section}>
      <div className="divider" />
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.intro}>
            <div className="section-heading">
              <span className="sub-title">Afghanistan Visa Information</span>
              <h2>Frequently Asked Questions</h2>
              <p>
                Answers to common questions about Afghanistan visa requirements,
                application steps, and travel preparedness.
              </p>
            </div>
            <Link href="/contact" className="btn btn-primary" style={{ marginTop: "1.5rem" }}>
              Ask Your Question
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>

          <div className={styles.accordion}>
            {FAQS.map((item) => {
              const open = openId === item.id;
              return (
                <div key={item.id} className={`${styles.item} ${open ? styles.itemOpen : ""}`}>
                  <button
                    type="button"
                    className={styles.question}
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? "" : item.id)}
                  >
                    <span>{item.question}</span>
                    <ChevronDown
                      size={18}
                      aria-hidden
                      style={{
                        transform: open ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s ease",
                        flexShrink: 0,
                      }}
                    />
                  </button>
                  {open ? <div className={styles.answer}>{item.answer}</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="divider" />
    </section>
  );
}
