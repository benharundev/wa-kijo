import { headers } from 'next/headers';
import { getSession } from '@/lib/auth-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const session = await getSession({
    fetchOptions: { headers: await headers() },
  });

  const user = session?.data?.user;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back{user?.name ? `, ${user.name}` : ''}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Getting started</CardTitle>
            <CardDescription>Select or create an organisation to get started.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Use the organisation switcher in the sidebar to create your first workspace.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
