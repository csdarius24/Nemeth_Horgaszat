-- CreateTable
CREATE TABLE `hibabejelentesek` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `targy` VARCHAR(150) NOT NULL,
    `leiras` TEXT NOT NULL,
    `oldalUrl` VARCHAR(500) NULL,
    `statusz` ENUM('UJ', 'FOLYAMATBAN', 'MEGOLDVA', 'ELUTASITVA') NOT NULL DEFAULT 'UJ',
    `halaszatId` INTEGER NULL,
    `felhasznaloId` INTEGER NULL,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `frissitve` DATETIME(3) NOT NULL,

    INDEX `hibabejelentesek_halaszatId_idx`(`halaszatId`),
    INDEX `hibabejelentesek_felhasznaloId_idx`(`felhasznaloId`),
    INDEX `hibabejelentesek_statusz_idx`(`statusz`),
    INDEX `hibabejelentesek_letrehozva_idx`(`letrehozva`),
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `hibabejelentesek` ADD CONSTRAINT `hibabejelentesek_halaszatId_fkey` FOREIGN KEY (`halaszatId`) REFERENCES `halaszatok`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hibabejelentesek` ADD CONSTRAINT `hibabejelentesek_felhasznaloId_fkey` FOREIGN KEY (`felhasznaloId`) REFERENCES `felhasznalok`(`azonosito`) ON DELETE SET NULL ON UPDATE CASCADE;
