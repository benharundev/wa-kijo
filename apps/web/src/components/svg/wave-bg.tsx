'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface WaveBgProps {
  className?: string;
  animated?: boolean;
}

/**
 * Animated SVG wave background for hero sections and auth pages.
 * Pure CSS animation — no JS runtime cost.
 */
export function WaveBg({ className, animated = true }: WaveBgProps) {
  return (
    <div className={cn('pointer-events-none overflow-hidden', className)} aria-hidden="true">
      <svg
        viewBox="0 0 1440 320"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="wave-gradient-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(258 90% 56% / 0.15)" />
            <stop offset="50%" stopColor="hsl(280 90% 56% / 0.20)" />
            <stop offset="100%" stopColor="hsl(220 90% 56% / 0.12)" />
          </linearGradient>
          <linearGradient id="wave-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(280 90% 56% / 0.10)" />
            <stop offset="100%" stopColor="hsl(258 90% 56% / 0.08)" />
          </linearGradient>
        </defs>

        {/* Wave 1 — slower */}
        <path
          d="M0,160 C360,240 720,80 1080,160 C1260,200 1350,240 1440,200 L1440,320 L0,320 Z"
          fill="url(#wave-gradient-1)"
          className={animated ? 'origin-center animate-[wave1_8s_ease-in-out_infinite]' : ''}
          style={
            animated
              ? {
                  animation: 'wave1 8s ease-in-out infinite',
                }
              : undefined
          }
        />

        {/* Wave 2 — faster, offset */}
        <path
          d="M0,200 C480,120 960,280 1440,180 L1440,320 L0,320 Z"
          fill="url(#wave-gradient-2)"
          style={
            animated
              ? {
                  animation: 'wave2 6s ease-in-out infinite 1s',
                }
              : undefined
          }
        />

        <style>{`
          @keyframes wave1 {
            0%, 100% { d: path("M0,160 C360,240 720,80 1080,160 C1260,200 1350,240 1440,200 L1440,320 L0,320 Z"); }
            50% { d: path("M0,200 C360,120 720,240 1080,160 C1260,120 1350,200 1440,240 L1440,320 L0,320 Z"); }
          }
          @keyframes wave2 {
            0%, 100% { d: path("M0,200 C480,120 960,280 1440,180 L1440,320 L0,320 Z"); }
            50% { d: path("M0,160 C480,240 960,120 1440,220 L1440,320 L0,320 Z"); }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes wave1 { 0%, 100% { } }
            @keyframes wave2 { 0%, 100% { } }
          }
        `}</style>
      </svg>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Illustrated empty state with floating SVG animation.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-4 py-16 text-center', className)}
    >
      {/* Floating illustration container */}
      <div className="relative animate-float">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-brand-soft shadow-soft">
          <div className="text-brand-500">{icon}</div>
        </div>
        {/* Decorative ring */}
        <svg
          className="absolute -inset-3 animate-spin-slow opacity-40"
          viewBox="0 0 100 100"
          width="104"
          height="104"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="hsl(var(--brand-400))"
            strokeWidth="1"
            strokeDasharray="8 4"
          />
        </svg>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && <p className="max-w-xs text-sm text-muted-foreground">{description}</p>}
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
