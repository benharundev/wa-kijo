'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import type { Role } from '@wa-kijo/shared';

const InviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['owner', 'admin', 'member']),
});
type InviteValues = z.infer<typeof InviteSchema>;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const ROLE_VARIANTS: Record<Role, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  admin: 'secondary',
  member: 'outline',
};

type Member = {
  id: string;
  role: string;
  userId: string;
  organizationId: string;
  createdAt: Date;
  user: { id: string; name: string; email: string; image?: string | null } | undefined;
};

export default function MembersPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const { data: members } = useQuery({
    queryKey: ['members', orgId],
    queryFn: async () => {
      const result = await authClient.organization.getFullOrganization({
        query: { organizationId: orgId },
      });
      return result.data?.members ?? [];
    },
  });

  const form = useForm<InviteValues>({
    resolver: zodResolver(InviteSchema),
    defaultValues: { role: 'member' },
  });

  async function onInvite(values: InviteValues) {
    setInviteError(null);
    const result = await authClient.organization.inviteMember({
      organizationId: orgId,
      email: values.email,
      role: values.role,
    });
    if (result.error) {
      setInviteError(result.error.message ?? 'Invite failed');
    } else {
      toast({ title: 'Invitation sent', description: `${values.email} has been invited.` });
      setInviteOpen(false);
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ['members', orgId] });
    }
  }

  async function removeMember(memberId: string) {
    await authClient.organization.removeMember({
      organizationId: orgId,
      memberIdOrEmail: memberId,
    });
    void queryClient.invalidateQueries({ queryKey: ['members', orgId] });
  }

  return (
    <div className="space-y-6" data-testid="members-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground">
            {members?.length ?? 0} member{(members?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>

        <Can do="member:invite">
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button data-testid="invite-button">Invite member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a member</DialogTitle>
                <DialogDescription>
                  They will receive an email invitation to join this organisation.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={form.handleSubmit(onInvite)} className="space-y-4">
                {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}

                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Email address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@example.com"
                    data-testid="invite-email-input"
                    {...form.register('email')}
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select
                    defaultValue="member"
                    onValueChange={(v) => form.setValue('role', v as Role)}
                  >
                    <SelectTrigger id="invite-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Sending…' : 'Send invite'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </div>

      <div className="rounded-md border" data-testid="members-list">
        {(members as Member[] | undefined)?.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-4 [&:not(:last-child)]:border-b"
            data-testid="member-row"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {getInitials(member.user?.name ?? member.user?.email ?? '?')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{member.user?.name ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{member.user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={ROLE_VARIANTS[member.role as Role] ?? 'outline'}>{member.role}</Badge>
              <Can do="member:remove">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeMember(member.id)}
                >
                  Remove
                </Button>
              </Can>
            </div>
          </div>
        ))}

        {(!members || members.length === 0) && (
          <p className="p-6 text-center text-sm text-muted-foreground">No members yet.</p>
        )}
      </div>
    </div>
  );
}
