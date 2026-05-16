'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface SparklineProps {
  data: number[];
  className?: string;
  color?: string;
  height?: number;
  animated?: boolean;
}

/**
 * Animated SVG sparkline chart.
 * Used inside metric cards for trend visualization.
 */
export function ActivitySparkline({
  data,
  className,
  color = 'hsl(var(--brand-500))',
  height = 40,
  animated = true,
}: SparklineProps) {
  const pathRef = useRef<SVGPathElement>(null);

  const width = 120;
  const padding = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  // Resolve the final point safely. With noUncheckedIndexedAccess, indexed
  // access returns `string | undefined`, so we explicitly fall back when the
  // input data is empty.
  const lastPoint = points[points.length - 1] ?? `${padding},${height - padding}`;
  const [lastXRaw, lastYRaw] = lastPoint.split(',');
  const lastX = parseFloat(lastXRaw ?? '0');
  const lastY = parseFloat(lastYRaw ?? '0');

  const linePath = `M ${points.join(' L ')}`;

  // Area fill path (close below the line)
  const areaPath = `M ${padding},${height} L ${linePath.slice(2)} L ${width - padding},${height} Z`;

  useEffect(() => {
    if (!animated || !pathRef.current) return;
    const length = pathRef.current.getTotalLength();
    pathRef.current.style.strokeDasharray = `${length}`;
    pathRef.current.style.strokeDashoffset = `${length}`;
    pathRef.current.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1) 0.3s';
    requestAnimationFrame(() => {
      if (pathRef.current) pathRef.current.style.strokeDashoffset = '0';
    });
  }, [animated, data]);

  const gradientId = `sparkline-gradient-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className={cn('overflow-visible', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradientId})`} />

      {/* Line */}
      <path
        ref={pathRef}
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End dot */}
      <circle
        cx={lastX}
        cy={lastY}
        r="2.5"
        fill={color}
        className={animated ? 'animate-pulse-soft' : ''}
      />
    </svg>
  );
}
