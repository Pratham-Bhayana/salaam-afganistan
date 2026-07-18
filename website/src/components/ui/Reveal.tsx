"use client";

import { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

export type RevealPreset =
  | "fade"
  | "up"
  | "down"
  | "left"
  | "right"
  | "blur"
  | "skew"
  | "zoom";

interface RevealProps {
  children: ReactNode;
  /** Animation style. Defaults to a blurred slide-up. */
  preset?: RevealPreset;
  /** Extra delay before the animation starts (seconds). */
  delay?: number;
  /** Animation duration (seconds). */
  duration?: number;
  /** Stagger child <Reveal> / motion children by this amount (seconds). */
  stagger?: number;
  /** Replay every time it enters the viewport instead of only once. */
  repeat?: boolean;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "li" | "span";
}

// A weighted, "expensive" ease — fast pickup, long buttery settle.
const EASE = [0.22, 1, 0.36, 1] as const;

function buildVariants(
  preset: RevealPreset,
  duration: number,
  delay: number,
  stagger: number,
): Variants {
  const hiddenByPreset: Record<RevealPreset, Record<string, number | string>> = {
    fade: { opacity: 0 },
    up: { opacity: 0, y: 60 },
    down: { opacity: 0, y: -60 },
    left: { opacity: 0, x: -70 },
    right: { opacity: 0, x: 70 },
    blur: { opacity: 0, y: 40, filter: "blur(14px)" },
    skew: { opacity: 0, y: 50, skewY: 6 },
    zoom: { opacity: 0, scale: 0.92 },
  };

  return {
    hidden: hiddenByPreset[preset],
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      skewY: 0,
      filter: "blur(0px)",
      transition: {
        duration,
        delay,
        ease: EASE,
        when: "beforeChildren",
        staggerChildren: stagger,
      },
    },
  };
}

/**
 * Scroll-triggered reveal wrapper. Wrap any section to have it glide into view
 * with a blur / slide / fade / skew effect as it enters the viewport.
 */
export function Reveal({
  children,
  preset = "blur",
  delay = 0,
  duration = 0.8,
  stagger = 0,
  repeat = false,
  className,
  style,
  as = "div",
}: RevealProps) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as];

  if (reduceMotion) {
    const Tag = as;
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }

  return (
    <MotionTag
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: !repeat, amount: 0.2, margin: "0px 0px -10% 0px" }}
      variants={buildVariants(preset, duration, delay, stagger)}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Child item to place inside a <Reveal stagger={...}> so grids/lists cascade
 * in one after another. Inherits the parent's staggered timing.
 */
export function RevealItem({
  children,
  preset = "up",
  className,
  as = "div",
}: {
  children: ReactNode;
  preset?: RevealPreset;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as];

  if (reduceMotion) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const hiddenByPreset: Record<RevealPreset, Record<string, number | string>> = {
    fade: { opacity: 0 },
    up: { opacity: 0, y: 40 },
    down: { opacity: 0, y: -40 },
    left: { opacity: 0, x: -50 },
    right: { opacity: 0, x: 50 },
    blur: { opacity: 0, y: 30, filter: "blur(10px)" },
    skew: { opacity: 0, y: 40, skewY: 5 },
    zoom: { opacity: 0, scale: 0.9 },
  };

  const variants: Variants = {
    hidden: hiddenByPreset[preset],
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      skewY: 0,
      filter: "blur(0px)",
      transition: { duration: 0.7, ease: EASE },
    },
  };

  return (
    <MotionTag className={className} variants={variants}>
      {children}
    </MotionTag>
  );
}
