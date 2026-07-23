"use client";

import type { PassportOcrFields } from "@/lib/passportOcr";
import { APPLYING_FROM_OPTIONS } from "@/data/home";
import styles from "./ApplyFlow.module.css";

const COUNTRY_OPTIONS = [
  ...APPLYING_FROM_OPTIONS,
  { value: "afghanistan", label: "Afghanistan" },
  { value: "pakistan", label: "Pakistan" },
  { value: "iran", label: "Iran" },
  { value: "uae", label: "United Arab Emirates" },
  { value: "russia", label: "Russia" },
  { value: "turkey", label: "Turkey" },
  { value: "saudi-arabia", label: "Saudi Arabia" },
];

type Props = {
  fields: PassportOcrFields;
  warnings: string[];
  confidence: "high" | "medium" | "low";
  scanning: boolean;
  /** When false, fields stay locked until OCR succeeds or manual fallback unlocks them. */
  allowManualEdit?: boolean;
  onChange: (key: keyof PassportOcrFields, value: string) => void;
  onRescan: () => void;
};

export function PassportOcrPreview({
  fields,
  warnings,
  confidence,
  scanning,
  allowManualEdit = true,
  onChange,
  onRescan,
}: Props) {
  const fieldsDisabled = scanning || !allowManualEdit;

  return (
    <div className={styles.ocrPreview}>
      <div className={styles.ocrPreviewHead}>
        <div>
          <h3>Review extracted passport details</h3>
          <p>
            Check and edit anything that looks wrong. Next fills Personal Info from this preview.
            Address, email, and phone are entered on the next step (not printed on most passports).
          </p>
        </div>
        <span className={`${styles.ocrBadge} ${styles[`ocrBadge_${confidence}`]}`}>
          {scanning ? "Scanning…" : `${confidence} confidence`}
        </span>
      </div>

      {scanning ? (
        <div className={styles.ocrScanning} role="status">
          Reading passport MRZ with OCR — this can take a few seconds…
        </div>
      ) : null}

      {warnings.length ? (
        <ul className={styles.ocrWarnings}>
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}

      <div className={styles.ocrFieldGrid}>
        <label className={styles.ocrField}>
          <span>Full name</span>
          <input
            type="text"
            className={styles.input}
            value={fields.fullName}
            disabled={fieldsDisabled}
            onChange={(e) => onChange("fullName", e.target.value)}
          />
        </label>

        <label className={styles.ocrField}>
          <span>Passport number</span>
          <input
            type="text"
            className={styles.input}
            value={fields.passportNumber}
            disabled={fieldsDisabled}
            onChange={(e) => onChange("passportNumber", e.target.value)}
          />
        </label>

        <label className={styles.ocrField}>
          <span>Nationality</span>
          <select
            className={styles.input}
            value={fields.nationality}
            disabled={fieldsDisabled}
            onChange={(e) => onChange("nationality", e.target.value)}
          >
            <option value="">Select…</option>
            {COUNTRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.ocrField}>
          <span>Issuing country</span>
          <select
            className={styles.input}
            value={fields.passportIssuingCountry}
            disabled={fieldsDisabled}
            onChange={(e) => onChange("passportIssuingCountry", e.target.value)}
          >
            <option value="">Select…</option>
            {COUNTRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.ocrField}>
          <span>Date of birth</span>
          <input
            type="date"
            className={styles.input}
            value={fields.dateOfBirth}
            disabled={fieldsDisabled}
            onChange={(e) => onChange("dateOfBirth", e.target.value)}
          />
        </label>

        <label className={styles.ocrField}>
          <span>Issue date</span>
          <input
            type="date"
            className={styles.input}
            value={fields.passportIssueDate}
            disabled={fieldsDisabled}
            onChange={(e) => onChange("passportIssueDate", e.target.value)}
          />
        </label>

        <label className={styles.ocrField}>
          <span>Expiry date</span>
          <input
            type="date"
            className={styles.input}
            value={fields.passportExpiryDate}
            disabled={fieldsDisabled}
            onChange={(e) => onChange("passportExpiryDate", e.target.value)}
          />
        </label>

        <label className={styles.ocrField}>
          <span>Gender</span>
          <select
            className={styles.input}
            value={fields.sex}
            disabled={fieldsDisabled}
            onChange={(e) => onChange("sex", e.target.value)}
          >
            <option value="">Select…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className={`${styles.ocrField} ${styles.ocrFieldFull}`}>
          <span>Place of birth (if shown)</span>
          <input
            type="text"
            className={styles.input}
            value={fields.placeOfBirth}
            disabled={fieldsDisabled}
            onChange={(e) => onChange("placeOfBirth", e.target.value)}
          />
        </label>
      </div>

      {fields.rawMrz.length ? (
        <details className={styles.ocrMrz}>
          <summary>Raw MRZ lines</summary>
          <pre>{fields.rawMrz.join("\n")}</pre>
        </details>
      ) : null}

      <button type="button" className={styles.ocrRescan} onClick={onRescan} disabled={scanning}>
        Re-scan passport bio page
      </button>
    </div>
  );
}
