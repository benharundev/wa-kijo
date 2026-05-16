'use client';

import { useEffect, useRef } from 'react';

interface RiveLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

/**
 * wa'kijo animated logo placeholder using SVG + CSS animation.
 *
 * When a `.riv` file is available from the designer, replace this
 * with @rive-app/react-canvas:
 *
 *   import { useRive } from '@rive-app/react-canvas'
 *   const { RiveComponent } = useRive({ src: '/animations/logo.riv', autoplay: true })
 *   return <RiveComponent width={width} height={height} />
 *
 * The SVG below replicates a Rive state machine: idle → hover → active.
 */
export function LogoAnimated({ width = 32, height = 32, className }: RiveLogoProps) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    // Draw-on animation using SVG stroke technique
    const length = el.getTotalLength?.() ?? 60;
    el.style.strokeDasharray = `${length}`;
    el.style.strokeDashoffset = `${length}`;
    el.style.transition = 'stroke-dashoffset 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.1s';
    requestAnimationFrame(() => {
      el.style.strokeDashoffset = '0';
    });
  }, []);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="wa'kijo logo"
    >
      {/* Background pill */}
      <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" />

      {/* Animated lightning bolt / "k" mark */}
      <path
        ref={pathRef}
        d="M19 7L12 17h7l-6 8"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Static accent dot */}
      <circle cx="22" cy="10" r="2" fill="white" fillOpacity="0.6" className="animate-pulse-soft" />

      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(258 90% 60%)" />
          <stop offset="1" stopColor="hsl(280 90% 55%)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
