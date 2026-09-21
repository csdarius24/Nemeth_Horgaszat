import "./globals.css";
import { Inter, Sora } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const sora = Sora({ subsets: ["latin"], variable: "--font-display" });

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
      <html lang="hu" className={`${inter.variable} ${sora.variable}`}>
      <body>{children}</body>
      </html>
  );
}
