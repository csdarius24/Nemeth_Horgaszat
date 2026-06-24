-- CreateEnum
ALTER TABLE `takarmanyok` ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `takarmanyok` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `halaszatId` INTEGER NOT NULL,
    `nev` VARCHAR(120) NOT NULL,
    `egyseg` VARCHAR(20) NOT NULL,
    `keszlet` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `szin` VARCHAR(20) NULL,
    `aktiv` BOOLEAN NOT NULL DEFAULT true,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `frissitve` DATETIME(3) NOT NULL,
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `takarmany_mozgasok` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `takarmanyId` INTEGER NOT NULL,
    `halaszatId` INTEGER NOT NULL,
    `tipus` ENUM('BEVETEL', 'FELHASZNALVA') NOT NULL,
    `mennyiseg` DECIMAL(10, 2) NOT NULL,
    `datum` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `megjegyzes` TEXT NULL,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddUniqueConstraint
ALTER TABLE `takarmanyok` ADD UNIQUE INDEX `takarmanyok_halaszatId_nev_key`(`halaszatId`, `nev`);
ALTER TABLE `takarmanyok` ADD INDEX `takarmanyok_halaszatId_aktiv_idx`(`halaszatId`, `aktiv`);
ALTER TABLE `takarmany_mozgasok` ADD INDEX `takarmany_mozgasok_takarmanyId_datum_idx`(`takarmanyId`, `datum`);
ALTER TABLE `takarmany_mozgasok` ADD INDEX `takarmany_mozgasok_halaszatId_datum_idx`(`halaszatId`, `datum`);

-- AddForeignKey
ALTER TABLE `takarmanyok` ADD CONSTRAINT `takarmanyok_halaszatId_fkey`
    FOREIGN KEY (`halaszatId`) REFERENCES `halaszatok`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `takarmany_mozgasok` ADD CONSTRAINT `takarmany_mozgasok_takarmanyId_fkey`
    FOREIGN KEY (`takarmanyId`) REFERENCES `takarmanyok`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `takarmany_mozgasok` ADD CONSTRAINT `takarmany_mozgasok_halaszatId_fkey`
    FOREIGN KEY (`halaszatId`) REFERENCES `halaszatok`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;
