-- CreateTable
CREATE TABLE `toak` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `nev` VARCHAR(191) NOT NULL,
    `aktiv` BOOLEAN NOT NULL DEFAULT true,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `frissitve` DATETIME(3) NOT NULL,

    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `halfajok` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `nev` VARCHAR(191) NOT NULL,
    `aktiv` BOOLEAN NOT NULL DEFAULT true,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `frissitve` DATETIME(3) NOT NULL,

    UNIQUE INDEX `halfajok_nev_key`(`nev`),
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hal_allomany` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `toId` INTEGER NOT NULL,
    `halfajId` INTEGER NOT NULL,
    `darab` INTEGER NOT NULL DEFAULT 0,
    `minTomegKg` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `maxTomegKg` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `frissitve` DATETIME(3) NOT NULL,

    INDEX `hal_allomany_toId_idx`(`toId`),
    INDEX `hal_allomany_halfajId_idx`(`halfajId`),
    UNIQUE INDEX `hal_allomany_toId_halfajId_key`(`toId`, `halfajId`),
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `telepitesek` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `toId` INTEGER NOT NULL,
    `halfajId` INTEGER NOT NULL,
    `darab` INTEGER NOT NULL,
    `minTomegKg` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `maxTomegKg` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `forras` VARCHAR(255) NULL,
    `datum` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `megjegyzes` TEXT NULL,

    INDEX `telepitesek_toId_datum_idx`(`toId`, `datum`),
    INDEX `telepitesek_halfajId_datum_idx`(`halfajId`, `datum`),
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kivetelek` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `toId` INTEGER NOT NULL,
    `halfajId` INTEGER NOT NULL,
    `darab` INTEGER NOT NULL,
    `ok` VARCHAR(120) NULL,
    `datum` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `megjegyzes` TEXT NULL,

    INDEX `kivetelek_toId_datum_idx`(`toId`, `datum`),
    INDEX `kivetelek_halfajId_datum_idx`(`halfajId`, `datum`),
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `etetesek` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `toId` INTEGER NOT NULL,
    `mennyisegKg` DECIMAL(8, 2) NOT NULL,
    `tipus` VARCHAR(120) NULL,
    `datum` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `megjegyzes` TEXT NULL,

    INDEX `etetesek_toId_datum_idx`(`toId`, `datum`),
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `naplo_esemenyek` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `tipus` ENUM('TELEPITES', 'KIVETEL', 'ETETES') NOT NULL,
    `toId` INTEGER NOT NULL,
    `halfajId` INTEGER NULL,
    `darab` INTEGER NULL,
    `mennyisegKg` DECIMAL(8, 2) NULL,
    `datum` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `leiras` TEXT NULL,

    INDEX `naplo_esemenyek_toId_datum_idx`(`toId`, `datum`),
    INDEX `naplo_esemenyek_tipus_datum_idx`(`tipus`, `datum`),
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `hal_allomany` ADD CONSTRAINT `hal_allomany_toId_fkey` FOREIGN KEY (`toId`) REFERENCES `toak`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hal_allomany` ADD CONSTRAINT `hal_allomany_halfajId_fkey` FOREIGN KEY (`halfajId`) REFERENCES `halfajok`(`azonosito`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `telepitesek` ADD CONSTRAINT `telepitesek_toId_fkey` FOREIGN KEY (`toId`) REFERENCES `toak`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `telepitesek` ADD CONSTRAINT `telepitesek_halfajId_fkey` FOREIGN KEY (`halfajId`) REFERENCES `halfajok`(`azonosito`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kivetelek` ADD CONSTRAINT `kivetelek_toId_fkey` FOREIGN KEY (`toId`) REFERENCES `toak`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kivetelek` ADD CONSTRAINT `kivetelek_halfajId_fkey` FOREIGN KEY (`halfajId`) REFERENCES `halfajok`(`azonosito`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `etetesek` ADD CONSTRAINT `etetesek_toId_fkey` FOREIGN KEY (`toId`) REFERENCES `toak`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `naplo_esemenyek` ADD CONSTRAINT `naplo_esemenyek_toId_fkey` FOREIGN KEY (`toId`) REFERENCES `toak`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `naplo_esemenyek` ADD CONSTRAINT `naplo_esemenyek_halfajId_fkey` FOREIGN KEY (`halfajId`) REFERENCES `halfajok`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;
