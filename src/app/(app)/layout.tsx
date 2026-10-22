import { cookies } from "next/headers";

import AppShell from "@/components/app/AppShell";

/**
 * Alkalmazás-layout: minden bejelentkezett oldal az `AppShell` kereten
 * (sidebar + topbar) keresztül renderelődik.
 *
 * Az auth-oldalak (`app/(auth)/**`) NEM ezen a layouton mennek át, ezért az
 * `AppShell` sosem kerül auth-route alá — a hookjai így mindig ugyanabban a
 * sorrendben futnak.
 *
 * Az oldalsáv nyitott/összecsukott állapotát a shadcn Sidebar a `sidebar_state`
 * sütiben tárolja; itt olvassuk vissza, hogy újratöltéskor ne „ugráljon”.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const sidebarAlapNyitva = cookieStore.get("sidebar_state")?.value !== "false";

    return <AppShell sidebarAlapNyitva={sidebarAlapNyitva}>{children}</AppShell>;
}
