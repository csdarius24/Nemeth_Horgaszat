-- Madárkár-nyilvántartás: események + fényképek. Tisztán additív (2 új tábla).
-- CreateTable
CREATE TABLE `madarkar_esemenyek` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `halaszatId` INTEGER NOT NULL,
    `toId` INTEGER NOT NULL,
    `datum` DATETIME(3) NOT NULL,
    `madarfaj` VARCHAR(100) NOT NULL,
    `egyedszam` INTEGER NULL,
    `halvesztesegKg` DECIMAL(10, 2) NULL,
    `karFt` INTEGER NULL,
    `megjegyzes` TEXT NULL,
    `rogzitoFelhasznaloId` INTEGER NULL,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `frissitve` DATETIME(3) NOT NULL,

    INDEX `madarkar_esemenyek_halaszatId_datum_idx`(`halaszatId`, `datum`),
    INDEX `madarkar_esemenyek_toId_datum_idx`(`toId`, `datum`),
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `madarkar_fotok` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `esemenyId` INTEGER NOT NULL,
    `mime` VARCHAR(40) NOT NULL,
    `meretBajt` INTEGER NOT NULL,
    `szelesseg` INTEGER NULL,
    `magassag` INTEGER NULL,
    `adat` MEDIUMBLOB NOT NULL,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `madarkar_fotok_esemenyId_idx`(`esemenyId`),
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `madarkar_esemenyek` ADD CONSTRAINT `madarkar_esemenyek_halaszatId_fkey` FOREIGN KEY (`halaszatId`) REFERENCES `halaszatok`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `madarkar_esemenyek` ADD CONSTRAINT `madarkar_esemenyek_toId_fkey` FOREIGN KEY (`toId`) REFERENCES `toak`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `madarkar_esemenyek` ADD CONSTRAINT `madarkar_esemenyek_rogzitoFelhasznaloId_fkey` FOREIGN KEY (`rogzitoFelhasznaloId`) REFERENCES `felhasznalok`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `madarkar_fotok` ADD CONSTRAINT `madarkar_fotok_esemenyId_fkey` FOREIGN KEY (`esemenyId`) REFERENCES `madarkar_esemenyek`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;

