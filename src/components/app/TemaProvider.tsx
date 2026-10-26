"use client";

import { ThemeProvider } from "next-themes";

/**
 * Világos / sötét / rendszer téma. A választás a böngészőben tárolódik
 * (localStorage), a `dark` osztály a `<html>`-re kerül. A next-themes egy apró
 * inline szkripttel még az első festés előtt beállítja, így nincs fehér villanás.
 */
export function TemaProvider({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="fishapp:tema">
            {children}
        </ThemeProvider>
    );
}
