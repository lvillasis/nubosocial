/*
  Warnings:

  - You are about to drop the column `existe` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "existe",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
