-- Halászati napló 2.0 — visszafelé kompatibilis bővítés.
--   * EsemenyTipus ENUM csak BŐVÜL (a meglévő értékek változatlanok),
--   * minden új oszlop NULLABLE (a régi sorok érvényesek maradnak),
--   * a toId nullable lesz (tóhoz nem kötött események, pl. takarmány-bevétel),
--   * AUDIT-DÖNTÉS: a tó törlése többé nem törli a naplót (Cascade -> SET NULL).
-- FIGYELEM: nincs automatikusan alkalmazva. Először a biztonságos TESZT-DB-n
-- futtasd (`prisma migrate deploy`), és csak utána productionben.

-- 1) ENUM bővítés (MySQL: az oszlop újradefiniálásával)
ALTER TABLE `naplo_esemenyek`
    MODIFY COLUMN `tipus` ENUM(
        'TELEPITES', 'KIVETEL', 'ETETES',
        'ATTELEPITES',
        'TAKARMANY_BEVETEL', 'TAKARMANY_FELHASZNALAS', 'TAKARMANY_KORREKCIO',
        'VIZMINOSEG_MERES', 'ELHULLAS', 'MADARKAR', 'HALKELTES',
        'FELADAT', 'HIBABEJELENTES', 'RIASZTAS', 'EGYEB'
    ) NOT NULL;

-- 2) toId nullable + a törlési viselkedés Cascade -> SET NULL (audit megmarad)
--    (Ha a DROP FOREIGN KEY névhibával elszállna, ellenőrizd:
--     SHOW CREATE TABLE naplo_esemenyek; — és használd az ottani FK-nevet.)
ALTER TABLE `naplo_esemenyek` DROP FOREIGN KEY `naplo_esemenyek_toId_fkey`;
ALTER TABLE `naplo_esemenyek` MODIFY COLUMN `toId` INTEGER NULL;
ALTER TABLE `naplo_esemenyek` ADD CONSTRAINT `naplo_esemenyek_toId_fkey`
    FOREIGN KEY (`toId`) REFERENCES `toak`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 3) Új, nullable oszlopok
ALTER TABLE `naplo_esemenyek` ADD COLUMN `halaszatId` INTEGER NULL;
ALTER TABLE `naplo_esemenyek` ADD COLUMN `cim` VARCHAR(200) NULL;
ALTER TABLE `naplo_esemenyek` ADD COLUMN `reszletekJson` JSON NULL;
ALTER TABLE `naplo_esemenyek` ADD COLUMN `kapcsolodoEntitasTipus` VARCHAR(40) NULL;
ALTER TABLE `naplo_esemenyek` ADD COLUMN `kapcsolodoEntitasId` INTEGER NULL;
ALTER TABLE `naplo_esemenyek` ADD COLUMN `ervenyes` BOOLEAN NOT NULL DEFAULT true;

-- 4) Index + FK a tenant-kötéshez
ALTER TABLE `naplo_esemenyek` ADD INDEX `naplo_esemenyek_halaszatId_datum_idx`(`halaszatId`, `datum`);
ALTER TABLE `naplo_esemenyek` ADD CONSTRAINT `naplo_esemenyek_halaszatId_fkey`
    FOREIGN KEY (`halaszatId`) REFERENCES `halaszatok`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) Backfill: a meglévő (tóhoz kötött) események tenant-kötése a tóból.
--    Determinista, csak a NULL halaszatId-ket tölti; adatvesztés nincs.
UPDATE `naplo_esemenyek` ne
JOIN `toak` t ON ne.`toId` = t.`azonosito`
SET ne.`halaszatId` = t.`halaszatId`
WHERE ne.`halaszatId` IS NULL;
