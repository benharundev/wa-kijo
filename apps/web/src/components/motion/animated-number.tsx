'use client';

import { useEffect, useRef } from 'react';
import { m as motion, useMotionValue, useSpring } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  formatFn?: (value: number) => string;
  className?: string;
}

/**
 * Smoothly animates between numeric values using spring physics.
 * Used for KPI metric cards.
 */
export function AnimatedNumber({
  value,
  duration = 1.2,
  formatFn = (v) => Math.round(v).toLocaleString(),
  className,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 80,
    damping: 20,
    duration,
  });
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    return springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = formatFn(latest);
      }
    });
  }, [springValue, formatFn]);

  return (
    <motion.span ref={ref} className={className}>
      {formatFn(0)}
    </motion.span>
  );
}
