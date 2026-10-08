"use client";

import { FormEvent, useState } from "react";
import { Building2, Mail, MapPin, Phone, Send } from "lucide-react";
import { CONTACT } from "@/lib/site";
import { submitContactEnquiry, WebsiteApiError } from "@/lib/websiteApi";
import styles from "./ContactView.module.css";

type FormState = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

const EMPTY: FormState = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

export function ContactView() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate(values: FormState) {
    const next: Partial<FormState> = {};
    if (!values.name.trim()) next.name = "Please enter your name.";
    if (!values.email.trim()) {
      next.email = "Please enter your email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (values.phone.trim() && !/^[0-9+\-\s()]{7,20}$/.test(values.phone.trim())) {
      next.phone = "Enter a valid phone number.";
    }
    if (!values.subject.trim()) next.subject = "Please add a subject.";
    if (!values.message.trim()) next.message = "Please write a message.";
    else if (values.message.trim().length < 10) {
      next.message = "Message should be at least 10 characters.";
    }
    return next;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await submitContactEnquiry({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      setFormError(
        err instanceof WebsiteApiError
          ? err.message
          : "Could not send your message. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroInner}>
            <span className={styles.eyebrow}>Contact Us</span>
            <h1>We’re here to help with your visa journey</h1>
            <p>
              Questions about documents, application status, or travel plans — write to
              Raizing Global and the team will get back to you.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <div className={styles.layout}>
            <aside className={styles.details}>
              <h2>Reach our offices</h2>
              <p className={styles.lead}>
                Email, call, or visit. Both offices share the same inbox.
              </p>

              <a className={styles.infoCard} href={`mailto:${CONTACT.email}`}>
                <span className={styles.icon} aria-hidden>
                  <Mail size={18} />
                </span>
                <span>
                  <span className={styles.infoLabel}>Email</span>
                  <span className={styles.infoValue}>{CONTACT.email}</span>
                </span>
              </a>

              <div className={styles.infoCard}>
                <span className={styles.icon} aria-hidden>
                  <Phone size={18} />
                </span>
                <span>
                  <span className={styles.infoLabel}>Phone</span>
                  <a className={styles.infoValue} href={`tel:${CONTACT.phoneDelhi}`}>
                    Delhi {CONTACT.phoneDelhi}
                  </a>
                  <a className={styles.infoValue} href={`tel:${CONTACT.phoneDubai}`}>
                    Dubai {CONTACT.phoneDubai}
                  </a>
                </span>
              </div>

              <div className={styles.infoCard}>
                <span className={styles.icon} aria-hidden>
                  <Building2 size={18} />
                </span>
                <span>
                  <span className={styles.infoLabel}>Corporate office</span>
                  <span className={styles.infoValue}>
                    <MapPin size={14} aria-hidden /> {CONTACT.addressDelhiFull}
                  </span>
                </span>
              </div>

              <div className={styles.infoCard}>
                <span className={styles.icon} aria-hidden>
                  <MapPin size={18} />
                </span>
                <span>
                  <span className={styles.infoLabel}>Global office</span>
                  <span className={styles.infoValue}>{CONTACT.addressDubai}</span>
                </span>
              </div>
            </aside>

            <div className={styles.formCard}>
              {submitted ? (
                <div className={styles.success} role="status">
                  <h2>Thank you, {form.name.trim()}.</h2>
                  <p>
                    Your message has been sent. We will reply at{" "}
                    <strong>{form.email.trim()}</strong>.
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setForm(EMPTY);
                      setSubmitted(false);
                    }}
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <>
                  <h2>Send a message</h2>
                  <p className={styles.formIntro}>
                    Share your name, email, and a short note. We’ll use this to reply.
                  </p>
                  <form className={styles.form} onSubmit={onSubmit} noValidate>
                    <div className={styles.row}>
                      <label className={styles.field}>
                        <span className={styles.label}>Full name</span>
                        <input
                          className={styles.input}
                          type="text"
                          name="name"
                          autoComplete="name"
                          value={form.name}
                          onChange={(event) => update("name", event.target.value)}
                          placeholder="Your name"
                        />
                        {errors.name ? <span className={styles.error}>{errors.name}</span> : null}
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>Email</span>
                        <input
                          className={styles.input}
                          type="email"
                          name="email"
                          autoComplete="email"
                          value={form.email}
                          onChange={(event) => update("email", event.target.value)}
                          placeholder="you@email.com"
                        />
                        {errors.email ? (
                          <span className={styles.error}>{errors.email}</span>
                        ) : null}
                      </label>
                    </div>

                    <div className={styles.row}>
                      <label className={styles.field}>
                        <span className={styles.label}>Phone</span>
                        <input
                          className={styles.input}
                          type="tel"
                          name="phone"
                          autoComplete="tel"
                          value={form.phone}
                          onChange={(event) => update("phone", event.target.value)}
                          placeholder="+91 98765 43210"
                        />
                        {errors.phone ? (
                          <span className={styles.error}>{errors.phone}</span>
                        ) : null}
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>Subject</span>
                        <input
                          className={styles.input}
                          type="text"
                          name="subject"
                          value={form.subject}
                          onChange={(event) => update("subject", event.target.value)}
                          placeholder="Visa enquiry"
                        />
                        {errors.subject ? (
                          <span className={styles.error}>{errors.subject}</span>
                        ) : null}
                      </label>
                    </div>

                    <label className={styles.field}>
                      <span className={styles.label}>Message</span>
                      <textarea
                        className={`${styles.input} ${styles.textarea}`}
                        name="message"
                        rows={6}
                        value={form.message}
                        onChange={(event) => update("message", event.target.value)}
                        placeholder="How can we help?"
                      />
                      {errors.message ? (
                        <span className={styles.error}>{errors.message}</span>
                      ) : null}
                    </label>

                    {formError ? <p className={styles.formError}>{formError}</p> : null}

                    <button
                      type="submit"
                      className={`btn btn-primary ${styles.submit}`}
                      disabled={submitting}
                    >
                      <Send size={16} aria-hidden />
                      {submitting ? "Sending…" : "Send message"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
