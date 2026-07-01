import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
    test: {
        environment: "node",
        // SZÁNDÉKOSAN csak a unit tesztek — így az `npm run test` SOSEM nyúl
        // adatbázishoz (és így a production DB-hez sem). Az integrációs tesztek
        // külön configgal futnak: `vitest.integration.config.ts` (test:integration).
        include: ["tests/unit/**/*.test.ts"],
        coverage: {
            provider: "v8",
            include: ["src/lib/**"],
            reporter: ["text", "html"],
        },
    },
    resolve: {
        alias: {
            // A tsconfig "@/*" -> "./src/*" alias leképezése a tesztekhez.
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
});
