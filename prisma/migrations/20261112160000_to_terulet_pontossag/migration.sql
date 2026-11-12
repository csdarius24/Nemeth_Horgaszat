-- Terület pontosság: 2 → 4 tizedes hektár (1 m² felbontás), pl. 0,175 ha telelő.
-- Bővítés (6 egészjegy marad), meglévő adat nem vész el.
ALTER TABLE `toak` MODIFY `teruletHa` DECIMAL(10, 4) NULL;
