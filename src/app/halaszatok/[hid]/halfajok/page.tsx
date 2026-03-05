import HalfajokClient from "./ui/HalfajokClient";

export default async function HalfajokPage(props: { params: Promise<{ hid: string }> }) {
    const { hid } = await props.params;

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div className="glass card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h1 className="h1">Halfajok</h1>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Tenant-specifikus halfaj lista. Admin/Owner tud bővíteni.
                    </div>
                </div>
                <span className="badge">Halfaj modul</span>
            </div>

            <HalfajokClient hid={hid} />
        </div>
    );
}