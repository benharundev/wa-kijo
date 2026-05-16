'use client';

import { m as motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import type { HTMLMotionProps } from 'framer-motion';

interface StaggerChildrenProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Wraps children in a stagger container.
 * Each direct child should use <StaggerItem> for the entrance animation.
 */
export function StaggerChildren({ children, className, delay, ...props }: StaggerChildrenProps) {
  return (
    <motion.div
      variants={{
        ...staggerContainer,
        visible: {
          ...staggerContainer.visible,
          transition: {
            ...(staggerContainer.visible as { transition?: object }).transition,
            delayChildren: delay ?? 0.05,
          },
        },
      }}
      initial="hidden"
      animate="visible"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
}

/**
 * Child of <StaggerChildren> — animates in with a staggered delay.
 */
export function StaggerItem({ children, className, ...props }: StaggerItemProps) {
  return (
    <motion.div variants={staggerItem} className={className} {...props}>
      {children}
    </motion.div>
  );
}
