import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Fish App", template: "%s · Fish App" },
  description: "Halgazdálkodás, tavak, takarmányozás és halászati napló egy helyen.",
};

export const viewport: Viewport = {
  themeColor: "#0369a1",
  width: "device-width",
  initialScale: 1,
};

/**
 * Gyökér layout — SZÁNDÉKOSAN nem renderel alkalmazás-keretet (AppShell).
 *
 * Az oldalfát két route-group osztja ketté:
 *  - `app/(auth)/**`  → bejelentkezés/regisztráció, keret NÉLKÜL,
 *  - `app/(app)/**`   → a bejelentkezett alkalmazás, `AppShell` kerettel.
 *
 * Így az `AppShell` soha nem marad mountolva egy auth-route-on, és nem kell
 * feltételesen visszatérnie a hookjai előtt (React hook-sorrend szabály).
 *
 * Globális UI-szolgáltatások: tooltipek (`TooltipProvider`) és értesítések (`Toaster`).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={`${inter.variable} ${jakarta.variable}`}>
      <body>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
