-- Egyedi haltömeg pontosság: 2 → 5 tizedes kg (0,01 g felbontás), hogy az ivadék
-- (pl. 5 g = 0,005 kg) ne kerekedjen 0,01 kg-ra / 0-ra. Bővítés, adat nem vész el.
ALTER TABLE `hal_allomany` MODIFY `minTomegKg` DECIMAL(10, 5) NOT NULL DEFAULT 0.00,
                          MODIFY `maxTomegKg` DECIMAL(10, 5) NOT NULL DEFAULT 0.00;
ALTER TABLE `telepitesek` MODIFY `minTomegKg` DECIMAL(10, 5) NOT NULL DEFAULT 0.00,
                          MODIFY `maxTomegKg` DECIMAL(10, 5) NOT NULL DEFAULT 0.00;
