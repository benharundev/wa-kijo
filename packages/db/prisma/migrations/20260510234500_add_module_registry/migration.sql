-- CreateTable
CREATE TABLE "module" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "manifestJson" JSONB NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_module" (
    "organizationId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "configJson" JSONB,
    "enabledAt" TIMESTAMP(3),
    "enabledBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_module_pkey" PRIMARY KEY ("organizationId","moduleId")
);

-- CreateIndex
CREATE UNIQUE INDEX "module_slug_key" ON "module"("slug");

-- CreateIndex
CREATE INDEX "module_status_idx" ON "module"("status");

-- CreateIndex
CREATE INDEX "tenant_module_organizationId_idx" ON "tenant_module"("organizationId");

-- CreateIndex
CREATE INDEX "tenant_module_moduleId_idx" ON "tenant_module"("moduleId");

-- AddForeignKey
ALTER TABLE "tenant_module" ADD CONSTRAINT "tenant_module_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_module" ADD CONSTRAINT "tenant_module_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
