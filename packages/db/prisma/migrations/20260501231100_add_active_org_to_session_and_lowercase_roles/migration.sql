-- AlterTable
ALTER TABLE "invitation" ALTER COLUMN "role" SET DEFAULT 'member',
ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "member" ALTER COLUMN "role" SET DEFAULT 'member';

-- AlterTable
ALTER TABLE "session" ADD COLUMN     "activeOrganizationId" TEXT;
