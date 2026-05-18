-- CreateTable
CREATE TABLE "PrivatePageCredential" (
    "id" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL DEFAULT 'partner-access',
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivatePageCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivatePageResource" (
    "id" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL DEFAULT 'partner-access',
    "title" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "ctaLabel" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivatePageResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivatePageCredentialResource" (
    "credentialId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivatePageCredentialResource_pkey" PRIMARY KEY ("credentialId","resourceId")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrivatePageCredential_pageKey_username_key" ON "PrivatePageCredential"("pageKey", "username");

-- AddForeignKey
ALTER TABLE "PrivatePageCredentialResource" ADD CONSTRAINT "PrivatePageCredentialResource_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "PrivatePageCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivatePageCredentialResource" ADD CONSTRAINT "PrivatePageCredentialResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "PrivatePageResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
