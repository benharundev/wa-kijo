import { headers } from 'next/headers';
import { getSession } from '@/lib/auth-client';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const DashboardClient = dynamic(
  () => import('./dashboard-client').then((mod) => mod.DashboardClient),
  {
    loading: () => (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
      </div>
    ),
  }
);

export const metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  let session = null;
  try {
    session = await getSession({
      fetchOptions: { headers: await headers() },
    });
  } catch (error) {
    console.error('Failed to fetch session for dashboard:', error);
  }

  const user = session?.data?.user;

  return <DashboardClient user={user ?? null} />;
}
