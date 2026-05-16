'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Loader2, Mail, Lock, User, CheckCircle2, Zap } from 'lucide-react';
import { signUp } from '@/lib/auth-client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem, spring } from '@/lib/motion';

const SignUpSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignUpValues = z.infer<typeof SignUpSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [verifyPrompt, setVerifyPrompt] = useState(false);

  const form = useForm<SignUpValues>({
    resolver: zodResolver(SignUpSchema),
  });

  async function onSubmit(values: SignUpValues) {
    setServerError(null);
    const result = await signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL: '/dashboard',
    });

    if (result.error) {
      setServerError(result.error.message ?? 'Sign up failed');
    } else if (result.data?.user && !result.data.user.emailVerified) {
      setVerifyPrompt(true);
    } else {
      router.push('/dashboard');
    }
  }

  if (verifyPrompt) {
    return (
      <motion.div
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
        <p className="text-lg font-semibold text-foreground">Verify your email</p>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a verification link to your email address. Click the link to activate your
          account, then{' '}
          <Link
            href="/sign-in"
            className="font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            sign in
          </Link>
          .
        </p>
      </motion.div>
    );
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create account</h1>
        <p className="text-sm text-muted-foreground">Start your free wa&#39;kijo workspace.</p>
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

      <motion.form
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <motion.div variants={staggerItem} className="space-y-1.5">
          <Label htmlFor="name" className="text-sm font-medium">Full name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              id="name"
              placeholder="Jane Smith"
              className="pl-9 transition-shadow duration-150 focus:shadow-[0_0_0_3px_hsl(var(--brand-500)/0.15)]"
              {...form.register('name')}
            />
          </div>
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </motion.div>

        <motion.div variants={staggerItem} className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="pl-9 transition-shadow duration-150 focus:shadow-[0_0_0_3px_hsl(var(--brand-500)/0.15)]"
              {...form.register('email')}
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
        </motion.div>

        <motion.div variants={staggerItem} className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              className="pl-9 transition-shadow duration-150 focus:shadow-[0_0_0_3px_hsl(var(--brand-500)/0.15)]"
              {...form.register('password')}
            />
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </motion.div>

        <motion.div variants={staggerItem} className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="pl-9 transition-shadow duration-150 focus:shadow-[0_0_0_3px_hsl(var(--brand-500)/0.15)]"
              {...form.register('confirmPassword')}
            />
          </div>
          {form.formState.errors.confirmPassword && (
            <p className="text-xs text-destructive">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </motion.div>

        <motion.div variants={staggerItem}>
          <motion.button
            type="submit"
            disabled={form.formState.isSubmitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
              'mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5',
              'bg-gradient-brand text-sm font-semibold text-white shadow-brand',
              'transition-all duration-200 hover:opacity-95 hover:shadow-brand-lg',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Create account
              </>
            )}
          </motion.button>
        </motion.div>
      </motion.form>

      {/* Sign in link */}
      <motion.p variants={staggerItem} className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/sign-in"
          className="font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          Sign in
        </Link>
      </motion.p>
    </motion.div>
  );
}
