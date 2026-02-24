-- CreateTable
CREATE TABLE `felhasznalok` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `nev` VARCHAR(120) NULL,
    `jelszoHash` VARCHAR(255) NOT NULL,
    `aktiv` BOOLEAN NOT NULL DEFAULT true,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `frissitve` DATETIME(3) NOT NULL,

    UNIQUE INDEX `felhasznalok_email_key`(`email`),
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `felhasznaloId` INTEGER NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `lejar` DATETIME(3) NOT NULL,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sessions_tokenHash_key`(`tokenHash`),
    INDEX `sessions_felhasznaloId_idx`(`felhasznaloId`),
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `to_tagsag` (
    `azonosito` INTEGER NOT NULL AUTO_INCREMENT,
    `felhasznaloId` INTEGER NOT NULL,
    `toId` INTEGER NOT NULL,
    `szerepkor` ENUM('OWNER', 'ADMIN', 'STAFF', 'OR', 'ANGLER') NOT NULL DEFAULT 'ANGLER',
    `aktiv` BOOLEAN NOT NULL DEFAULT true,
    `letrehozva` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `to_tagsag_toId_idx`(`toId`),
    INDEX `to_tagsag_felhasznaloId_idx`(`felhasznaloId`),
    UNIQUE INDEX `to_tagsag_felhasznaloId_toId_key`(`felhasznaloId`, `toId`),
    PRIMARY KEY (`azonosito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_felhasznaloId_fkey` FOREIGN KEY (`felhasznaloId`) REFERENCES `felhasznalok`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `to_tagsag` ADD CONSTRAINT `to_tagsag_felhasznaloId_fkey` FOREIGN KEY (`felhasznaloId`) REFERENCES `felhasznalok`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `to_tagsag` ADD CONSTRAINT `to_tagsag_toId_fkey` FOREIGN KEY (`toId`) REFERENCES `toak`(`azonosito`) ON DELETE CASCADE ON UPDATE CASCADE;
