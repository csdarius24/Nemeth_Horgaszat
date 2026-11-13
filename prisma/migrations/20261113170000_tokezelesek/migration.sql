-- Tókezelések (trágya, mész, gyógyszer, antibiotikum, vitamin) + TOKEZELES naplótípus.
-- Az enum-bővítés csak új értéket ad hozzá (a meglévő naplósorok változatlanok); az új tábla additív.
-- AlterTable
ALTER TABLE `naplo_esemenyek` MODIFY `tipus` ENUM('TELEPITES', 'KIVETEL', 'ETETES', 'ATTELEPITES', 'TAKARMANY_BEVETEL', 'TAKARMANY_FELHASZNALAS', 'TAKARMANY_KORREKCIO', 'VIZMINOSEG_MERES', 'ELHULLAS', 'MADARKAR', 'TOKEZELES', 'HALKELTES', 'FELADAT', 'HIBABEJELENTES', 'RIASZTAS', 'EGYEB') NOT NULL;

-- CreateTable
CREATE TABLE `tokezelesek` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `halaszatId` INTEGER NOT NULL,
    `toId` INTEGER NOT NULL,
    `datum` DATETIME(3) NOT NULL,
    `tipus` ENUM('SZERVESTRAGYA', 'MESZEZES', 'KLORMESZ', 'GYOGYSZER', 'ANTIBIOTIKUM', 'VITAMIN', 'EGYEB') NOT NULL,
    `keszitmeny` VARCHAR(150) NULL,
    `hatoanyag` VARCHAR(150) NULL,
    `mennyiseg` DECIMAL(12, 3) NOT NULL,
    `egyseg` VARCHAR(10) NOT NULL,
    `koltsegFt` INTEGER NULL,
    `varakozasiIdoNap` INTEGER NULL,
    `kezelesOka` VARCHAR(300) NULL,
    `megjegyzes` TEXT NULL,
    `rogzitoFelhasznaloId` INTEGER NULL,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `frissitve` DATETIME(3) NOT NULL,

    INDEX `tokezelesek_halaszatId_datum_idx`(`halaszatId`, `datum`),
    INDEX `tokezelesek_toId_datum_idx`(`toId`, `datum`),
    INDEX `tokezelesek_toId_tipus_idx`(`toId`, `tipus`),
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tokezelesek` ADD CONSTRAINT `tokezelesek_halaszatId_fkey` FOREIGN KEY (`halaszatId`) REFERENCES `halaszatok`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tokezelesek` ADD CONSTRAINT `tokezelesek_toId_fkey` FOREIGN KEY (`toId`) REFERENCES `toak`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tokezelesek` ADD CONSTRAINT `tokezelesek_rogzitoFelhasznaloId_fkey` FOREIGN KEY (`rogzitoFelhasznaloId`) REFERENCES `felhasznalok`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;

