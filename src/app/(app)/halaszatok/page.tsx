import Link from "next/link";
import HalaszatListaClient from "./HalaszatListaClient";
import GlassCard from "@/components/ui/GlassCard";

export default function HalaszatokPage() {
    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div className="glass card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                    <h1 className="h1">Halászatok</h1>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Itt látod azokat a halászatokat, amelyekhez hozzáférésed van.
                    </div>
                </div>

                <Link className="btn btn-primary" href="/halaszatok/uj">
                    + Új halászat
                </Link>
            </div>

            <HalaszatListaClient />
        </div>
    );
}