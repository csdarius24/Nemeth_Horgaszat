-- Halászati napló: bejegyzés javítása / érvénytelenítése (audit-flow).
-- AUDIT-ELV: a naplósor SOSEM törlődik fizikailag — az érvénytelenítés csak
-- megjelöli (ervenyes = false), és rögzíti, hogy ki / mikor / miért tette.
-- Visszafelé kompatibilis: minden új oszlop NULLABLE (az `ervenyes` már létezik).
-- FIGYELEM: nincs automatikusan alkalmazva. Először a biztonságos TESZT-DB-n
-- futtasd (`prisma migrate deploy`), és csak utána productionben.

-- AlterTable: érvénytelenítés nyoma
ALTER TABLE `naplo_esemenyek` ADD COLUMN `ervenytelenitveAt` DATETIME(3) NULL;
ALTER TABLE `naplo_esemenyek` ADD COLUMN `ervenytelenitesOka` VARCHAR(300) NULL;
ALTER TABLE `naplo_esemenyek` ADD COLUMN `ervenytelenitoFelhasznaloId` INTEGER NULL;

-- AlterTable: szövegjavítás nyoma
ALTER TABLE `naplo_esemenyek` ADD COLUMN `szerkesztveAt` DATETIME(3) NULL;
ALTER TABLE `naplo_esemenyek` ADD COLUMN `szerkesztoFelhasznaloId` INTEGER NULL;

-- CreateIndex
ALTER TABLE `naplo_esemenyek` ADD INDEX `naplo_esemenyek_ervenytelenitoFelhasznaloId_idx`(`ervenytelenitoFelhasznaloId`);
ALTER TABLE `naplo_esemenyek` ADD INDEX `naplo_esemenyek_szerkesztoFelhasznaloId_idx`(`szerkesztoFelhasznaloId`);

-- AddForeignKey (SET NULL: a felhasználó törlése nem törli a naplót)
ALTER TABLE `naplo_esemenyek` ADD CONSTRAINT `naplo_esemenyek_ervenytelenitoFelhasznaloId_fkey`
    FOREIGN KEY (`ervenytelenitoFelhasznaloId`) REFERENCES `felhasznalok`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `naplo_esemenyek` ADD CONSTRAINT `naplo_esemenyek_szerkesztoFelhasznaloId_fkey`
    FOREIGN KEY (`szerkesztoFelhasznaloId`) REFERENCES `felhasznalok`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;
