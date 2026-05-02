'use client';

import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

const STATUS_VARIANTS = {
  pending: 'secondary',
  accepted: 'default',
  rejected: 'outline',
  canceled: 'outline',
} as const;

type Invite = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  organizationId: string;
  inviterId: string;
};

export default function InvitesPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const queryClient = useQueryClient();

  const { data: invitations } = useQuery({
    queryKey: ['invitations', orgId],
    queryFn: async () => {
      const result = await authClient.organization.getFullOrganization({
        query: { organizationId: orgId },
      });
      return (result.data?.invitations ?? []) as Invite[];
    },
  });

  const pending = invitations?.filter((i) => i.status === 'pending') ?? [];
  const past = invitations?.filter((i) => i.status !== 'pending') ?? [];

  async function cancelInvite(invitationId: string) {
    await authClient.organization.cancelInvitation({ invitationId });
    toast({ title: 'Invitation cancelled' });
    void queryClient.invalidateQueries({ queryKey: ['invitations', orgId] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invitations</h1>
        <p className="text-sm text-muted-foreground">
          {pending.length} pending invitation{pending.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="rounded-md border">
        {pending.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">No pending invitations.</p>
        )}

        {pending.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center justify-between p-4 [&:not(:last-child)]:border-b"
          >
            <div>
              <p className="text-sm font-medium">{invite.email}</p>
              <p className="text-xs text-muted-foreground">
                Role: {invite.role} &middot; Expires{' '}
                {new Date(invite.expiresAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={
                  STATUS_VARIANTS[invite.status as keyof typeof STATUS_VARIANTS] ?? 'outline'
                }
              >
                {invite.status}
              </Badge>
              <Can do="member:invite">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => cancelInvite(invite.id)}
                >
                  Cancel
                </Button>
              </Can>
            </div>
          </div>
        ))}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground">Past invitations</h2>
          <div className="rounded-md border opacity-60">
            {past.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4 [&:not(:last-child)]:border-b"
              >
                <p className="text-sm">{invite.email}</p>
                <Badge
                  variant={
                    STATUS_VARIANTS[invite.status as keyof typeof STATUS_VARIANTS] ?? 'outline'
                  }
                >
                  {invite.status}
                </Badge>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
