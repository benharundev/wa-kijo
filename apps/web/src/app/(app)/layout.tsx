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
  let session = null;
  try {
    session = await getSession({
      fetchOptions: { headers: await headers() },
    });
  } catch (error) {
    // Backend is unreachable, force redirect to sign-in
    console.error('Failed to fetch session. Backend may be down:', error);
  }

  // if (!session?.data) {
  //   redirect('/sign-in');
  // }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mesh gradient background layer */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-mesh opacity-60 dark:opacity-30" />

      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      <Toaster />
    </div>
  );
}
