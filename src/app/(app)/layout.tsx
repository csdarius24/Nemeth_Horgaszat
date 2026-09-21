import AppShell from "@/components/app/AppShell";

/**
 * Alkalmazás-layout: minden bejelentkezett oldal az `AppShell` kereten
 * (sidebar + topbar) keresztül renderelődik.
 *
 * Az auth-oldalak (`app/(auth)/**`) NEM ezen a layouton mennek át, ezért az
 * `AppShell` sosem kerül auth-route alá — a hookjai így mindig ugyanabban a
 * sorrendben futnak.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
    return <AppShell>{children}</AppShell>;
}
