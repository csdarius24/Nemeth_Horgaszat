import "./globals.css";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-body",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"], 
  variable: "--font-display",
  display: "swap",
});

/**
 * Gyökér layout — SZÁNDÉKOSAN nem renderel alkalmazás-keretet (AppShell).
 *
 * Az oldalfát két route-group osztja ketté:
 *  - `app/(auth)/**`  → bejelentkezés/regisztráció, keret NÉLKÜL,
 *  - `app/(app)/**`   → a bejelentkezett alkalmazás, `AppShell` kerettel.
 *
 * Így az `AppShell` soha nem marad mountolva egy auth-route-on, és nem kell
 * feltételesen visszatérnie a hookjai előtt (React hook-sorrend szabály).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="hu" className={`${inter.variable} ${jakarta.variable}`}>
      <body>{children}</body>
      </html>
  );
}
