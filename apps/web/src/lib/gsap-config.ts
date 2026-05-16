/**
 * GSAP configuration — single registration point.
 *
 * Import `gsap` and plugins from this file, NOT directly from 'gsap'.
 * This prevents duplicate plugin registration and ensures SSR safety.
 *
 * Usage:
 *   import { gsap, ScrollTrigger } from '@/lib/gsap-config'
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register plugins once
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

/**
 * GSAP default configuration for wa'kijo
 * Applied globally to match our motion language.
 */
if (typeof window !== 'undefined') {
  gsap.defaults({
    ease: 'power2.out',
    duration: 0.35,
  });
}
