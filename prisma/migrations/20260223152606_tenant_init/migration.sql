-- AlterTable
ALTER TABLE `toak` ADD COLUMN `halaszatId` INTEGER NULL,
    ADD COLUMN `tipus` ENUM('TO', 'TELELO') NOT NULL DEFAULT 'TO';

-- CreateTable
CREATE TABLE `halaszatok` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `nev` VARCHAR(160) NOT NULL,
    `slug` VARCHAR(190) NOT NULL,
    `aktiv` BOOLEAN NOT NULL DEFAULT true,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `frissitve` DATETIME(3) NOT NULL,

    UNIQUE INDEX `halaszatok_slug_key`(`slug`),
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `halaszat_tagsag` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `halaszatId` INTEGER NOT NULL,
    `felhasznaloId` INTEGER NOT NULL,
    `szerepkor` ENUM('OWNER', 'ADMIN', 'STAFF') NOT NULL DEFAULT 'STAFF',
    `aktiv` BOOLEAN NOT NULL DEFAULT true,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `halaszat_tagsag_felhasznaloId_idx`(`felhasznaloId`),
    INDEX `halaszat_tagsag_halaszatId_idx`(`halaszatId`),
    UNIQUE INDEX `halaszat_tagsag_halaszatId_felhasznaloId_key`(`halaszatId`, `felhasznaloId`),
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `toak_halaszatId_idx` ON `toak`(`halaszatId`);

-- AddForeignKey
ALTER TABLE `halaszat_tagsag` ADD CONSTRAINT `halaszat_tagsag_halaszatId_fkey` FOREIGN KEY (`halaszatId`) REFERENCES `halaszatok`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `halaszat_tagsag` ADD CONSTRAINT `halaszat_tagsag_felhasznaloId_fkey` FOREIGN KEY (`felhasznaloId`) REFERENCES `felhasznalok`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `toak` ADD CONSTRAINT `toak_halaszatId_fkey` FOREIGN KEY (`halaszatId`) REFERENCES `halaszatok`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;
