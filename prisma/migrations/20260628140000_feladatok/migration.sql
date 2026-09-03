-- Feladatok modul (feladatkezelés / csapat-koordináció).
-- Tisztán ADDITÍV: egyetlen új tábla, meglévő adat nem változik.
-- Tenant-izolált a halaszatId-n keresztül; a tó/felelős/létrehozó SET NULL,
-- hogy a feladat megmaradjon a hivatkozott entitás törlése után is.
-- FIGYELEM: nincs automatikusan alkalmazva. Először a biztonságos TESZT-DB-n
-- futtasd (`prisma migrate deploy`), és csak utána productionben.

-- CreateTable
CREATE TABLE `feladatok` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `halaszatId` INTEGER NOT NULL,
    `toId` INTEGER NULL,
    `cim` VARCHAR(200) NOT NULL,
    `leiras` TEXT NULL,
    `statusz` ENUM('UJ', 'FOLYAMATBAN', 'KESZ', 'ELHALASZTVA', 'TOROLVE') NOT NULL DEFAULT 'UJ',
    `prioritas` ENUM('ALACSONY', 'NORMAL', 'MAGAS', 'SURGOS') NOT NULL DEFAULT 'NORMAL',
    `szin` VARCHAR(20) NULL,
    `hatarido` DATETIME(3) NULL,
    `felelosFelhasznaloId` INTEGER NULL,
    `letrehozoFelhasznaloId` INTEGER NULL,
    `elkeszultAt` DATETIME(3) NULL,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `frissitve` DATETIME(3) NOT NULL,
    PRIMARY KEY (`azonosito`),
    INDEX `feladatok_halaszatId_statusz_idx`(`halaszatId`, `statusz`),
    INDEX `feladatok_felelosFelhasznaloId_statusz_idx`(`felelosFelhasznaloId`, `statusz`),
    INDEX `feladatok_toId_idx`(`toId`),
    INDEX `feladatok_hatarido_idx`(`hatarido`),
    INDEX `feladatok_letrehozva_idx`(`letrehozva`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `feladatok` ADD CONSTRAINT `feladatok_halaszatId_fkey`
    FOREIGN KEY (`halaszatId`) REFERENCES `halaszatok`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `feladatok` ADD CONSTRAINT `feladatok_toId_fkey`
    FOREIGN KEY (`toId`) REFERENCES `toak`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `feladatok` ADD CONSTRAINT `feladatok_felelosFelhasznaloId_fkey`
    FOREIGN KEY (`felelosFelhasznaloId`) REFERENCES `felhasznalok`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `feladatok` ADD CONSTRAINT `feladatok_letrehozoFelhasznaloId_fkey`
    FOREIGN KEY (`letrehozoFelhasznaloId`) REFERENCES `felhasznalok`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;
