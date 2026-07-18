"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, X } from "lucide-react";
import { APPLYING_FROM_OPTIONS } from "@/data/home";
import { checkEvisaEligibility, type EligibilityResult } from "@/data/apply";
import styles from "./EligibilityModal.module.css";

/** Country coverage for the eligibility check (base list + blocked nationalities/residences). */
const COUNTRY_OPTIONS = [
  ...APPLYING_FROM_OPTIONS,
  { value: "afghanistan", label: "Afghanistan" },
  { value: "pakistan", label: "Pakistan" },
  { value: "iran", label: "Iran" },
  { value: "uae", label: "United Arab Emirates" },
  { value: "russia", label: "Russia" },
  { value: "turkey", label: "Turkey" },
  { value: "saudi-arabia", label: "Saudi Arabia" },
  { value: "tajikistan", label: "Tajikistan" },
  { value: "uzbekistan", label: "Uzbekistan" },
  { value: "turkmenistan", label: "Turkmenistan" },
  { value: "kazakhstan", label: "Kazakhstan" },
  { value: "israel", label: "Israel" },
  { value: "azerbaijan", label: "Azerbaijan" },
  { value: "indonesia", label: "Indonesia" },
  { value: "kyrgyzstan", label: "Kyrgyzstan" },
  { value: "malaysia", label: "Malaysia" },
  { value: "oman", label: "Oman" },
  { value: "qatar", label: "Qatar" },
].sort((a, b) => a.label.localeCompare(b.label));

interface EligibilityModalProps {
  open: boolean;
  onClose: () => void;
}

export function EligibilityModal({ open, onClose }: EligibilityModalProps) {
  const router = useRouter();
  const [nationality, setNationality] = useState("");
  const [residence, setResidence] = useState("");
  const [result, setResult] = useState<EligibilityResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setNationality("");
    setResidence("");
    setResult(null);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function check() {
    if (!nationality || !residence) return;
    setResult(checkEvisaEligibility(nationality, residence));
  }

  function goApply(query = "") {
    onClose();
    router.push(`/apply${query}`);
  }

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="eligibility-modal-title"
      onClick={onClose}
    >
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <X size={18} aria-hidden />
        </button>

        {!result ? (
          <>
            <h2 id="eligibility-modal-title" className={styles.title}>
              eVisa Eligibility Check
            </h2>
            <p className={styles.subtitle}>
              Confirm your nationality and country of residence to see if you can apply online.
            </p>

            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="elig-nationality" className={styles.label}>
                  Nationality<span className={styles.req}> *</span>
                </label>
                <select
                  id="elig-nationality"
                  className={styles.input}
                  value={nationality}
                  onChange={(e) => {
                    setNationality(e.target.value);
                    setResult(null);
                  }}
                >
                  <option value="">Select…</option>
                  {COUNTRY_OPTIONS.map((opt) => (
                    <option key={`nat-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="elig-residence" className={styles.label}>
                  Country of residence<span className={styles.req}> *</span>
                </label>
                <select
                  id="elig-residence"
                  className={styles.input}
                  value={residence}
                  onChange={(e) => {
                    setResidence(e.target.value);
                    setResult(null);
                  }}
                >
                  <option value="">Select…</option>
                  {COUNTRY_OPTIONS.map((opt) => (
                    <option key={`res-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className="btn btn-primary btn-full"
                onClick={check}
                disabled={!nationality || !residence}
              >
                Check Eligibility
              </button>
            </div>
          </>
        ) : result.eligible ? (
          <div className={styles.result}>
            <div className={styles.resultIcon}>
              <Check size={28} aria-hidden />
            </div>
            <h3 id="eligibility-modal-title">You&apos;re eligible for eVisa!</h3>
            <p>You can continue with your online tourist eVisa application.</p>
            <button
              type="button"
              className="btn btn-primary btn-full"
              onClick={() => goApply()}
            >
              Continue to application
              <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        ) : result.reason === "hard_refuse" ? (
          <div className={styles.result}>
            <div className={`${styles.resultIcon} ${styles.resultIconWarn}`}>
              <AlertTriangle size={28} aria-hidden />
            </div>
            <h3 id="eligibility-modal-title">
              Unfortunately, visa applications are not available for your nationality.
            </h3>
            <button type="button" className="btn btn-outline btn-full" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <div className={styles.result}>
            <div className={`${styles.resultIcon} ${styles.resultIconWarn}`}>
              <AlertTriangle size={28} aria-hidden />
            </div>
            <h3 id="eligibility-modal-title">
              You&apos;re not eligible for eVisa based on your{" "}
              {result.reason === "blocked_nationality" ? "nationality" : "country of residence"}.
            </h3>
            <p>You can still apply through an Embassy instead.</p>
            <button
              type="button"
              className="btn btn-primary btn-full"
              onClick={() => goApply("?channel=embassy")}
            >
              Apply via Embassy
              <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
