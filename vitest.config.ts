import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
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
