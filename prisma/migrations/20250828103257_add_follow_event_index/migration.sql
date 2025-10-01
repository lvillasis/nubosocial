/*
  Warnings:

  - You are about to drop the `FollowEvent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "FollowEvent";

-- CreateTable
CREATE TABLE "follow_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "follow_events_userId_createdAt_idx" ON "follow_events"("userId", "createdAt");
