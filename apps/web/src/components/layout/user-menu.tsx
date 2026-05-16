'use client';

import { LogOut, Settings, User, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { m as motion, AnimatePresence } from 'framer-motion';
import { signOut } from '@/lib/auth-client';
import { useSession } from '@/hooks/use-session';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { scaleIn } from '@/lib/motion';
import { cn } from '@/lib/utils';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function UserMenu() {
  const router = useRouter();
  const { data: session } = useSession();

  if (!session) return null;

  const { user } = session;

  async function handleSignOut() {
    await signOut();
    router.push('/sign-in');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cn(
            'flex items-center gap-2 rounded-xl p-1 pr-2',
            'transition-colors duration-150',
            'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring/40',
          )}
          aria-label="User menu"
          data-testid="user-menu"
        >
          <div className="relative">
            <Avatar className="h-7 w-7 ring-2 ring-brand-500/20 ring-offset-1 ring-offset-background transition-all duration-200 hover:ring-brand-500/40">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback className="bg-gradient-brand text-[11px] font-semibold text-white">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </div>
          <span className="hidden text-sm font-medium text-foreground sm:block">
            {user.name.split(' ')[0]}
          </span>
        </motion.button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className={cn(
          'w-60 rounded-xl border-border/60 p-1',
          'glass shadow-soft-lg',
        )}
        align="end"
        sideOffset={8}
        forceMount
      >
        {/* User info header */}
        <DropdownMenuLabel className="rounded-lg bg-gradient-brand-soft p-3 font-normal">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-2 ring-brand-500/20">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback className="bg-gradient-brand text-sm font-semibold text-white">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5 overflow-hidden">
              <p className="truncate text-sm font-semibold leading-none text-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs leading-none text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="my-1 bg-border/60" />

        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={() => router.push('/settings/profile')}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => router.push('/settings/sessions')}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted">
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => router.push('/settings/billing')}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-brand">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span>Upgrade plan</span>
            <span className="ml-auto rounded-full bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              Pro
            </span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-1 bg-border/60" />

        <DropdownMenuItem
          onSelect={handleSignOut}
          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-destructive focus:bg-destructive/8 focus:text-destructive"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-destructive/10">
            <LogOut className="h-3.5 w-3.5" />
          </div>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
