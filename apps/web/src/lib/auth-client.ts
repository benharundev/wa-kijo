import { createAuthClient } from 'better-auth/react';
import { organizationClient, magicLinkClient } from 'better-auth/client/plugins';
import type { Role } from '@wa-kijo/shared';

/**
 * Better Auth React client.
 *
 * All auth actions (signIn, signUp, signOut, session reads) go through this
 * client. It sends requests to the NestJS API at NEXT_PUBLIC_API_BASE_URL
 * with credentials: 'include' so session cookies are forwarded automatically.
 *
 * Organization methods are available via authClient.organization.*
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  plugins: [organizationClient(), magicLinkClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

/**
 * Shape of the active member returned by the organization plugin.
 * The `role` field maps to our RBAC Role type.
 */
export interface ActiveMember {
  id: string;
  role: Role;
  userId: string;
  organizationId: string;
  createdAt: Date;
}

/**
 * Extended session type with org-specific fields populated by the
 * Better Auth organization plugin.
 */
export interface SessionWithOrg {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    image?: string | null;
  };
  session: {
    id: string;
    token: string;
    expiresAt: Date;
    activeOrganizationId?: string | null;
  };
}
