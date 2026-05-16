'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function MagicLinkVerifyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Missing verification token.');
      return;
    }

    authClient.magicLink
      .verify({ query: { token, callbackURL: '/dashboard' } })
      .then((result: { error?: { message?: string } | null }) => {
        if (result.error) {
          setStatus('error');
          setErrorMsg(result.error.message ?? 'Verification failed.');
        } else {
          setStatus('success');
          router.push('/dashboard');
        }
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg('An unexpected error occurred.');
      });
  }, [token, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {status === 'verifying' && 'Verifying…'}
          {status === 'success' && 'Signed in'}
          {status === 'error' && 'Verification failed'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'verifying' && (
          <p className="text-sm text-muted-foreground">Please wait while we sign you in.</p>
        )}
        {status === 'error' && (
          <>
            <p className="text-sm text-destructive">{errorMsg}</p>
            <Button variant="outline" asChild className="w-full">
              <Link href="/sign-in">Back to sign in</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function MagicLinkVerifyPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardHeader>
            <CardTitle>Loading…</CardTitle>
          </CardHeader>
        </Card>
      }
    >
      <MagicLinkVerifyInner />
    </Suspense>
  );
}
