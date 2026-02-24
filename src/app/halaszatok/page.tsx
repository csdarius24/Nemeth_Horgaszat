import Link from "next/link";
import HalaszatListaClient from "./HalaszatListaClient";

export default function HalaszatokPage() {
    return (
        <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
            <header
                style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <h1>Halászatok</h1>
                <Link href="/halaszatok/uj">+ Új halászat</Link>
            </header>

            <p style={{ opacity: 0.8 }}>
                Itt látod azokat a halászatokat, amelyekhez hozzáférésed van.
            </p>

            <HalaszatListaClient />
        </main>
    );
}