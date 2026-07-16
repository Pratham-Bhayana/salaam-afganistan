"use client";

import type { FormFieldDef } from "@/types/apply";
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

type Values = Record<string, string | boolean>;

interface FormFieldsProps {
  fields: FormFieldDef[];
  values: Values;
  onChange: (key: string, value: string | boolean) => void;
  fileNames?: Record<string, string>;
  onFileChange?: (key: string, file: File | null) => void;
}

export function FormFields({
  fields,
  values,
  onChange,
  fileNames = {},
  onFileChange,
}: FormFieldsProps) {
  return (
    <div className={styles.fieldGrid}>
      {fields.map((field) => {
        const id = `field-${field.key}`;
        const value = values[field.key];

        if (field.dataType === "checkbox") {
          return (
            <label key={field.key} className={`${styles.field} ${styles.fieldFull} ${styles.checkField}`}>
              <input
                id={id}
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => onChange(field.key, e.target.checked)}
              />
              <span>
                <strong>{field.label}</strong>
                {field.required ? <span className={styles.req}> *</span> : null}
                {field.notes ? <span className={styles.fieldNote}>{field.notes}</span> : null}
              </span>
            </label>
          );
        }

        return (
          <div
            key={field.key}
            className={`${styles.field} ${
              field.dataType === "textarea" || field.dataType === "file" ? styles.fieldFull : ""
            }`}
          >
            <label htmlFor={id} className={styles.fieldLabel}>
              {field.label}
              {field.required ? <span className={styles.req}> *</span> : null}
            </label>
            {field.notes ? <p className={styles.fieldHint}>{field.notes}</p> : null}

            {field.dataType === "textarea" ? (
              <textarea
                id={id}
                className={styles.input}
                rows={3}
                value={typeof value === "string" ? value : ""}
                placeholder={field.placeholder}
                onChange={(e) => onChange(field.key, e.target.value)}
                required={field.required}
              />
            ) : field.dataType === "select" ? (
              <select
                id={id}
                className={styles.input}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                required={field.required}
              >
                <option value="">Select…</option>
                {(field.options ??
                  (field.key.toLowerCase().includes("national") ||
                  field.key.toLowerCase().includes("country") ||
                  field.key.toLowerCase().includes("residence") ||
                  field.key === "passportIssuingCountry"
                    ? COUNTRY_OPTIONS
                    : [])
                ).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.dataType === "file" ? (
              <div className={styles.fileRow}>
                <input
                  id={id}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  className={styles.fileInput}
                  onChange={(e) => onFileChange?.(field.key, e.target.files?.[0] ?? null)}
                  required={field.required && !fileNames[field.key]}
                />
                {fileNames[field.key] ? (
                  <span className={styles.fileName}>{fileNames[field.key]}</span>
                ) : null}
              </div>
            ) : (
              <input
                id={id}
                className={styles.input}
                type={field.dataType}
                value={typeof value === "string" ? value : ""}
                placeholder={field.placeholder}
                onChange={(e) => onChange(field.key, e.target.value)}
                required={field.required}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}