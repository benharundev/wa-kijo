import type { ReactNode } from 'react';
import { WaveBg } from '@/components/svg/wave-bg';
import { LogoAnimated } from '@/components/svg/logo-animated';
import Link from 'next/link';

/**
 * Auth pages layout — split panel design.
 * Left: brand illustration. Right: form.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background lg:flex-row">
      {/* ── Left Panel: Brand ── */}
      <div className="relative hidden lg:flex lg:w-[45%] lg:flex-col lg:items-center lg:justify-center">
        {/* Mesh gradient background */}
        <div className="absolute inset-0 bg-gradient-mesh" />
        {/* Animated wave */}
        <WaveBg className="absolute bottom-0 left-0 right-0 h-48" />

        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-16 top-1/4 h-64 w-64 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="pointer-events-none absolute right-8 top-1/3 h-48 w-48 rounded-full bg-brand-400/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-1/4 left-1/3 h-32 w-32 rounded-full bg-brand-600/10 blur-xl" />

        {/* Brand content */}
        <div className="relative z-10 flex max-w-xs flex-col items-center gap-8 text-center">
          {/* Animated logo */}
          <LogoAnimated width={72} height={72} />

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              wa<span className="text-gradient">&apos;kijo</span>
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Production-grade multi-tenant SaaS platform for NestJS developers building B2B
              products.
            </p>
          </div>

          {/* Social proof badges */}
          <div className="flex flex-wrap justify-center gap-2">
            {['Multi-tenant', 'WhatsApp', 'Billing', 'RBAC'].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-brand-500/20 bg-brand-500/8 px-3 py-1 text-xs font-medium text-brand-600 dark:text-brand-400"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Floating animated SVG illustration */}
          <div className="animate-float">
            <svg width="200" height="140" viewBox="0 0 200 140" fill="none" aria-hidden="true">
              <defs>
                <linearGradient
                  id="ill-grad"
                  x1="0"
                  y1="0"
                  x2="200"
                  y2="140"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="hsl(258 90% 60% / 0.3)" />
                  <stop offset="1" stopColor="hsl(280 90% 55% / 0.15)" />
                </linearGradient>
                <linearGradient
                  id="ill-grad2"
                  x1="0"
                  y1="0"
                  x2="200"
                  y2="140"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="hsl(258 90% 60% / 0.6)" />
                  <stop offset="1" stopColor="hsl(280 90% 55% / 0.4)" />
                </linearGradient>
              </defs>
              {/* Browser window mock */}
              <rect
                x="20"
                y="20"
                width="160"
                height="100"
                rx="10"
                fill="url(#ill-grad)"
                stroke="hsl(258 90% 60% / 0.3)"
                strokeWidth="1"
              />
              {/* Title bar dots */}
              <circle cx="36" cy="34" r="3" fill="hsl(0 84% 70% / 0.7)" />
              <circle cx="48" cy="34" r="3" fill="hsl(38 92% 60% / 0.7)" />
              <circle cx="60" cy="34" r="3" fill="hsl(158 64% 52% / 0.7)" />
              {/* Content lines */}
              <rect x="36" y="48" width="80" height="6" rx="3" fill="url(#ill-grad2)" />
              <rect x="36" y="62" width="60" height="4" rx="2" fill="hsl(258 90% 60% / 0.2)" />
              <rect x="36" y="74" width="40" height="4" rx="2" fill="hsl(258 90% 60% / 0.15)" />
              {/* Card mockups */}
              <rect
                x="36"
                y="88"
                width="38"
                height="22"
                rx="4"
                fill="url(#ill-grad2)"
                opacity="0.5"
              />
              <rect x="82" y="88" width="38" height="22" rx="4" fill="hsl(158 64% 52% / 0.4)" />
              <rect x="128" y="88" width="38" height="22" rx="4" fill="hsl(38 92% 60% / 0.4)" />
            </svg>
          </div>
        </div>

        {/* Bottom link */}
        <div className="absolute bottom-6 text-xs text-muted-foreground">
          <Link href="https://wakijo.io/docs" className="hover:text-foreground hover:underline">
            Documentation
          </Link>
          {' · '}
          <Link href="https://wakijo.io" className="hover:text-foreground hover:underline">
            wakijo.io
          </Link>
        </div>
      </div>

      {/* ── Right Panel: Form ── */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6 lg:border-l lg:border-border/40">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <LogoAnimated width={36} height={36} />
          <span className="text-lg font-bold">
            wa<span className="text-gradient">&apos;kijo</span>
          </span>
        </div>

        <div className="w-full max-w-sm">{children}</div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{' '}
          <Link href="#" className="underline hover:text-foreground">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="#" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
