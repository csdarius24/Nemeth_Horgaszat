import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Külön config az integrációs (DB-backed) teszteknek.
// FONTOS: ezek a tesztek KIZÁRÓLAG a TEST_DATABASE_URL / DATABASE_URL_TEST
// kapcsolatot használják (lásd tests/integration/helpers/testDb.ts), és
// production-guarddal védettek. A DATABASE_URL-t (.env, production) SOSEM
// használják. Ha nincs teszt-DB beállítva, a tesztek biztonságosan kihagyásra
// kerülnek (skip), nem futnak production ellen.
export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/integration/**/*.test.ts"],
        // A DB-műveletek lassabbak lehetnek, mint a unit logika.
        testTimeout: 30000,
        hookTimeout: 30000,
        // ne fusson párhuzamosan több integrációs fájl ugyanazon a teszt-DB-n
        fileParallelism: false,
    },
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
});
