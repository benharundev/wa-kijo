import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from './user-menu';

export function TopBar() {
  return (
    <header className="flex h-14 items-center justify-end gap-2 border-b bg-background px-4">
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
