"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import styles from "./FloatingChat.module.css";

interface ChatMessage {
  id: string;
  role: "user" | "support";
  text: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "welcome",
    role: "support",
    text: "Hello! How can we help with your visa application today?",
  },
];

export function FloatingChat() {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const listRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

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

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text },
      {
        id: `s-${Date.now()}`,
        role: "support",
        text: "Thanks for your message. A support agent will reply here once messaging is connected.",
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
              Support Chat
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

          <div className={styles.messages} ref={listRef}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.bubble} ${
                  msg.role === "user" ? styles.bubbleUser : styles.bubbleSupport
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <form className={styles.composer} onSubmit={handleSend}>
            <input
              type="text"
              className={styles.input}
              placeholder="Type a message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Chat message"
            />
            <button type="submit" className={styles.sendBtn} aria-label="Send message">
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        className={styles.fab}
        aria-label={open ? "Close support chat" : "Open support chat"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
