import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from './user-menu';
import { Bell, Search } from 'lucide-react';

export function TopBar() {
  return (
    <header className="relative flex h-14 items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-5 backdrop-blur-xl">
      {/* Left: Search trigger (Apple HIG ⌘K pattern) */}
      <button
        className="group flex h-8 items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 text-sm text-muted-foreground transition-all duration-150 hover:border-brand-500/40 hover:bg-muted/70 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        aria-label="Search (⌘K)"
        id="search-trigger"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="ml-2 hidden items-center gap-0.5 rounded border border-border/60 bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Right: Notification + Theme + User */}
      <div className="flex items-center gap-1.5">
        {/* Notification bell */}
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          aria-label="Notifications"
          id="notifications-btn"
        >
          <Bell className="h-4 w-4" />
          {/* Notification badge */}
          <span className="absolute right-1.5 top-1.5 flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75 animate-badge-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
          </span>
        </button>

        <div className="h-4 w-px bg-border" />

        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
