'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

type SessionItem = {
  id: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export default function SessionsPage() {
  const queryClient = useQueryClient();

  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const result = await authClient.listSessions();
      return (result.data ?? []) as SessionItem[];
    },
  });

  const { data: currentSession } = authClient.useSession();
  const currentToken = (currentSession?.session as { token?: string } | undefined)?.token;

  async function revokeSession(token: string) {
    await authClient.revokeSession({ token });
    toast({ title: 'Session revoked' });
    void queryClient.invalidateQueries({ queryKey: ['sessions'] });
  }

  async function revokeAll() {
    await authClient.revokeOtherSessions();
    toast({ title: 'All other sessions revoked' });
    void queryClient.invalidateQueries({ queryKey: ['sessions'] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="text-sm text-muted-foreground">
            {sessions?.length ?? 0} active session{(sessions?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>

        {(sessions?.length ?? 0) > 1 && (
          <Button variant="outline" size="sm" onClick={revokeAll}>
            Revoke all other sessions
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>
            These devices are currently signed into your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions?.map((session) => {
              const isCurrent = session.token === currentToken;
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{session.userAgent ?? 'Unknown device'}</p>
                      {isCurrent && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.ipAddress ?? 'Unknown IP'} &middot; Expires{' '}
                      {new Date(session.expiresAt).toLocaleDateString()}
                    </p>
                  </div>

                  {!isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => revokeSession(session.token)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              );
            })}

            {(!sessions || sessions.length === 0) && (
              <p className="text-center text-sm text-muted-foreground">No active sessions.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
