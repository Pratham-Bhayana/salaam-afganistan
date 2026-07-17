"use client";

import { useId, useRef } from "react";
import { Check, FileUp, Trash2, Upload } from "lucide-react";
import { requirementLabel } from "@/data/apply";
import type { DocumentItem } from "@/types/apply";
import styles from "./DocumentUploadGrid.module.css";

export type DocUploadItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "done" | "error";
};

type Props = {
  documents: DocumentItem[];
  uploads: Record<string, DocUploadItem[]>;
  onAdd: (docKey: string, files: File[]) => void;
  onRemove: (docKey: string, itemId: string) => void;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocCard({
  doc,
  items,
  onAdd,
  onRemove,
}: {
  doc: DocumentItem;
  items: DocUploadItem[];
  onAdd: (files: File[]) => void;
  onRemove: (itemId: string) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const required = doc.required === "required";
  const doneCount = items.filter((i) => i.status === "done").length;
  const hasFiles = items.length > 0;
  const complete = doneCount > 0;

  function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    onAdd(Array.from(list));
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <article
      className={`${styles.card} ${hasFiles ? styles.cardFilled : ""} ${complete ? styles.cardDone : ""}`}
    >
      <header className={styles.cardHead}>
        <div className={styles.cardIcon} aria-hidden>
          {complete ? <Check size={18} strokeWidth={2.25} /> : <FileUp size={18} strokeWidth={2} />}
        </div>
        <div className={styles.cardTitles}>
          <h3>
            {doc.label}
            {required ? <span className={styles.req}> *</span> : null}
          </h3>
          <p>
            <span className={`${styles.badge} ${styles[`badge_${doc.required}`] ?? ""}`}>
              {requirementLabel(doc.required)}
            </span>
            {doneCount > 0 ? (
              <span className={styles.count}>
                {doneCount} file{doneCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </p>
        </div>
      </header>

      <label htmlFor={inputId} className={styles.dropzone}>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf,application/pdf"
          className={styles.hiddenInput}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Upload size={20} strokeWidth={1.75} aria-hidden />
        <span className={styles.dropTitle}>
          {hasFiles ? "Add more files" : "Drop files or browse"}
        </span>
        <span className={styles.dropHint}>PDF, JPG, PNG · multiple allowed</span>
      </label>

      {items.length > 0 ? (
        <ul className={styles.fileList}>
          {items.map((item) => (
            <li key={item.id} className={styles.fileItem}>
              <div className={styles.fileMeta}>
                <span className={styles.fileName} title={item.name}>
                  {item.name}
                </span>
                <span className={styles.fileSize}>{formatSize(item.size)}</span>
              </div>
              <div className={styles.progressTrack} aria-hidden>
                <div
                  className={`${styles.progressFill} ${
                    item.status === "done" ? styles.progressDone : ""
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <div className={styles.fileActions}>
                <span className={styles.fileStatus}>
                  {item.status === "uploading"
                    ? `${item.progress}%`
                    : item.status === "done"
                      ? "Ready"
                      : "Failed"}
                </span>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function DocumentUploadGrid({ documents, uploads, onAdd, onRemove }: Props) {
  return (
    <div className={styles.grid}>
      {documents.map((doc, index) => (
        <div
          key={doc.key}
          className={styles.cardWrap}
          style={{ animationDelay: `${index * 45}ms` }}
        >
          <DocCard
            doc={doc}
            items={uploads[doc.key] ?? []}
            onAdd={(files) => onAdd(doc.key, files)}
            onRemove={(itemId) => onRemove(doc.key, itemId)}
          />
        </div>
      ))}
    </div>
  );
}
