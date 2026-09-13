-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('submitter', 'secretary', 'deputy', 'director', 'admin', 'monitor');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('finance', 'personnel', 'general');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('running', 'returned', 'done');

-- CreateEnum
CREATE TYPE "StageKey" AS ENUM ('submitter', 'secretary', 'deputy', 'director', 'recording', 'done');

-- CreateEnum
CREATE TYPE "TrailKind" AS ENUM ('submit', 'approve', 'return');

-- CreateEnum
CREATE TYPE "Cluster" AS ENUM ('HCRC', 'MedTech', 'StemCell', 'DrugDevelopment');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('primary', 'supporting');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('pending', 'ready');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RoleType" NOT NULL,
    "position" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "category" "Category",
    "cluster" "Cluster",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "requesterId" TEXT NOT NULL,
    "assignedSecretaryId" TEXT NOT NULL,
    "cluster" "Cluster" NOT NULL,
    "category" "Category" NOT NULL,
    "stageKey" "StageKey" NOT NULL,
    "status" "SubmissionStatus" NOT NULL,
    "stageEnteredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT,
    "kind" "DocumentKind" NOT NULL,
    "lineageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'pending',
    "uploadedById" TEXT NOT NULL,
    "historyEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoryEntry" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorPosition" TEXT NOT NULL,
    "kind" "TrailKind" NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "fromStage" "StageKey" NOT NULL,
    "toStage" "StageKey" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "historyEntryId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "doneById" TEXT,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageRule" (
    "stageKey" "StageKey" NOT NULL,
    "slaDays" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT NOT NULL,

    CONSTRAINT "StageRule_pkey" PRIMARY KEY ("stageKey")
);

-- CreateTable
CREATE TABLE "CategoryRoute" (
    "category" "Category" NOT NULL,
    "secretaryId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT NOT NULL,

    CONSTRAINT "CategoryRoute_pkey" PRIMARY KEY ("category")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ip" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeCounter" (
    "prefix" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL,

    CONSTRAINT "CodeCounter_pkey" PRIMARY KEY ("prefix","period")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_code_key" ON "Submission"("code");

-- CreateIndex
CREATE INDEX "Submission_assignedSecretaryId_status_idx" ON "Submission"("assignedSecretaryId", "status");

-- CreateIndex
CREATE INDEX "Submission_cluster_status_idx" ON "Submission"("cluster", "status");

-- CreateIndex
CREATE INDEX "Submission_requesterId_status_idx" ON "Submission"("requesterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE INDEX "Document_submissionId_kind_isCurrent_idx" ON "Document"("submissionId", "kind", "isCurrent");

-- CreateIndex
CREATE INDEX "Document_status_createdAt_idx" ON "Document"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Document_lineageId_version_key" ON "Document"("lineageId", "version");

-- CreateIndex
CREATE INDEX "HistoryEntry_submissionId_createdAt_idx" ON "HistoryEntry"("submissionId", "createdAt");

-- CreateIndex
CREATE INDEX "ChecklistItem_submissionId_done_idx" ON "ChecklistItem"("submissionId", "done");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assignedSecretaryId_fkey" FOREIGN KEY ("assignedSecretaryId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_historyEntryId_fkey" FOREIGN KEY ("historyEntryId") REFERENCES "HistoryEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryEntry" ADD CONSTRAINT "HistoryEntry_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryEntry" ADD CONSTRAINT "HistoryEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_historyEntryId_fkey" FOREIGN KEY ("historyEntryId") REFERENCES "HistoryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageRule" ADD CONSTRAINT "StageRule_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRoute" ADD CONSTRAINT "CategoryRoute_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
