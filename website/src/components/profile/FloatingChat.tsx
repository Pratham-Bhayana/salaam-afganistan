"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import styles from "./FloatingChat.module.css";

export interface ChatMessage {
  id: string;
  role: "user" | "support";
  text: string;
}

type Props = {
  messages?: ChatMessage[];
};

export function FloatingChat({ messages: externalMessages }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [localExtra, setLocalExtra] = useState<ChatMessage[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const messages: ChatMessage[] = [
    ...(externalMessages?.length
      ? externalMessages
      : [
          {
            id: "welcome",
            role: "support" as const,
            text: "Hello! Updates from our team about your application will appear here.",
          },
        ]),
    ...localExtra,
  ];

  useEffect(() => {
    if (!open) return;
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [open, messages]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setLocalExtra((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text },
      {
        id: `s-${Date.now()}`,
        role: "support",
        text: "Thanks — your note is saved locally for now. Watch Notifications for official replies from our team.",
      },
    ]);
    setInput("");
  }

  return (
    <div className={styles.root}>
      {open ? (
        <div
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <header className={styles.panelHeader}>
            <h2 id={titleId} className={styles.panelTitle}>
              Application updates
            </h2>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </header>

          <div className={styles.list} ref={listRef}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`${styles.bubble} ${
                  m.role === "user" ? styles.bubbleUser : styles.bubbleSupport
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          <form className={styles.composer} onSubmit={handleSend}>
            <input
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write a note…"
              aria-label="Message"
            />
            <button type="submit" className={styles.sendBtn} aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          className={styles.fab}
          aria-label="Open application updates"
          onClick={() => setOpen(true)}
        >
          <MessageCircle size={22} />
        </button>
      )}
    </div>
  );
}
