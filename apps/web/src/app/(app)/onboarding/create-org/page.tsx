'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const CreateOrgSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
});
type CreateOrgValues = z.infer<typeof CreateOrgSchema>;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function CreateOrgPage() {
  const router = useRouter();

  const form = useForm<CreateOrgValues>({
    resolver: zodResolver(CreateOrgSchema),
    defaultValues: { name: '', slug: '' },
  });

  function onNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    form.setValue('name', e.target.value);
    if (!form.formState.dirtyFields.slug) {
      form.setValue('slug', slugify(e.target.value));
    }
  }

  async function onSubmit(values: CreateOrgValues) {
    const result = await authClient.organization.create({
      name: values.name,
      slug: values.slug,
    });
    if (result.error) {
      form.setError('root', { message: result.error.message ?? 'Creation failed' });
    } else {
      const orgId = result.data?.id;
      if (orgId) {
        await authClient.organization.setActive({ organizationId: orgId });
        router.push(`/orgs/${orgId}/members`);
      } else {
        router.push('/dashboard');
      }
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create organisation</h1>
        <p className="text-sm text-muted-foreground">Set up a new workspace for your team.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organisation details</CardTitle>
          <CardDescription>You can change these later in Settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="org-name">Organisation name</Label>
              <Input
                id="org-name"
                placeholder="Acme Corp"
                {...form.register('name')}
                onChange={onNameChange}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-slug">Slug</Label>
              <Input
                id="org-slug"
                placeholder="acme-corp"
                {...form.register('slug')}
                aria-label="Slug"
              />
              {form.formState.errors.slug && (
                <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Creating…' : 'Create organisation'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
