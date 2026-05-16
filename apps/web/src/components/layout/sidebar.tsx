'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Mail,
  Settings,
  CreditCard,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { OrgSwitcher } from './org-switcher';
import { useSession } from '@/hooks/use-session';
import { bouncySpring, subtleEase } from '@/lib/motion';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
];

const ORG_NAV_ITEMS: NavItem[] = [
  { label: 'Members', href: '/members', icon: Users },
  { label: 'Invites', href: '/invites', icon: Mail },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function NavLink({ item, baseHref = '' }: { item: NavItem; baseHref?: string }) {
  const pathname = usePathname();
  const href = `${baseHref}${item.href}`;
  const isActive = item.exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
        'transition-colors duration-150',
        isActive
          ? 'text-sidebar-primary-foreground'
          : 'text-sidebar-foreground hover:text-foreground',
      )}
    >
      {/* Animated background pill */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active-pill"
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 shadow-brand"
          transition={bouncySpring}
          style={{ zIndex: 0 }}
        />
      )}

      {/* Hover background */}
      {!isActive && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-sidebar-accent opacity-0 group-hover:opacity-100"
          transition={subtleEase}
          style={{ zIndex: 0 }}
        />
      )}

      <item.icon
        className={cn(
          'relative z-10 h-4 w-4 shrink-0 transition-transform duration-150',
          'group-hover:scale-110',
          isActive ? 'text-white' : 'text-sidebar-foreground group-hover:text-foreground',
        )}
      />
      <span className="relative z-10 flex-1">
        {item.label}
      </span>
      {item.badge && (
        <span className="relative z-10 ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500/20 px-1.5 text-[10px] font-semibold text-brand-600 dark:bg-brand-400/20 dark:text-brand-400">
          {item.badge}
        </span>
      )}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative z-10 ml-auto"
          transition={subtleEase}
        >
          <ChevronRight className="h-3.5 w-3.5 text-white/70" />
        </motion.div>
      )}
    </Link>
  );
}

export function Sidebar() {
  const { data: session } = useSession();
  const activeOrgId = (session?.session as { activeOrganizationId?: string } | undefined)
    ?.activeOrganizationId;
  const orgBase = activeOrgId ? `/orgs/${activeOrgId}` : null;

  return (
    <aside
      className={cn(
        'relative flex h-full w-64 flex-col',
        // Glass effect
        'glass border-r border-sidebar-border/60',
        'bg-sidebar/80 backdrop-blur-xl',
      )}
    >
      {/* Subtle gradient overlay at top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 rounded-tl-inherit bg-gradient-to-b from-brand-500/5 to-transparent" />

      {/* Brand Header */}
      <div className="relative flex h-14 items-center gap-2.5 border-b border-sidebar-border/60 px-4">
        {/* Animated logo mark */}
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-brand shadow-brand">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Zap className="h-3.5 w-3.5 text-white" />
          </motion.div>
        </div>
        <Link href="/dashboard" className="group flex items-center gap-1">
          <span className="text-sm font-bold tracking-tight text-foreground">
            wa<span className="text-gradient">&apos;kijo</span>
          </span>
        </Link>

        {/* Live indicator */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-badge-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        </div>
      </div>

      {/* Org switcher */}
      <div className="border-b border-sidebar-border/60 p-2">
        <OrgSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {/* Main nav */}
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {/* Org-scoped nav */}
        <AnimatePresence>
          {orgBase && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Organisation
              </div>
              <div className="space-y-0.5">
                {ORG_NAV_ITEMS.map((item) => (
                  <NavLink key={item.href} item={item} baseHref={orgBase} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Footer gradient fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-14 h-8 bg-gradient-to-t from-sidebar/80 to-transparent" />

      {/* Bottom footer */}
      <div className="border-t border-sidebar-border/60 p-3">
        <a
          href="https://wakijo.io/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-md border border-border/60 bg-background/60 text-muted-foreground group-hover:border-brand-500/30 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20">
            <span className="text-[9px] font-bold">?</span>
          </div>
          <span>Documentation</span>
        </a>
      </div>
    </aside>
  );
}
