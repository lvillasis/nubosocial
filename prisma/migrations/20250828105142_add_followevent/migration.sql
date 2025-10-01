/*
  Warnings:

  - You are about to drop the `follow_events` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "follow_events";

-- CreateTable
CREATE TABLE "FollowEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowEvent_userId_createdAt_idx" ON "FollowEvent"("userId", "createdAt");
