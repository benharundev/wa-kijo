import { Inject, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'http';
import { BETTER_AUTH, type BetterAuthInstance } from './better-auth.token';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestContext, GlobalRole } from '../common/context/request-context';
import { highestRole, type Role } from '@wa-kijo/shared';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  /**
   * Lazily loaded on module init — better-auth/node is ESM-only and must be
   * loaded via dynamic import() rather than static require().
   */
  private fromNodeHeaders!: (headers: IncomingHttpHeaders) => Headers;

  constructor(
    @Inject(BETTER_AUTH) private readonly auth: BetterAuthInstance,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    // ESM interop: SWC transforms import() to require() in CJS builds.
    // new Function() is opaque to the transformer and preserves real import().
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const mod = await new Function('s', 'return import(s)')('better-auth/node');
    this.fromNodeHeaders = mod.fromNodeHeaders;
  }

  /**
   * Resolves the full RequestContext from raw request headers.
   * Returns null if the session is missing or expired.
   *
   * DB cost per request: 1 session lookup (Better Auth) + 1 member lookup.
   * Cached in Better Auth's cookie cache (5 min TTL) to reduce DB reads.
   */
  async resolveContext(
    headers: IncomingHttpHeaders,
    requestId: string,
  ): Promise<RequestContext | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session: any = await this.auth.api.getSession({
      headers: this.fromNodeHeaders(headers),
    });

    if (!session) return null;

    const activeOrgId: string | null = session.session.activeOrganizationId ?? null;

    if (!activeOrgId) {
      // Session exists but no active org — valid for unauthenticated-but-logged-in
      // state (e.g., org selection screen). Guards on org-scoped endpoints will
      // reject this via PermissionGuard when orgId is empty.
      return {
        userId: session.user.id as string,
        orgId: '',
        orgType: 'WORKSPACE',
        userRole: 'member',
        globalRole: ((session.user.role as string | undefined) ?? 'user') as GlobalRole,
        requestId,
      };
    }

    // Fetch the member record to get the user's role in the active org
    const member = await this.prisma.member.findFirst({
      where: { userId: session.user.id, organizationId: activeOrgId },
    });

    // Fetch org to get orgType
    // EXEMPT: system query — reads across soft-delete boundary intentionally,
    // but PrismaService middleware still filters deletedAt: null on Organization.
    const org = await this.prisma.organization.findFirst({
      where: { id: activeOrgId },
    });

    if (!org) {
      this.logger.warn(
        { userId: session.user.id, activeOrgId },
        'Active org not found — clearing from context',
      );
      return null;
    }

    const directRole = (member?.role ?? 'member') as Role;
    const effectiveRole = await this.resolveEffectiveRole(
      session.user.id as string,
      activeOrgId,
      org.parentOrgId ?? null,
      directRole,
    );

    return {
      userId: session.user.id as string,
      orgId: activeOrgId,
      orgType: (org.orgType as RequestContext['orgType']) ?? 'WORKSPACE',
      userRole: effectiveRole,
      globalRole: ((session.user.role as string | undefined) ?? 'user') as GlobalRole,
      requestId,
    };
  }

  /**
   * Resolves the effective role for a user in an org by walking up the
   * parent hierarchy (max depth 3). A user who is OWNER of a parent AGENCY
   * inherits that role as the effective role in all child WORKSPACEs.
   *
   * The effective role is the highest role across the org and all ancestors.
   */
  private async resolveEffectiveRole(
    userId: string,
    orgId: string,
    parentOrgId: string | null,
    directRole: Role,
    depth = 0,
  ): Promise<Role> {
    // Safety cap — hierarchy should not exceed 3 levels
    if (!parentOrgId || depth >= 3) return directRole;

    const parentMember = await this.prisma.member.findFirst({
      where: { userId, organizationId: parentOrgId },
      select: { role: true },
    });

    if (!parentMember) return directRole;

    const parentRole = parentMember.role as Role;
    const resolvedSoFar = highestRole(directRole, parentRole);

    // Walk further up
    const grandparent: { parentOrgId: string | null } | null =
      await this.prisma.organization.findFirst({
        where: { id: parentOrgId },
        select: { parentOrgId: true },
      });

    return this.resolveEffectiveRole(
      userId,
      parentOrgId,
      grandparent?.parentOrgId ?? null,
      resolvedSoFar,
      depth + 1,
    );
  }

  /**
   * Returns the org and all its ancestors (root first).
   * Used for breadcrumb rendering and hierarchical permission checks.
   * Max depth 3 — throws if exceeded (data integrity violation).
   */
  async getOrgAncestors(
    orgId: string,
  ): Promise<Array<{ id: string; name: string; orgType: string }>> {
    const ancestors: Array<{ id: string; name: string; orgType: string }> = [];
    let currentId: string | null = orgId;

    for (let i = 0; i < 4; i++) {
      if (!currentId) break;

      const org: { id: string; name: string; orgType: string; parentOrgId: string | null } | null =
        await this.prisma.organization.findFirst({
          where: { id: currentId },
          select: { id: true, name: true, orgType: true, parentOrgId: true },
        });

      if (!org) break;
      ancestors.unshift({ id: org.id, name: org.name, orgType: org.orgType });
      currentId = org.parentOrgId;

      if (i === 3 && currentId) {
        throw new NotFoundException(`Org hierarchy depth exceeded for org ${orgId}`);
      }
    }

    return ancestors;
  }
}
