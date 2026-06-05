import NaptarClient from "./NaptarClient";

export default async function NaptarPage(
    props: { params: Promise<{ hid: string }> }
) {
    const { hid } = await props.params;

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div className="glass card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                    <h1 className="h1">Naptár</h1>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Halászati események, határidők és napi jegyzetek.
                    </div>
                </div>
            </div>

            <NaptarClient hid={hid} />
        </div>
    );
}
