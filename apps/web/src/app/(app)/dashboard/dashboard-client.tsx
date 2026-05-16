'use client';

import { useEffect, useRef } from 'react';
import { m as motion } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import {
  Users,
  MessageSquare,
  CreditCard,
  Building2,
  ArrowRight,
  CheckCircle2,
  Circle,
  Sparkles,
  Zap,
  Shield,
  Globe,
} from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import { ProgressRing } from '@/components/svg/progress-ring';
import { StaggerChildren, StaggerItem } from '@/components/motion/stagger-children';
import { gsap } from '@/lib/gsap-config';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface DashboardClientProps {
  user: User | null;
}

// Mock sparkline data (replace with real API data)
const sparklineData = {
  contacts: [12, 18, 15, 22, 28, 24, 35, 30, 42, 38, 51, 47],
  conversations: [5, 8, 12, 9, 14, 18, 15, 22, 19, 28, 24, 31],
  billing: [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4],
  members: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6],
};

const onboardingSteps = [
  { id: 'org', label: 'Create your organisation', done: true },
  { id: 'members', label: 'Invite team members', done: false },
  { id: 'channel', label: 'Connect a WhatsApp channel', done: false },
  { id: 'billing', label: 'Set up billing', done: false },
  { id: 'contact', label: 'Import first contacts', done: false },
];

const quickActions = [
  {
    icon: Users,
    label: 'Import Contacts',
    description: 'Bulk import via CSV',
    href: '#',
    color: 'hsl(var(--brand-500))',
    bgColor: 'hsl(var(--brand-500) / 0.1)',
  },
  {
    icon: MessageSquare,
    label: 'New Conversation',
    description: 'Start messaging',
    href: '#',
    color: 'hsl(158 64% 52%)',
    bgColor: 'hsl(158 64% 52% / 0.1)',
  },
  {
    icon: Globe,
    label: 'Connect Channel',
    description: 'WhatsApp, Email, SMS',
    href: '#',
    color: 'hsl(38 92% 50%)',
    bgColor: 'hsl(38 92% 50% / 0.1)',
  },
  {
    icon: Shield,
    label: 'Configure RBAC',
    description: 'Roles & permissions',
    href: '#',
    color: 'hsl(258 90% 66%)',
    bgColor: 'hsl(258 90% 66% / 0.1)',
  },
];

const completedSteps = onboardingSteps.filter((s) => s.done).length;
const completionPercent = Math.round((completedSteps / onboardingSteps.length) * 100);

export function DashboardClient({ user }: DashboardClientProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [activityRef] = useAutoAnimate<HTMLUListElement>();

  // GSAP: Scroll-triggered hero text reveal
  useGSAP(
    () => {
      if (!heroRef.current) return;
      const words = heroRef.current.querySelectorAll('.gsap-word');
      gsap.fromTo(
        words,
        { opacity: 0, y: 20, filter: 'blur(8px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.6,
          stagger: 0.06,
          ease: 'power3.out',
        },
      );
    },
    { scope: heroRef },
  );

  const greeting = getGreeting();
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-8">
      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <div ref={heroRef} className="relative overflow-hidden rounded-2xl bg-gradient-mesh p-6 pb-8">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-32 h-48 w-48 rounded-full bg-brand-400/6 blur-2xl" />

        <div className="relative">
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-brand-500/20 bg-brand-500/8 px-2.5 py-1 text-xs font-medium text-brand-600 dark:text-brand-400">
            <Sparkles className="h-3 w-3" />
            wa&#39;kijo Platform
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
            {`${greeting}, `.split('').map((char, i) => (
              <span key={i} className="gsap-word inline-block opacity-0">
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
            <span className="text-gradient gsap-word inline-block opacity-0">{firstName}</span>
            <span className="gsap-word inline-block opacity-0">.</span>
          </h1>

          <p className="gsap-word mt-2 max-w-lg text-sm text-muted-foreground opacity-0">
            Your multi-tenant SaaS platform is ready. Let&#39;s get your workspace configured.
          </p>
        </div>
      </div>

      {/* ── KPI Metrics ──────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
          Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Contacts"
            value={0}
            icon={<Users />}
            iconColor="hsl(var(--brand-500))"
            trend={{ direction: 'neutral', value: '—', label: 'no data yet' }}
            sparklineData={sparklineData.contacts}
            sparklineColor="hsl(var(--brand-500))"
            delay={0.05}
          />
          <MetricCard
            title="Conversations"
            value={0}
            icon={<MessageSquare />}
            iconColor="hsl(158 64% 45%)"
            trend={{ direction: 'neutral', value: '—', label: 'no data yet' }}
            sparklineData={sparklineData.conversations}
            sparklineColor="hsl(158 64% 45%)"
            delay={0.1}
          />
          <MetricCard
            title="Active Plan"
            value={0}
            formatFn={() => 'Free'}
            icon={<CreditCard />}
            iconColor="hsl(38 92% 50%)"
            trend={{ direction: 'up', value: 'Upgrade', label: 'for more features' }}
            sparklineData={sparklineData.billing}
            sparklineColor="hsl(38 92% 50%)"
            delay={0.15}
          />
          <MetricCard
            title="Team Members"
            value={1}
            icon={<Building2 />}
            iconColor="hsl(258 90% 66%)"
            trend={{ direction: 'neutral', value: 'Just you', label: 'invite your team' }}
            sparklineData={sparklineData.members}
            sparklineColor="hsl(258 90% 66%)"
            delay={0.2}
          />
        </div>
      </div>

      {/* ── Quick Actions + Onboarding ──────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Quick Actions — 3/5 */}
        <div className="lg:col-span-3">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
            Quick Actions
          </h2>
          <StaggerChildren className="grid gap-3 sm:grid-cols-2" delay={0.25}>
            {quickActions.map((action) => (
              <StaggerItem key={action.label}>
                <Link
                  href={action.href}
                  className={cn(
                    'group flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4',
                    'transition-all duration-200 hover:border-border hover:shadow-soft',
                    'hover:-translate-y-0.5',
                  )}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
                    style={{ background: action.bgColor }}
                  >
                    <action.icon className="h-4 w-4" style={{ color: action.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                </Link>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>

        {/* Onboarding — 2/5 */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="lg:col-span-2"
        >
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
            Getting Started
          </h2>
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
            {/* Progress ring header */}
            <div className="mb-5 flex items-center gap-4">
              <ProgressRing
                value={completionPercent}
                size={64}
                strokeWidth={5}
                label={`${completionPercent}%`}
                sublabel="done"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">Setup Progress</p>
                <p className="text-xs text-muted-foreground">
                  {completedSteps} of {onboardingSteps.length} steps complete
                </p>
              </div>
            </div>

            {/* Steps list — AutoAnimate handles reorders */}
            <ul ref={activityRef} className="space-y-2.5">
              {onboardingSteps.map((step) => (
                <li key={step.id} className="flex items-center gap-3">
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  )}
                  <span
                    className={cn(
                      'text-sm',
                      step.done ? 'text-muted-foreground line-through' : 'text-foreground',
                    )}
                  >
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Link
              href="#"
              className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-white shadow-brand transition-all duration-200 hover:shadow-brand-lg hover:opacity-95 active:scale-[0.98]"
            >
              <Zap className="h-4 w-4" />
              Continue Setup
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
