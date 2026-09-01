-- Halkeltetés MVP (Sprint 1): kézi keltetési ciklus rögzítése.
-- Tisztán ADDITÍV: csak új táblák jönnek létre, meglévő adat nem változik.
-- Minden gyerek-tábla halaszatId-n vagy ciklusId-n keresztül tenant-izolált.
-- FIGYELEM: nincs automatikusan alkalmazva. Először a biztonságos TESZT-DB-n
-- futtasd (`prisma migrate deploy`), és csak utána productionben.

-- CreateTable: protokollok (előbb, mert a ciklus hivatkozik rá)
CREATE TABLE `halkeltetes_protokollok` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `halaszatId` INTEGER NOT NULL,
    `halfajId` INTEGER NULL,
    `nev` VARCHAR(160) NOT NULL,
    `ikrasEloadagMgPerKg` DECIMAL(8, 3) NOT NULL DEFAULT 0.000,
    `ikrasDontoMgPerKg` DECIMAL(8, 3) NOT NULL DEFAULT 0.000,
    `ikrasMlPerKg` DECIMAL(8, 3) NOT NULL DEFAULT 0.000,
    `tejesMgPerKg` DECIMAL(8, 3) NOT NULL DEFAULT 0.000,
    `tejesMlPerKg` DECIMAL(8, 3) NOT NULL DEFAULT 0.000,
    `rahagyasSzorzo` DECIMAL(4, 2) NOT NULL DEFAULT 1.10,
    `aktiv` BOOLEAN NOT NULL DEFAULT true,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `frissitve` DATETIME(3) NOT NULL,
    PRIMARY KEY (`azonosito`),
    INDEX `halkeltetes_protokollok_halaszatId_aktiv_idx`(`halaszatId`, `aktiv`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: ciklusok
CREATE TABLE `halkeltetes_ciklusok` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `halaszatId` INTEGER NOT NULL,
    `halfajId` INTEGER NULL,
    `protokollId` INTEGER NULL,
    `nev` VARCHAR(160) NULL,
    `datum` DATETIME(3) NOT NULL,
    `oltasIdopont` DATETIME(3) NULL,
    `homersekletC` DECIMAL(4, 1) NULL,
    `statusz` ENUM('TERVEZET', 'FOLYAMATBAN', 'LEZARVA') NOT NULL DEFAULT 'TERVEZET',
    `megjegyzes` TEXT NULL,
    `ikrasEloadagMgPerKg` DECIMAL(8, 3) NULL,
    `ikrasDontoMgPerKg` DECIMAL(8, 3) NULL,
    `ikrasMlPerKg` DECIMAL(8, 3) NULL,
    `tejesMgPerKg` DECIMAL(8, 3) NULL,
    `tejesMlPerKg` DECIMAL(8, 3) NULL,
    `rahagyasSzorzo` DECIMAL(4, 2) NULL,
    `rogzitoFelhasznaloId` INTEGER NULL,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `frissitve` DATETIME(3) NOT NULL,
    PRIMARY KEY (`azonosito`),
    INDEX `halkeltetes_ciklusok_halaszatId_datum_idx`(`halaszatId`, `datum`),
    INDEX `halkeltetes_ciklusok_halfajId_idx`(`halfajId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: halak (ciklus sorai)
CREATE TABLE `halkeltetes_halak` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `ciklusId` INTEGER NOT NULL,
    `ivar` ENUM('IKRAS', 'TEJES') NOT NULL,
    `sorszam` INTEGER NULL,
    `chipAzonosito` VARCHAR(80) NULL,
    `fajtaJeloles` VARCHAR(120) NULL,
    `tomegKg` DECIMAL(7, 2) NULL,
    `ikraKg` DECIMAL(7, 2) NULL,
    `tejMl` DECIMAL(8, 2) NULL,
    `megjegyzes` TEXT NULL,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `frissitve` DATETIME(3) NOT NULL,
    PRIMARY KEY (`azonosito`),
    INDEX `halkeltetes_halak_ciklusId_ivar_idx`(`ciklusId`, `ivar`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `halkeltetes_protokollok` ADD CONSTRAINT `halkeltetes_protokollok_halaszatId_fkey`
    FOREIGN KEY (`halaszatId`) REFERENCES `halaszatok`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `halkeltetes_protokollok` ADD CONSTRAINT `halkeltetes_protokollok_halfajId_fkey`
    FOREIGN KEY (`halfajId`) REFERENCES `halfajok`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `halkeltetes_ciklusok` ADD CONSTRAINT `halkeltetes_ciklusok_halaszatId_fkey`
    FOREIGN KEY (`halaszatId`) REFERENCES `halaszatok`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `halkeltetes_ciklusok` ADD CONSTRAINT `halkeltetes_ciklusok_halfajId_fkey`
    FOREIGN KEY (`halfajId`) REFERENCES `halfajok`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `halkeltetes_ciklusok` ADD CONSTRAINT `halkeltetes_ciklusok_protokollId_fkey`
    FOREIGN KEY (`protokollId`) REFERENCES `halkeltetes_protokollok`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `halkeltetes_ciklusok` ADD CONSTRAINT `halkeltetes_ciklusok_rogzitoFelhasznaloId_fkey`
    FOREIGN KEY (`rogzitoFelhasznaloId`) REFERENCES `felhasznalok`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `halkeltetes_halak` ADD CONSTRAINT `halkeltetes_halak_ciklusId_fkey`
    FOREIGN KEY (`ciklusId`) REFERENCES `halkeltetes_ciklusok`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;
