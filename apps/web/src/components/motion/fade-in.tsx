'use client';

import { m as motion } from 'framer-motion';
import { fadeInUp } from '@/lib/motion';
import type { HTMLMotionProps } from 'framer-motion';

interface FadeInProps extends HTMLMotionProps<'div'> {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}

/**
 * Reusable fade-in-up wrapper using M3 Expressive spring physics.
 * Respects prefers-reduced-motion via framer-motion's built-in support.
 */
export function FadeIn({ delay = 0, className, children, ...props }: FadeInProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={delay ? { ...fadeInUp.visible, delay } : undefined}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
