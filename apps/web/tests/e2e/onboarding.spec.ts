import { test, expect } from '@playwright/test';

/**
 * End-to-end onboarding flow.
 *
 * Prerequisites:
 *  - API running on NEXT_PUBLIC_API_BASE_URL (default http://localhost:3000)
 *  - Web running on WEB_BASE_URL (default http://localhost:3001)
 *  - Clean test database (unique email per run ensures isolation)
 *
 * Flow:
 *  1. Owner signs up
 *  2. Owner creates an organisation
 *  3. Owner invites a second user
 *  4. Second user signs up and accepts the invite
 *  5. Owner checks members list — expects 2 members
 */

const API_BASE = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3000';

function uniqueEmail(prefix: string): string {
  return `${prefix}+${Date.now()}@example.com`;
}

async function signUpViaApi(email: string, name: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password }),
  });
  if (!res.ok) throw new Error(`Sign-up failed: ${res.status}`);
}

async function verifyEmailViaApi(email: string) {
  // In test environments, Better Auth exposes a bypass endpoint.
  // If not available, this is a no-op and emailVerification.requireEmailVerification
  // should be set to false in the test env.
  const res = await fetch(`${API_BASE}/api/auth/verify-email-bypass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  // Non-fatal: bypass may not exist in all environments
  return res.ok;
}

test.describe('Onboarding flow', () => {
  test('sign up → create org → invite member → accept invite → see 2 members', async ({
    page,
    context,
  }) => {
    const ownerEmail = uniqueEmail('owner');
    const memberEmail = uniqueEmail('member');
    const password = 'Test1234!';

    // -----------------------------------------------------------------------
    // Step 1: Owner signs up via UI
    // -----------------------------------------------------------------------
    await page.goto('/sign-up');
    await page.getByLabel('Full name').fill('Owner User');
    await page.getByLabel('Email').fill(ownerEmail);
    await page.getByLabel('Password').first().fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    // After sign-up, Better Auth sends a verification email.
    // In test mode we bypass it via API.
    await verifyEmailViaApi(ownerEmail);

    // -----------------------------------------------------------------------
    // Step 2: Owner signs in
    // -----------------------------------------------------------------------
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(ownerEmail);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/dashboard');

    // -----------------------------------------------------------------------
    // Step 3: Owner creates an organisation
    // -----------------------------------------------------------------------
    await page.getByTestId('org-switcher').click();
    await page.getByRole('menuitem', { name: 'New organisation' }).click();
    await page.waitForURL('/onboarding/create-org');

    const orgName = `Test Org ${Date.now()}`;
    const orgSlug = `test-org-${Date.now()}`;
    await page.getByLabel('Organisation name').fill(orgName);
    await page.getByLabel('Slug').fill(orgSlug);
    await page.getByRole('button', { name: 'Create organisation' }).click();

    // Should redirect to the new org's members page
    await page.waitForURL(/\/orgs\/.+\/members/);
    await expect(page.getByTestId('members-page')).toBeVisible();

    // Extract orgId from the URL
    const orgId = page.url().split('/orgs/')[1]?.split('/')[0] ?? '';
    expect(orgId).toBeTruthy();

    // -----------------------------------------------------------------------
    // Step 4: Owner invites the second user
    // -----------------------------------------------------------------------
    await page.getByTestId('invite-button').click();
    await page.getByTestId('invite-email-input').fill(memberEmail);
    await page.getByRole('button', { name: 'Send invite' }).click();

    // Wait for success toast or modal close
    await expect(page.getByText('Invitation sent')).toBeVisible();

    // -----------------------------------------------------------------------
    // Step 5: Second user signs up and accepts the invite
    // -----------------------------------------------------------------------
    const memberContext = await context.browser()!.newContext();
    const memberPage = await memberContext.newPage();

    await memberPage.goto('/sign-up');
    await memberPage.getByLabel('Full name').fill('Member User');
    await memberPage.getByLabel('Email').fill(memberEmail);
    await memberPage.getByLabel('Password').first().fill(password);
    await memberPage.getByLabel('Confirm password').fill(password);
    await memberPage.getByRole('button', { name: 'Create account' }).click();

    await verifyEmailViaApi(memberEmail);

    await memberPage.goto('/sign-in');
    await memberPage.getByLabel('Email').fill(memberEmail);
    await memberPage.getByLabel('Password').fill(password);
    await memberPage.getByRole('button', { name: 'Sign in' }).click();
    await memberPage.waitForURL('/dashboard');

    // Accept the invitation via API (simulates clicking the email link)
    const acceptRes = await memberPage.evaluate(
      async ({ apiBase, email }) => {
        // Fetch pending invitation for this email
        const res = await fetch(`${apiBase}/api/auth/organization/get-invitation-by-email`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        return res.status;
      },
      { apiBase: API_BASE, email: memberEmail },
    );

    // If the endpoint doesn't exist, accept via the org invite accept endpoint directly.
    if (acceptRes !== 200) {
      // Navigate to the invites page and accept via UI (fallback)
      await memberPage.goto(`/orgs/${orgId}/invites`);
    }

    await memberPage.evaluate(
      async ({ apiBase, orgId: oId }) => {
        const listRes = await fetch(
          `${apiBase}/api/auth/organization/list-invitations?organizationId=${oId}`,
          { credentials: 'include' },
        );
        const { data } = (await listRes.json()) as { data: Array<{ id: string; email: string }> };
        const inv = data?.find((i) => i.email);
        if (inv) {
          await fetch(`${apiBase}/api/auth/organization/accept-invitation`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invitationId: inv.id }),
          });
        }
      },
      { apiBase: API_BASE, orgId },
    );

    await memberContext.close();

    // -----------------------------------------------------------------------
    // Step 6: Owner sees 2 members in the members list
    // -----------------------------------------------------------------------
    await page.goto(`/orgs/${orgId}/members`);
    await page.waitForSelector('[data-testid="members-list"]');

    const memberRows = page.getByTestId('member-row');
    await expect(memberRows).toHaveCount(2);
  });
});
