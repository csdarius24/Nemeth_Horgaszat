import TakarmanyokClient from "./ui/TakarmanyokClient";

export default async function TakarmanyokPage(props: { params: Promise<{ hid: string }> }) {
    const { hid } = await props.params;

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div className="glass card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h1 className="h1">Takarmányok</h1>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Takarmánykészlet nyilvántartás. Bevétel és felhasználás rögzítése, készlet követése.
                    </div>
                </div>
                <span className="badge">Takarmány modul</span>
            </div>

            <TakarmanyokClient hid={hid} />
        </div>
    );
}
