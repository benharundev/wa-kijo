'use client';

import { m as motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { ActivitySparkline } from '@/components/svg/activity-sparkline';
import { bouncySpring } from '@/lib/motion';

type TrendDirection = 'up' | 'down' | 'neutral';

interface MetricCardProps {
  title: string;
  value: number;
  formatFn?: (v: number) => string;
  trend?: {
    direction: TrendDirection;
    value: string; // e.g. "+12.5%"
    label?: string; // e.g. "vs last month"
  };
  sparklineData?: number[];
  sparklineColor?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  className?: string;
  delay?: number;
}

const trendConfig: Record<TrendDirection, { icon: React.ElementType; classes: string }> = {
  up: {
    icon: TrendingUp,
    classes: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-400/10',
  },
  down: {
    icon: TrendingDown,
    classes: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-400/10',
  },
  neutral: {
    icon: Minus,
    classes: 'text-muted-foreground bg-muted',
  },
};

export function MetricCard({
  title,
  value,
  formatFn,
  trend,
  sparklineData,
  sparklineColor,
  icon,
  iconColor = 'hsl(var(--brand-500))',
  className,
  delay = 0,
}: MetricCardProps) {
  const TrendIcon = trend ? trendConfig[trend.direction].icon : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...bouncySpring, delay }}
      whileHover={{ y: -2, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      className={cn(
        'group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border/60 bg-card p-5',
        'shadow-soft transition-shadow duration-200 hover:shadow-soft-md',
        'cursor-default',
        className,
      )}
    >
      {/* Gradient accent top strip */}
      <div
        className="absolute inset-x-0 top-0 h-px opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${iconColor}, transparent)` }}
      />

      {/* Hover glow */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(ellipse at top left, ${iconColor}0A 0%, transparent 60%)`,
        }}
      />

      {/* Header: title + icon */}
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: `${iconColor}18` }}
          >
            <div style={{ color: iconColor }} className="h-4 w-4 [&>svg]:h-4 [&>svg]:w-4">
              {icon}
            </div>
          </div>
        )}
      </div>

      {/* Value + Trend */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="text-3xl font-bold tracking-tight text-foreground">
            <AnimatedNumber value={value} formatFn={formatFn} />
          </div>

          {trend && TrendIcon && (
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                  trendConfig[trend.direction].classes,
                )}
              >
                <TrendIcon className="h-3 w-3" />
                {trend.value}
              </span>
              {trend.label && (
                <span className="text-xs text-muted-foreground">{trend.label}</span>
              )}
            </div>
          )}
        </div>

        {/* Sparkline */}
        {sparklineData && sparklineData.length > 1 && (
          <div className="w-24 shrink-0">
            <ActivitySparkline
              data={sparklineData}
              color={sparklineColor ?? iconColor}
              height={40}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
