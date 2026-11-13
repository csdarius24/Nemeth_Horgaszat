-- Térkép: halászat helye (pont) és tóegység körvonala (GeoJSON Polygon).
-- Tisztán additív, minden oszlop nullable.
ALTER TABLE `halaszatok` ADD COLUMN `helyLat` DECIMAL(9, 6) NULL,
                         ADD COLUMN `helyLng` DECIMAL(9, 6) NULL;

ALTER TABLE `toak` ADD COLUMN `korvonal` JSON NULL,
                   ADD COLUMN `kozeppontLat` DECIMAL(9, 6) NULL,
                   ADD COLUMN `kozeppontLng` DECIMAL(9, 6) NULL,
                   ADD COLUMN `rajzoltTeruletM2` DECIMAL(12, 2) NULL;
