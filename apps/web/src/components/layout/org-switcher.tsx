'use client';

import { useState } from 'react';
import { ChevronsUpDown, Plus, Building2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';

export function OrgSwitcher() {
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const { data: orgsData } = authClient.useListOrganizations();
  const activeOrgId = (session?.session as { activeOrganizationId?: string } | undefined)
    ?.activeOrganizationId;
  const activeOrg = orgsData?.find((o) => o.id === activeOrgId) ?? orgsData?.[0];

  async function switchOrg(orgId: string) {
    await authClient.organization.setActive({ organizationId: orgId });
    setOpen(false);
    router.refresh();
  }

  async function createOrg() {
    setOpen(false);
    router.push('/onboarding/create-org');
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex w-full items-center justify-between gap-2 px-2"
          data-testid="org-switcher"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-medium">
              {activeOrg?.name ?? 'Select organisation'}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Organisations
        </DropdownMenuLabel>

        {orgsData?.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onSelect={() => switchOrg(org.id)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{org.name}</span>
            {org.id === activeOrgId && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Active
              </Badge>
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={createOrg}>
          <Plus className="mr-2 h-4 w-4" />
          New organisation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
