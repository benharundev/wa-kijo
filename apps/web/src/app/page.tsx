import { redirect } from 'next/navigation';

/**
 * Root route redirects to the dashboard.
 * The (app) layout handles unauthenticated redirects to /sign-in.
 */
export default function RootPage() {
  redirect('/dashboard');
}
