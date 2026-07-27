-- Vízegység-áttekintés (Tavak és telelők): új tó-típusok + opcionális műszaki adatok.
-- Visszafelé kompatibilis:
--   * az ENUM csak BŐVÜL (a meglévő 'TO'/'TELELO' értékek változatlanok),
--   * az új oszlopok mind NULLABLE (a meglévő sorok érvényesek maradnak).
-- FIGYELEM: nincs automatikusan alkalmazva. Csak NEM-production adatbázison
-- futtasd először (`prisma migrate deploy`), és csak utána productionben.

-- AlterEnum: ToTipus bővítése (MySQL-ben az ENUM oszlop újradefiniálásával)
ALTER TABLE `toak`
    MODIFY COLUMN `tipus` ENUM('TO', 'TELELO', 'IVADEKNEVELO', 'KELTETO_MEDENCE') NOT NULL DEFAULT 'TO';

-- AlterTable: opcionális műszaki adatok
ALTER TABLE `toak` ADD COLUMN `teruletHa` DECIMAL(8, 2) NULL;
ALTER TABLE `toak` ADD COLUMN `atlagMelysegMeter` DECIMAL(5, 2) NULL;
ALTER TABLE `toak` ADD COLUMN `kapacitasKg` DECIMAL(10, 2) NULL;
