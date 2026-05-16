/**
 * Motion design tokens for wa'kijo
 *
 * Unified motion language drawing from:
 *  - Material 3 Expressive (spring physics, motion schemes)
 *  - Apple HIG (clarity, deference, subtle easing)
 *
 * Usage:
 *   import { spring, bouncySpring, subtleEase, fadeInUp } from '@/lib/motion'
 *   <motion.div transition={spring} />
 */

import type { Transition, Variants } from 'framer-motion';

// ─── Spring Presets (M3 Expressive) ──────────────────────────────────────────

/** Standard spring — functional interactions, list items, menus */
export const spring: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 30,
  mass: 1,
};

/** Expressive spring — hero moments, FABs, active indicators */
export const bouncySpring: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 20,
  mass: 0.8,
};

/** Snappy spring — instant-feeling micro-interactions */
export const snappySpring: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
  mass: 0.8,
};

// ─── Easing Curves (Apple HIG) ───────────────────────────────────────────────

/** Subtle ease — sidebar transitions, card hovers */
export const subtleEase: Transition = {
  duration: 0.22,
  ease: [0.25, 0.46, 0.45, 0.94],
};

/** Smooth ease — page transitions, modal entrances */
export const smoothEase: Transition = {
  duration: 0.35,
  ease: [0.16, 1, 0.3, 1],
};

/** Quick ease — tooltips, badges */
export const quickEase: Transition = {
  duration: 0.15,
  ease: [0.4, 0, 0.2, 1],
};

// ─── Animation Variants ───────────────────────────────────────────────────────

/** Fade in from bottom — page sections, cards */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: spring,
  },
  exit: { opacity: 0, y: -8, transition: quickEase },
};

/** Fade in — overlays, tooltips */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: smoothEase },
  exit: { opacity: 0, transition: quickEase },
};

/** Scale in — modals, dropdowns */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: spring },
  exit: { opacity: 0, scale: 0.97, transition: quickEase },
};

/** Slide in from left — sidebar, drawers */
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: spring },
  exit: { opacity: 0, x: -16, transition: quickEase },
};

/** Stagger container — orchestrates children */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

/** Stagger item — child of staggerContainer */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: spring,
  },
};

// ─── Duration Constants ───────────────────────────────────────────────────────

export const duration = {
  instant: 0.1,
  quick: 0.15,
  standard: 0.22,
  smooth: 0.35,
  slow: 0.5,
} as const;
