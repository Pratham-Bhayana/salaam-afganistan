"use client";

import { FormEvent, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { APPLYING_FROM_OPTIONS, HERO_SLIDES } from "@/data/home";
import styles from "./HeroSection.module.css";

export function HeroSection() {
  const [slideIndex, setSlideIndex] = useState(0);
  const [applyingFrom, setApplyingFrom] = useState(APPLYING_FROM_OPTIONS[0]?.value ?? "");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);

  function goPrev() {
    setSlideIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }

  function goNext() {
    setSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.href = `/apply?from=${encodeURIComponent(applyingFrom)}`;
  }

  const slide = HERO_SLIDES[slideIndex];

  return (
    <section className={styles.hero}>
      <div className={styles.grid}>
        <div className={styles.formSide}>
          <div className={styles.formCard}>
            <h1 className={styles.formTitle}>Apply for Afghanistan Visa</h1>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.label} htmlFor="applying-from">
                Applying From
              </label>
              <select
                id="applying-from"
                className={styles.select}
                value={applyingFrom}
                onChange={(e) => setApplyingFrom(e.target.value)}
              >
                {APPLYING_FROM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <label className={styles.label} htmlFor="applying-for">
                Applying For
              </label>
              <input
                id="applying-for"
                className={`${styles.select} ${styles.disabledInput}`}
                value="Afghanistan"
                disabled
                readOnly
              />

              <button type="submit" className={`btn btn-primary btn-full ${styles.applyBtn}`}>
                Apply Now
              </button>
            </form>
          </div>
        </div>

        <div className={styles.slideSide}>
          {HERO_SLIDES.map((item, index) => (
            <div
              key={item.id}
              className={`${styles.slide} ${index === slideIndex ? styles.slideActive : ""}`}
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.72) 100%), url(${item.imageSrc})`,
              }}
              role="img"
              aria-label={item.imageAlt}
              aria-hidden={index !== slideIndex}
            />
          ))}

          {slide ? (
            <div className={styles.slideContent}>
              <h2>{slide.title}</h2>
              <p>{slide.description}</p>
            </div>
          ) : null}

          <button type="button" className={`${styles.navBtn} ${styles.prev}`} onClick={goPrev} aria-label="Previous slide">
            <ChevronLeft size={20} />
          </button>
          <button type="button" className={`${styles.navBtn} ${styles.next}`} onClick={goNext} aria-label="Next slide">
            <ChevronRight size={20} />
          </button>

          <div className={styles.dots} role="tablist" aria-label="Hero slides">
            {HERO_SLIDES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={index === slideIndex}
                className={`${styles.dot} ${index === slideIndex ? styles.dotActive : ""}`}
                onClick={() => setSlideIndex(index)}
                aria-label={`Show slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}