'use client';

import { cn } from '@/lib/utils';

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  animated?: boolean;
}

/**
 * Animated SVG circular progress ring.
 * Used for onboarding completion and usage meters.
 */
export function ProgressRing({
  value,
  size = 80,
  strokeWidth = 6,
  className,
  color = 'hsl(var(--brand-500))',
  trackColor = 'hsl(var(--muted))',
  label,
  sublabel,
  animated = true,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />

        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? circumference : offset}
          style={
            animated
              ? {
                  transition: `stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.4s`,
                  strokeDashoffset: offset,
                }
              : undefined
          }
        />
      </svg>

      {/* Center content */}
      {(label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {label && <span className="text-sm font-bold leading-none text-foreground">{label}</span>}
          {sublabel && (
            <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
