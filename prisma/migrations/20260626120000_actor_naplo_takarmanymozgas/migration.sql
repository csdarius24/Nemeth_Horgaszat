-- Actor / audit strengthening (Sprint 1): who recorded the event / feed movement.
-- Backward compatible: nullable columns, indexes, foreign keys with ON DELETE SET NULL.
-- NOTE: not applied automatically. Apply with `prisma migrate deploy` against a
-- non-production database only.

-- AlterTable: NaploEsemeny -> actor
ALTER TABLE `naplo_esemenyek` ADD COLUMN `felhasznaloId` INTEGER NULL;

-- AlterTable: TakarmanyMozgas -> actor
ALTER TABLE `takarmany_mozgasok` ADD COLUMN `felhasznaloId` INTEGER NULL;

-- CreateIndex
ALTER TABLE `naplo_esemenyek` ADD INDEX `naplo_esemenyek_felhasznaloId_idx`(`felhasznaloId`);
ALTER TABLE `takarmany_mozgasok` ADD INDEX `takarmany_mozgasok_felhasznaloId_idx`(`felhasznaloId`);

-- AddForeignKey (ON DELETE SET NULL: felhasználó törlésekor az esemény/mozgás megmarad)
ALTER TABLE `naplo_esemenyek` ADD CONSTRAINT `naplo_esemenyek_felhasznaloId_fkey`
    FOREIGN KEY (`felhasznaloId`) REFERENCES `felhasznalok`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `takarmany_mozgasok` ADD CONSTRAINT `takarmany_mozgasok_felhasznaloId_fkey`
    FOREIGN KEY (`felhasznaloId`) REFERENCES `felhasznalok`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;
