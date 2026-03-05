/*
  Warnings:

  - You are about to alter the column `nev` on the `halfajok` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(120)`.
  - A unique constraint covering the columns `[halaszatId,nev]` on the table `halfajok` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `halaszatId` to the `halfajok` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `halfajok_nev_key` ON `halfajok`;

-- AlterTable
ALTER TABLE `halfajok` ADD COLUMN `halaszatId` INTEGER NOT NULL,
    MODIFY `nev` VARCHAR(120) NOT NULL;

-- CreateIndex
CREATE INDEX `halfajok_halaszatId_aktiv_idx` ON `halfajok`(`halaszatId`, `aktiv`);

-- CreateIndex
CREATE UNIQUE INDEX `halfajok_halaszatId_nev_key` ON `halfajok`(`halaszatId`, `nev`);

-- AddForeignKey
ALTER TABLE `halfajok` ADD CONSTRAINT `halfajok_halaszatId_fkey` FOREIGN KEY (`halaszatId`) REFERENCES `halaszatok`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;
