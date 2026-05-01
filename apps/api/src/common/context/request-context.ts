export interface RequestContext {
  userId: string;
  orgId: string;
  orgType: 'AGENCY' | 'WORKSPACE' | 'SYSTEM';
  userRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  globalRole: 'USER' | 'SUPERADMIN';
  requestId: string;
}
