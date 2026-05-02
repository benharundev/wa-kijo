import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '@/lib/auth-client';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { Toaster } from '@/components/ui/toaster';

/**
 * Authenticated shell layout.
 *
 * Performs a server-side session check on every navigation. Unauthenticated
 * requests are redirected to /sign-in before any HTML is sent to the client.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession({
    fetchOptions: { headers: await headers() },
  });

  if (!session?.data) {
    redirect('/sign-in');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
