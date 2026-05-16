import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Notification preferences — UI placeholder.
 * The notification settings API is planned for Phase 5.
 */
export default function NotificationsPage() {
  const preferences = [
    { label: 'New member joins', description: 'When someone accepts an invitation to your org.' },
    { label: 'Invitation accepted', description: 'When an invitation you sent is accepted.' },
    { label: 'Billing updates', description: 'Receipts, plan changes, and payment failures.' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Control which emails and alerts you receive.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Email notifications</CardTitle>
            <Badge variant="outline" className="text-xs">
              Coming in Phase 5
            </Badge>
          </div>
          <CardDescription>Notification preferences will be configurable here.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {preferences.map((pref) => (
              <li
                key={pref.label}
                className="flex items-center justify-between rounded-md border p-3 opacity-50"
              >
                <div>
                  <p className="text-sm font-medium">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">{pref.description}</p>
                </div>
                <span className="text-xs text-muted-foreground">Enabled</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
