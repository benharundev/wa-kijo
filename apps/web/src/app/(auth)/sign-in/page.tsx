'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Loader2, Mail, Lock, Zap, CheckCircle2 } from 'lucide-react';
import { signIn } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem, spring } from '@/lib/motion';

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
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your wa&#39;kijo account.</p>
      </motion.div>

      {/* Tab switch */}
      <motion.div
        variants={staggerItem}
        className="relative flex rounded-xl border border-border/60 bg-muted/40 p-1"
      >
        {/* Sliding background */}
        {(['password', 'magic'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setServerError(null);
            }}
            className={cn(
              'relative flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
              tab === t ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab === t && (
              <motion.div
                layoutId="auth-tab-bg"
                className="absolute inset-0 rounded-lg bg-background shadow-soft-sm"
                transition={spring}
              />
            )}
            <span className="relative z-10">{t === 'password' ? 'Password' : 'Magic link'}</span>
          </button>
        ))}
      </motion.div>

      {/* Server error */}
      <AnimatePresence mode="wait">
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={spring}
            className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/8 px-3 py-2.5 text-sm text-destructive"
          >
            <span className="flex-1">{serverError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forms */}
      <AnimatePresence mode="wait">
        {tab === 'password' && (
          <motion.form
            key="password-form"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            className="space-y-4"
          >
            <motion.div variants={staggerItem} className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="pl-9 transition-shadow duration-150 focus:shadow-[0_0_0_3px_hsl(var(--brand-500)/0.15)]"
                  {...passwordForm.register('email')}
                />
              </div>
              {passwordForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.email.message}
                </p>
              )}
            </motion.div>

            <motion.div variants={staggerItem} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Link
                  href="/reset-password"
                  className="text-xs text-muted-foreground transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="pl-9 transition-shadow duration-150 focus:shadow-[0_0_0_3px_hsl(var(--brand-500)/0.15)]"
                  {...passwordForm.register('password')}
                />
              </div>
              {passwordForm.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.password.message}
                </p>
              )}
            </motion.div>

            <motion.div variants={staggerItem}>
              <motion.button
                type="submit"
                disabled={passwordForm.formState.isSubmitting}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5',
                  'bg-gradient-brand text-sm font-semibold text-white shadow-brand',
                  'transition-all duration-200 hover:opacity-95 hover:shadow-brand-lg',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                {passwordForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Sign in
                  </>
                )}
              </motion.button>
            </motion.div>
          </motion.form>
        )}

        {tab === 'magic' && !magicSent && (
          <motion.form
            key="magic-form"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            onSubmit={magicForm.handleSubmit(onMagicLinkSubmit)}
            className="space-y-4"
          >
            <motion.div variants={staggerItem} className="space-y-1.5">
              <Label htmlFor="magic-email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="magic-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="pl-9 transition-shadow duration-150 focus:shadow-[0_0_0_3px_hsl(var(--brand-500)/0.15)]"
                  {...magicForm.register('email')}
                />
              </div>
              {magicForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {magicForm.formState.errors.email.message}
                </p>
              )}
            </motion.div>

            <motion.div variants={staggerItem}>
              <motion.button
                type="submit"
                disabled={magicForm.formState.isSubmitting}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5',
                  'bg-gradient-brand text-sm font-semibold text-white shadow-brand',
                  'transition-all duration-200 hover:opacity-95 hover:shadow-brand-lg',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                {magicForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send magic link
                  </>
                )}
              </motion.button>
            </motion.div>
          </motion.form>
        )}

        {tab === 'magic' && magicSent && (
          <motion.div
            key="magic-sent"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring}
            className="rounded-2xl border border-emerald-500/20 bg-emerald-50/60 p-6 text-center dark:bg-emerald-400/5"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-400/10"
            >
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </motion.div>
            <p className="text-sm font-semibold text-foreground">Check your inbox</p>
            <p className="mt-1 text-xs text-muted-foreground">
              We sent a sign-in link to your email. It expires in 15 minutes.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sign up link */}
      <motion.p variants={staggerItem} className="text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link
          href="/sign-up"
          className="font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          Sign up for free
        </Link>
      </motion.p>
    </motion.div>
  );
}
