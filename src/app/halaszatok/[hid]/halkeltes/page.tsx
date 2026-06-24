export default async function HalkeltesPage(props: { params: Promise<{ hid: string }> }) {
    await props.params;

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div className="glass card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h1 className="h1">Halkeltetés</h1>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Halkeltetési nyilvántartás &#8212; hamarosan.
                    </div>
                </div>
                <span className="badge">Hamarosan</span>
            </div>

            <div className="glass card" style={{ textAlign: "center", padding: "64px 32px" }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>&#127041;</div>
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Ez a modul fejlesztés alatt áll</div>
                <div className="muted" style={{ maxWidth: 400, margin: "0 auto" }}>
                    A halkeltetési modul hamarosan elérhetővé válik. Ikráztatás, lárvanevelés és ivadéknevelés nyilvántartása.
                </div>
            </div>
        </div>
    );
}
