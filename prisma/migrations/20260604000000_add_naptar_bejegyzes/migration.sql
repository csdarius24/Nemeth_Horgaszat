-- CreateTable
CREATE TABLE `naptar_bejegyzesek` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `halaszatId` INTEGER NOT NULL,
    `datum` DATE NOT NULL,
    `cim` VARCHAR(200) NOT NULL,
    `tartalom` TEXT NULL,
    `szin` VARCHAR(20) NULL,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `frissitve` DATETIME(3) NOT NULL,

    INDEX `naptar_bejegyzesek_halaszatId_datum_idx`(`halaszatId`, `datum`),
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `naptar_bejegyzesek` ADD CONSTRAINT `naptar_bejegyzesek_halaszatId_fkey`
    FOREIGN KEY (`halaszatId`) REFERENCES `halaszatok`(`azonosito`)
    ON DELETE CASCADE ON UPDATE CASCADE;
