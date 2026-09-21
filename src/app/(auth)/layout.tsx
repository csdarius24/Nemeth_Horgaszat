/**
 * Auth-layout: a bejelentkezés/regisztráció oldalak keret (AppShell) NÉLKÜL
 * renderelődnek — nincs sidebar, nincs topbar, nincs `/api/auth/me` lekérés.
 *
 * Szándékosan átereszt (passthrough): a létezése az, ami garantálja, hogy az
 * auth-oldalak és az alkalmazás-oldalak külön layout-ágon futnak.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
