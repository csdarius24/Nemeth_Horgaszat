-- Link feeding (Etetes) to feed inventory (Takarmany) for automatic stock deduction.
-- All new foreign keys are nullable so existing rows remain valid.

-- AlterTable: Etetes optionally references Takarmany
ALTER TABLE `etetesek` ADD COLUMN `takarmanyId` INTEGER NULL;

-- AlterTable: TakarmanyMozgas optionally references the pond (To) and the Etetes record
ALTER TABLE `takarmany_mozgasok` ADD COLUMN `toId` INTEGER NULL;
ALTER TABLE `takarmany_mozgasok` ADD COLUMN `etetesId` INTEGER NULL;

-- CreateIndex
ALTER TABLE `etetesek` ADD INDEX `etetesek_takarmanyId_idx`(`takarmanyId`);
ALTER TABLE `takarmany_mozgasok` ADD INDEX `takarmany_mozgasok_toId_idx`(`toId`);
ALTER TABLE `takarmany_mozgasok` ADD INDEX `takarmany_mozgasok_etetesId_idx`(`etetesId`);

-- AddForeignKey
ALTER TABLE `etetesek` ADD CONSTRAINT `etetesek_takarmanyId_fkey`
    FOREIGN KEY (`takarmanyId`) REFERENCES `takarmanyok`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `takarmany_mozgasok` ADD CONSTRAINT `takarmany_mozgasok_toId_fkey`
    FOREIGN KEY (`toId`) REFERENCES `toak`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `takarmany_mozgasok` ADD CONSTRAINT `takarmany_mozgasok_etetesId_fkey`
    FOREIGN KEY (`etetesId`) REFERENCES `etetesek`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;
