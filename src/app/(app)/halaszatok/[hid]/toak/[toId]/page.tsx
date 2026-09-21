import ToDashboardClient from "./ui/ToDashboardClient";

export default async function ToDashboardPage(props: { params: Promise<{ hid: string; toId: string }> }) {
    const { hid, toId } = await props.params;

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div className="glass card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h1 className="h1">Tó dashboard</h1>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Összefoglaló, állomány és napló események.
                    </div>
                </div>
                <span className="badge">Tó modul</span>
            </div>

            <ToDashboardClient hid={hid} toId={toId} />
        </div>
    );
}