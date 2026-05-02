import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MagicLinkSentPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Check your inbox</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          We sent a sign-in link to your email. Click the link to access your account — it expires
          in 15 minutes.
        </p>
        <p className="text-xs text-muted-foreground">
          Didn&apos;t get it? Check your spam folder or{' '}
          <Link href="/sign-in" className="underline">
            try again
          </Link>
          .
        </p>
        <Button variant="outline" asChild className="w-full">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
