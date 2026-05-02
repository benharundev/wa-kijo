'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

const OrgSettingsSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
});
type OrgSettingsValues = z.infer<typeof OrgSettingsSchema>;

export default function OrgSettingsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { data: org } = authClient.useActiveOrganization();

  const form = useForm<OrgSettingsValues>({
    resolver: zodResolver(OrgSettingsSchema),
    defaultValues: { name: '', slug: '' },
  });

  useEffect(() => {
    if (org) {
      form.reset({ name: org.name, slug: org.slug });
    }
  }, [org, form]);

  async function onSubmit(values: OrgSettingsValues) {
    const result = await authClient.organization.update({
      organizationId: orgId,
      data: { name: values.name, slug: values.slug },
    });
    if (result.error) {
      toast({ title: 'Update failed', description: result.error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Organisation updated' });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organisation settings</h1>
        <p className="text-sm text-muted-foreground">Manage your organisation details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Update your organisation name and URL slug.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">Organisation name</Label>
              <Input id="org-name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-slug">Slug</Label>
              <div className="flex items-center rounded-md border">
                <span className="border-r bg-muted px-3 py-2 text-sm text-muted-foreground">
                  wa-kijo.app/
                </span>
                <Input
                  id="org-slug"
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  {...form.register('slug')}
                />
              </div>
              {form.formState.errors.slug && (
                <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
              )}
            </div>

            <Can do="org:update">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
            </Can>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <Can do="org:delete">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>
              Permanently delete this organisation and all its data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" disabled>
              Delete organisation
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Contact support to delete an organisation. This action is irreversible.
            </p>
          </CardContent>
        </Card>
      </Can>
    </div>
  );
}
