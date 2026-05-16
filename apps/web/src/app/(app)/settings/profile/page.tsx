'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';

const ProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});
type ProfileValues = z.infer<typeof ProfileSchema>;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;

  const form = useForm<ProfileValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (user?.name) {
      form.reset({ name: user.name });
    }
  }, [user, form]);

  async function onSubmit(values: ProfileValues) {
    const result = await authClient.updateUser({ name: values.name });
    if (result.error) {
      toast({ title: 'Update failed', description: result.error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated' });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal information.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
          <CardDescription>Update your display name.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? ''} />
              <AvatarFallback className="text-lg">{getInitials(user?.name ?? '?')}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={user?.email ?? ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Email changes require re-verification — contact support.
              </p>
            </div>

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
