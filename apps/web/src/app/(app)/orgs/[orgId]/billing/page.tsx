import { CreditCard } from 'lucide-react';
import { Can } from '@/components/can';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Billing portal stub — Phase 5 will wire up Stripe / Billplz.
 * Shows the current plan and a CTA to manage billing.
 */
export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription and payment method.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current plan</CardTitle>
            <Badge variant="secondary">Free</Badge>
          </div>
          <CardDescription>
            You are on the free tier. Upgrade to unlock more members, integrations, and support.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            No payment method on file.
          </div>

          <Can do="billing:manage">
            <Button disabled>
              Upgrade plan
              <Badge variant="outline" className="ml-2 text-xs">
                Coming in Phase 5
              </Badge>
            </Button>
          </Can>
        </CardContent>
      </Card>
    </div>
  );
}
