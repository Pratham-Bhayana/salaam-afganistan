"use client";

import { useState } from "react";
import {
  Award,
  BookOpen,
  CalendarDays,
  ChartLine,
  ChevronDown,
  Landmark,
  Star,
  Trophy,
} from "lucide-react";
import { LEADERSHIP_METRICS } from "@/data/home";
import type { LeadershipMetric } from "@/types/home";
import styles from "./LeadershipSection.module.css";

function MetricIcon({ icon }: { icon: LeadershipMetric["icon"] }) {
  const props = { size: 20, "aria-hidden": true as const };
  if (icon === "calendar") return <CalendarDays {...props} />;
  if (icon === "award") return <Award {...props} />;
  if (icon === "chart") return <ChartLine {...props} />;
  return <Trophy {...props} />;
}

export function LeadershipSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.content}>
            <span className={styles.badge}>
              <Landmark size={14} aria-hidden />
              Visa Platform Leadership
            </span>
            <h2 className={styles.title}>
              Salaam Afghanistan
              <span> Guided Mobility for a New Horizon</span>
            </h2>
            <p className={styles.subtitle}>
              Digital visa facilitation · Clarity, compliance & confidence
            </p>

            <div className={styles.metrics}>
              {LEADERSHIP_METRICS.map((item) => (
                <div key={item.label} className={styles.metricCard}>
                  <div className={styles.metricIcon}>
                    <MetricIcon icon={item.icon} />
                  </div>
                  <strong>{item.value}</strong>
                  <small>{item.label}</small>
                </div>
              ))}
            </div>

            <p className={styles.description}>
              Salaam Afghanistan brings Raizing Global’s visa expertise into a dedicated
              platform for travellers, businesses, and families. We combine secure
              document workflows with clear guidance so every application moves forward
              with confidence.
            </p>

            <button
              type="button"
              className={`btn btn-outline ${styles.readMore}`}
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              <BookOpen size={16} aria-hidden />
              {expanded ? "Hide Details" : "Read More About Our Platform"}
              <ChevronDown
                size={16}
                aria-hidden
                style={{
                  transform: expanded ? "rotate(180deg)" : "none",
                  transition: "transform 0.25s ease",
                }}
              />
            </button>

            {expanded ? (
              <div className={styles.details}>
                <div className={styles.detailCard}>
                  <h4>Secure Online Filing</h4>
                  <p>
                    Submit applications digitally with structured forms, document uploads,
                    and status tracking designed for applicants and families.
                  </p>
                </div>
                <div className={styles.detailCard}>
                  <h4>Compliance-First Guidance</h4>
                  <p>
                    Clear checklists and category-specific requirements help reduce
                    incomplete submissions and costly delays.
                  </p>
                </div>
                <div className={styles.detailCard}>
                  <h4>End-to-End Support</h4>
                  <p>
                    From first form to payment, Salaam Afghanistan keeps applicants
                    informed at every step of the process.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className={styles.visual}>
            <div className={styles.decor1} aria-hidden />
            <div className={styles.decor2} aria-hidden />
            <div className={styles.decor3} aria-hidden />
            <div className={styles.imageFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200&q=80"
                alt="Modern diplomatic and travel services environment placeholder"
              />
              <div className={styles.floatingBadge}>
                <Star size={16} aria-hidden />
                <div>
                  <strong>Trusted Process</strong>
                  <small>Visa facilitation by Raizing Global</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
