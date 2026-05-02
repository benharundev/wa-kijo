'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PasswordSignInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type PasswordSignInValues = z.infer<typeof PasswordSignInSchema>;

const MagicLinkSchema = z.object({
  email: z.string().email('Enter a valid email'),
});
type MagicLinkValues = z.infer<typeof MagicLinkSchema>;

export default function SignInPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'password' | 'magic'>('password');
  const [serverError, setServerError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const passwordForm = useForm<PasswordSignInValues>({
    resolver: zodResolver(PasswordSignInSchema),
  });

  const magicForm = useForm<MagicLinkValues>({
    resolver: zodResolver(MagicLinkSchema),
  });

  async function onPasswordSubmit(values: PasswordSignInValues) {
    setServerError(null);
    const result = await signIn.email({
      email: values.email,
      password: values.password,
      callbackURL: '/dashboard',
    });
    if (result.error) {
      setServerError(result.error.message ?? 'Sign in failed');
    } else {
      router.push('/dashboard');
    }
  }

  async function onMagicLinkSubmit(values: MagicLinkValues) {
    setServerError(null);
    const result = await signIn.magicLink({
      email: values.email,
      callbackURL: '/dashboard',
    });
    if (result.error) {
      setServerError(result.error.message ?? 'Could not send magic link');
    } else {
      setMagicSent(true);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>Access your wa-kijo account.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tab switch */}
        <div className="flex rounded-md border p-1">
          {(['password', 'magic'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setServerError(null); }}
              className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t === 'password' ? 'Password' : 'Magic link'}
            </button>
          ))}
        </div>

        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}

        {tab === 'password' && (
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...passwordForm.register('email')}
              />
              {passwordForm.formState.errors.email && (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/reset-password" className="text-xs text-muted-foreground hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...passwordForm.register('password')}
              />
              {passwordForm.formState.errors.password && (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={passwordForm.formState.isSubmitting}>
              {passwordForm.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        )}

        {tab === 'magic' && !magicSent && (
          <form onSubmit={magicForm.handleSubmit(onMagicLinkSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="magic-email">Email</Label>
              <Input
                id="magic-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...magicForm.register('email')}
              />
              {magicForm.formState.errors.email && (
                <p className="text-xs text-destructive">{magicForm.formState.errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={magicForm.formState.isSubmitting}>
              {magicForm.formState.isSubmitting ? 'Sending…' : 'Send magic link'}
            </Button>
          </form>
        )}

        {tab === 'magic' && magicSent && (
          <div className="rounded-md border p-4 text-center text-sm">
            <p className="font-medium">Check your inbox</p>
            <p className="text-muted-foreground">
              We sent a sign-in link to your email. It expires in 15 minutes.
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-center text-sm">
        <span className="text-muted-foreground">No account?&nbsp;</span>
        <Link href="/sign-up" className="font-medium hover:underline">
          Sign up
        </Link>
      </CardFooter>
    </Card>
  );
}
