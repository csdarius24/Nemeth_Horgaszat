import "./globals.css";
import { Inter, Sora } from "next/font/google";
import AppShell from "@/components/app/AppShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const sora = Sora({ subsets: ["latin"], variable: "--font-display" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="hu" className={`${inter.variable} ${sora.variable}`}>
      <body>
      <AppShell>{children}</AppShell>
      </body>
      </html>
  );
}