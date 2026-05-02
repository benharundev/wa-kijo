'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Mail, Settings, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrgSwitcher } from './org-switcher';
import { useSession } from '@/hooks/use-session';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
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
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const { data: session } = useSession();
  const activeOrgId = (session?.session as { activeOrganizationId?: string } | undefined)
    ?.activeOrganizationId;
  const orgBase = activeOrgId ? `/orgs/${activeOrgId}` : null;

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-sidebar">
      {/* Brand */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          wa-kijo
        </Link>
      </div>

      {/* Org switcher */}
      <div className="border-b p-2">
        <OrgSwitcher />
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {orgBase && (
          <>
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Organisation
            </div>
            {ORG_NAV_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} baseHref={orgBase} />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
